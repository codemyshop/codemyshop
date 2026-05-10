/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'
import { createSmartProject } from '~/enterprise/base/smartproject/server/utils/smartproject'

/**
 * POST /api/bo/chatbot/[token]/create-project — converts the conversation
 * chatbot en item de pipeline (smartproject + smartlead).
 *
 * Body { email, siret?, project_title, needs? } — staff fills in /
 * completes from a hub modal. email is required (lead merge key).
 *
 * Logique :
 * - email required (unique merge key on cs_smartlead.email)
 * - existing lead → reuse, bump missing captured_* on the database side
 * - missing lead → INSERT with captured_* + form values
 * - smartproject always created (staff may want to launch a
 * second distinct opportunity on the same lead) — no project idempotency,
 * idempotency lives on the lead side (email).
 * - conv.id_smartlead anchored for tracking.
 */
export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token requis' })

  const body = await readBody(event).catch(() => ({})) as {
    email?:         string
    siret?:         string
    project_title?: string
    needs?:         string
  }
  const formEmail = String(body?.email || '').trim().toLowerCase()
  const formSiret = String(body?.siret || '').replace(/\D/g, '').slice(0, 14)
  const formTitle = String(body?.project_title || '').trim()
  const formNeeds = String(body?.needs || '').trim()

  if (!formEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Email valide requis' })
  }
  if (!formTitle) {
    throw createError({ statusCode: 400, statusMessage: 'Titre du projet requis' })
  }
  if (formSiret && formSiret.length !== 14) {
    throw createError({ statusCode: 400, statusMessage: 'SIRET doit faire 14 chiffres' })
  }

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, scenario_root, product_id_context, id_smartlead,
            captured_firstname, captured_lastname, captured_email,
            captured_phone, captured_company, captured_siret
       FROM cs_main.cs_chatbot_conversation
      WHERE conversation_token = ? LIMIT 1`,
    [token],
  )
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })

  const idConversation = Number(conv.id_conversation)
  const firstname = String(conv.captured_firstname || '').trim()
  const lastname  = String(conv.captured_lastname  || '').trim()
  const phone     = String(conv.captured_phone     || '').trim()
  const company   = String(conv.captured_company   || '').trim()
  const siret     = formSiret || String(conv.captured_siret || '').replace(/\D/g, '').slice(0, 14)
  const scenario  = String(conv.scenario_root || 'global')

  // ─── Smartlead : merge par email (clef unique) ──────────────────────
  let idSmartlead = 0
  const existing = await db.get<any>(
    `SELECT id_ac_smartlead, firstname, lastname, phone, company_name, siret
       FROM cs_main.cs_smartlead WHERE email = ? LIMIT 1`,
    [formEmail],
  )

  const noteFromChatbot = `Chatbot — tunnel "${scenario}".`
    + (siret ? ` SIRET ${siret}.` : '')
    + (conv.product_id_context ? ` Produit id=${conv.product_id_context}.` : '')
    + ` Conversation #${idConversation}.`

  if (existing?.id_ac_smartlead) {
    idSmartlead = Number(existing.id_ac_smartlead)
    // Bump champs vides côté DB avec ce qu'on a (chatbot + form), sans
    // jamais écraser une valeur existante.
    const sets: string[] = []
    const params: any[] = []
    const bumpIfEmpty = (col: string, dbVal: any, newVal: string) => {
      if (newVal && !String(dbVal || '').trim()) { sets.push(`${col} = ?`); params.push(newVal) }
    }
    bumpIfEmpty('firstname',    existing.firstname,    firstname)
    bumpIfEmpty('lastname',     existing.lastname,     lastname)
    bumpIfEmpty('phone',        existing.phone,        phone)
    bumpIfEmpty('company_name', existing.company_name, company)
    bumpIfEmpty('siret',        existing.siret,        siret)
    sets.push(`note = COALESCE(note,'') || E'\\n' || ?`)
    params.push(noteFromChatbot)
    sets.push(`date_upd = CURRENT_TIMESTAMP`)
    params.push(idSmartlead)
    await db.run(
      `UPDATE cs_main.cs_smartlead SET ${sets.join(', ')} WHERE id_ac_smartlead = ?`,
      params,
    )
  } else {
    const r = await db.get<any>(
      `INSERT INTO cs_main.cs_smartlead
         (firstname, lastname, email, phone, company_name, siret, type, status,
          lead_source, lead_intent, note, date_add, date_upd)
       VALUES (?, ?, ?, ?, ?, ?, 'Prospect', 'new', 'chatbot', ?, ?, NOW(), NOW())
       RETURNING id_ac_smartlead`,
      [
        firstname || '?', lastname || '', formEmail, phone || null,
        company || null, siret || null, `chatbot_${scenario}`, noteFromChatbot,
      ],
    )
    idSmartlead = Number(r?.id_ac_smartlead || 0)
  }
  if (!idSmartlead) {
    throw createError({ statusCode: 500, statusMessage: 'Échec création/lookup smartlead' })
  }

  // ─── needs : form si fourni, sinon récap auto ──────────────────────
  let needs = formNeeds
  if (!needs) {
    const productRows = await db.query<any>(
      `SELECT id_product, qty, freq, target_price
         FROM cs_main.cs_chatbot_conversation_product
        WHERE id_conversation = ? ORDER BY id_link ASC`,
      [idConversation],
    ) as any[]
    const productLines = productRows.map((p) => {
      const parts = [`Produit #${p.id_product}`]
      if (p.qty)          parts.push(`qté ${p.qty}`)
      if (p.freq)         parts.push(`fréquence ${p.freq}`)
      if (p.target_price) parts.push(`prix cible ${p.target_price}`)
      return '• ' + parts.join(' · ')
    })
    const answers = await db.query<any>(
      `SELECT al.recap_label, al.answer
         FROM cs_main.cs_chatbot_answer a
         JOIN cs_main.cs_chatbot_answer_lang al
           ON al.id_answer = a.id_answer AND al.id_lang = 1
        WHERE a.id_conversation = ? ORDER BY a.id_answer ASC`,
      [idConversation],
    ) as any[]
    const answerLines = answers
      .filter((a) => a.recap_label && a.answer)
      .map((a) => `• ${a.recap_label} : ${a.answer}`)
    needs = [
      productLines.length > 0 ? `🛒 Produits négociés (${productLines.length}) :\n${productLines.join('\n')}` : '',
      answerLines.length > 0  ? `\n📋 Qualif :\n${answerLines.join('\n')}` : '',
    ].filter(Boolean).join('\n')
  }
  needs = `${needs}\n\n👤 Créé depuis chatbot par ${session.firstname || `employé #${session.employeeId}`} (conv #${idConversation}).`

  const idSmartproject = await createSmartProject({
    id_ac_smartlead:   idSmartlead,
    project_title:     formTitle,
    project_type:      scenario,
    project_intention: scenario,
    project_status:    'lead_entrant',
    budget:            null,
    needs,
  }, { event })

  // Ancrage côté conversation
  if (Number(conv.id_smartlead || 0) !== idSmartlead) {
    await db.run(
      `UPDATE cs_main.cs_chatbot_conversation
          SET id_smartlead = ?, date_upd = NOW()
        WHERE id_conversation = ?`,
      [idSmartlead, idConversation],
    )
  }

  return {
    ok: true,
    idSmartproject,
    idSmartlead,
    reusedLead: Boolean(existing?.id_ac_smartlead),
  }
})
