/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/chatbot/[token] — conversation details for the right panel
 * from the hub console: conversation + chronological messages + answers
 * structured (business summary) + negotiated products + owner employee.
 */
export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'token requis' })
  }

  const db = useClientDb(event)
  const conv = await db.get<any>(
    `SELECT id_conversation, conversation_token, source, scenario_root,
            current_node_key, product_id_context, ip_address, user_agent,
            captured_firstname, captured_lastname, captured_email,
            captured_phone, captured_company, captured_siret,
            status, human_takeover, id_employee, human_takeover_at,
            unread_for_admin, last_message_at, id_smartlead,
            date_add, date_upd
       FROM cs_main.cs_chatbot_conversation
      WHERE conversation_token = ? LIMIT 1`,
    [token],
  )
  if (!conv) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation introuvable' })
  }
  const idConversation = Number(conv.id_conversation)

  const messages = await db.query<any>(
    `SELECT id_message, role, content, type, options_json, date_add
       FROM cs_main.cs_chatbot_message
      WHERE id_conversation = ? ORDER BY id_message ASC`,
    [idConversation],
  ) as any[]

  const answers = await db.query<any>(
    `SELECT a.id_answer, a.node_key, a.date_add,
            al.question, al.recap_label, al.answer
       FROM cs_main.cs_chatbot_answer a
       LEFT JOIN cs_main.cs_chatbot_answer_lang al
         ON al.id_answer = a.id_answer AND al.id_lang = 1
      WHERE a.id_conversation = ? ORDER BY a.id_answer ASC`,
    [idConversation],
  ) as any[]

  const products = await db.query<any>(
    `SELECT cp.id_link, cp.id_product, cp.qty, cp.freq, cp.target_price,
            pl.name AS product_name
       FROM cs_main.cs_chatbot_conversation_product cp
       LEFT JOIN cs_main.ps_product_lang pl
         ON pl.id_product = cp.id_product AND pl.id_lang = 1
      WHERE cp.id_conversation = ? ORDER BY cp.id_link ASC`,
    [idConversation],
  ) as any[]

  // Item pipeline déjà associé (cas où la conv a déjà été convertie ou
  // finalisée par le FSM). Sert à afficher "→ Item pipeline #X" plutôt
  // que "+ Créer" côté hub.
  let linkedProject: any = null
  if (conv.id_smartlead) {
    const proj = await db.get<any>(
      `SELECT id_ac_smartproject, project_title, project_status
         FROM cs_main.cs_smartproject
        WHERE id_ac_smartlead = ? AND COALESCE(is_archived, 0) = 0
     ORDER BY date_add DESC LIMIT 1`,
      [Number(conv.id_smartlead)],
    )
    if (proj) linkedProject = {
      idSmartproject: Number(proj.id_ac_smartproject),
      title:          proj.project_title || '',
      status:         proj.project_status || '',
    }
  }

  let employee: any = null
  if (conv.id_employee) {
    const emp = await db.get<any>(
      `SELECT id_employee, firstname, lastname, email
         FROM cs_main.ps_employee WHERE id_employee = ? LIMIT 1`,
      [Number(conv.id_employee)],
    )
    if (emp) employee = {
      idEmployee: Number(emp.id_employee),
      firstname:  emp.firstname,
      lastname:   emp.lastname,
      email:      emp.email,
    }
  }

  let productContext: any = null
  if (conv.product_id_context) {
    const p = await db.get<any>(
      `SELECT p.id_product, pl.name, pl.link_rewrite
         FROM cs_main.ps_product p
         LEFT JOIN cs_main.ps_product_lang pl
           ON pl.id_product = p.id_product AND pl.id_lang = 1
        WHERE p.id_product = ? LIMIT 1`,
      [Number(conv.product_id_context)],
    )
    if (p) productContext = {
      idProduct:   Number(p.id_product),
      name:        p.name || '',
      linkRewrite: p.link_rewrite || '',
    }
  }

  return {
    ok: true,
    conversation: {
      idConversation,
      token:             String(conv.conversation_token),
      source:            String(conv.source || 'global'),
      scenario:          String(conv.scenario_root || 'global'),
      currentNodeKey:    conv.current_node_key || null,
      status:            String(conv.status),
      humanTakeover:     Boolean(conv.human_takeover),
      humanTakeoverAt:   conv.human_takeover_at,
      unreadForAdmin:    Boolean(conv.unread_for_admin),
      capturedFirstname: conv.captured_firstname || '',
      capturedLastname:  conv.captured_lastname || '',
      capturedEmail:     conv.captured_email || '',
      capturedPhone:     conv.captured_phone || '',
      capturedCompany:   conv.captured_company || '',
      capturedSiret:     conv.captured_siret || '',
      idSmartlead:       conv.id_smartlead ? Number(conv.id_smartlead) : null,
      ipAddress:         conv.ip_address || '',
      userAgent:         conv.user_agent || '',
      lastMessageAt:     conv.last_message_at,
      dateAdd:           conv.date_add,
      dateUpd:           conv.date_upd,
    },
    employee,
    linkedProject,
    productContext,
    messages: messages.map((m) => ({
      idMessage: Number(m.id_message),
      role:      String(m.role),
      content:   String(m.content || ''),
      type:      String(m.type || 'text'),
      options:   m.options_json ? safeJson(m.options_json) : null,
      dateAdd:   m.date_add,
    })),
    answers: answers.map((a) => ({
      idAnswer:   Number(a.id_answer),
      nodeKey:    String(a.node_key),
      question:   a.question || '',
      recapLabel: a.recap_label || '',
      answer:     a.answer || '',
      dateAdd:    a.date_add,
    })),
    products: products.map((p) => ({
      idLink:      Number(p.id_link),
      idProduct:   Number(p.id_product),
      productName: p.product_name || '',
      qty:         p.qty || '',
      freq:        p.freq || '',
      targetPrice: p.target_price || '',
    })),
  }
})

function safeJson(s: any): any {
  try { return JSON.parse(String(s)) } catch { return null }
}
