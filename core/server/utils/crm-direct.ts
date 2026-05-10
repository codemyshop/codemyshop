/**
 *
 * CRM helpers — direct Drizzle on cs_smartlead + cs_smartproject tables.
 * Headless modules TypeScript implementation (variant C-hard). Replaces
 * legacy CRM API calls on the Nuxt side.
 *
 * The legacy CRM module remains active (PrestaShop admin uses it for
 * CRM administration) — only the public Nuxt → DB direct path becomes authoritative.
 *
 * Task #44: migration from MariaDB to PostgreSQL (cs_main), facade
 * 100% PostgreSQL via `usePocPg()`. The `clientId` parameter is preserved in the signature
 * for consumer compatibility — the runtime now always routes to
 * ac_postgres / cs_main.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

interface DbContext {
  event?: any
  clientId?: string
}

function db(_ctx: DbContext = {}) {
  return usePocPg()
}

export interface CrmLeadInput {
  email: string
  firstname?: string
  lastname?: string
  phone?: string
  companyName?: string
  profession?: string
  annualRevenue?: string
  referenceClient?: string
  projectType?: string         // 'devis' | 'contact' | …
  projectIntention?: string
  itemsJson?: string
  message?: string
  articleTitle?: string
  articleUrl?: string
  leadSource?: string
  projectTitleOverride?: string
}

export interface CrmCreateResult {
  success: boolean
  leadId: number
  projectId: number
  error?: string
}

/**
 * Idempotent creation/update of a lead + associated new project.
 * Faithfully reproduces the legacy CRM API pipeline.
 *
 * If email exists: UPDATE provided fields + append note
 *   `<date> — Blog: <article>\n<message>` ou `Devis: <message>`.
 * Otherwise: INSERT full lead (type='Prospect', default status, default level).
 *
 * Always: INSERT cs_smartproject with project_status='lead_entrant'.
 */
export async function crmCreateLeadProject(
  input: CrmLeadInput,
  ctx: DbContext = {},
): Promise<CrmCreateResult> {
  const email = (input.email || '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, leadId: 0, projectId: 0, error: 'Email invalide' }
  }

  const firstname = (input.firstname || '').trim()
  const lastname = (input.lastname || '').trim()
  const phone = (input.phone || '').trim()
  const companyName = (input.companyName || '').trim()
  const profession = (input.profession || '').trim()
  const annualRevenue = (input.annualRevenue || '').trim()
  const referenceClient = (input.referenceClient || '').trim()
  const projectType = (input.projectType || '').trim()
  const projectIntention = (input.projectIntention || '').trim()
  const itemsJson = (input.itemsJson || '').trim()
  const message = (input.message || '').trim()
  const articleTitle = (input.articleTitle || '').trim()
  const articleUrl = (input.articleUrl || '').trim()
  const leadSource = (input.leadSource || (projectType === 'devis' ? 'demande_devis' : 'blog_article')).trim()

  const d = db(ctx)

  // ── Lead : UPSERT par email ────────────────────────────────────────
  const existing = ((await d.execute<any>(sql`
    SELECT id_ac_smartlead AS "idAcSmartlead", note
      FROM cs_main.cs_smartlead
     WHERE email = ${email}
     LIMIT 1
  `)) as any) as Array<{ idAcSmartlead: number; note: string | null }>

  let leadId = 0
  const stamp = new Date().toLocaleString('fr-FR', { hour12: false }).replace(',', '')
  const appendNote = articleTitle
    ? `${stamp} — Blog: ${articleTitle}\n${message}`
    : message
      ? `${stamp} — Devis: ${message}`
      : ''

  if (existing.length > 0) {
    leadId = Number(existing[0].idAcSmartlead)
    const currentNote = existing[0].note ?? ''
    const newNote = appendNote
      ? (currentNote ? `${currentNote}\n---\n${appendNote}` : appendNote)
      : currentNote

    // UPDATE conditionnel — on ne touche que les champs fournis (pattern PHP).
    const sets: any[] = [sql`date_upd = CURRENT_TIMESTAMP`]
    if (firstname)    sets.push(sql`firstname = ${firstname}`)
    if (lastname)     sets.push(sql`lastname = ${lastname}`)
    if (phone)        sets.push(sql`phone = ${phone}`)
    if (companyName)  sets.push(sql`company_name = ${companyName}`)
    if (profession)   sets.push(sql`profession = ${profession}`)
    if (annualRevenue) sets.push(sql`annual_revenue = ${annualRevenue}`)
    if (leadSource)   sets.push(sql`lead_source = ${leadSource}`)
    if (appendNote)   sets.push(sql`note = ${newNote}`)

    await d.execute(sql`
      UPDATE cs_main.cs_smartlead
         SET ${sql.join(sets, sql`, `)}
       WHERE id_ac_smartlead = ${leadId}
    `)
  } else {
    // ── INSERT lead ──────────────────────────────────────────────────
    const defaultStatus = await getCrmDefault(d, 'AC_SMARTLEAD_DEFAULT_STATUS', 'en_attente')
    const defaultLevel = Number(await getCrmDefault(d, 'AC_SMARTLEAD_DEFAULT_LEVEL', '5'))

    const note = appendNote
    const fname = firstname || email.split('@')[0]

    const ins = ((await d.execute<any>(sql`
      INSERT INTO cs_main.cs_smartlead
        (id_owner, email, firstname, lastname, phone, company_name, profession,
         annual_revenue, type, status, level, lead_source, lead_intent, note,
         date_add, date_upd)
      VALUES
        (1, ${email}, ${fname}, ${lastname}, ${phone}, ${companyName}, ${profession},
         ${annualRevenue}, 'Prospect', ${defaultStatus}, ${defaultLevel}, ${leadSource},
         ${projectIntention || 'achat_grossiste'}, ${note},
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id_ac_smartlead AS "idAcSmartlead"
    `)) as any) as Array<{ idAcSmartlead: number | string }>
    leadId = Number(ins[0]?.idAcSmartlead || 0)
    if (leadId <= 0) {
      return { success: false, leadId: 0, projectId: 0, error: 'INSERT cs_smartlead KO' }
    }
  }

  // ── Project ────────────────────────────────────────────────────────
  const projectTitleOverride = (input.projectTitleOverride || '').trim()
  let projectTitle: string
  if (projectTitleOverride) {
    projectTitle = projectTitleOverride
  } else if (projectType === 'devis' && companyName) {
    let itemsCount = 0
    if (itemsJson) {
      try { const dec = JSON.parse(itemsJson); if (Array.isArray(dec)) itemsCount = dec.length } catch { /* noop */ }
    }
    projectTitle = `Devis ${companyName} — ${itemsCount} produit${itemsCount > 1 ? 's' : ''}`
  } else if (articleTitle) {
    projectTitle = `Blog — ${articleTitle.slice(0, 100)}`
  } else {
    projectTitle = `Contact — ${new Date().toLocaleDateString('fr-FR')}`
  }

  let projectNeeds: string
  if (itemsJson) {
    if (message) {
      let dec: any = []
      try { dec = JSON.parse(itemsJson); if (!Array.isArray(dec)) dec = [] } catch { dec = [] }
      projectNeeds = JSON.stringify({ items: dec, message })
    } else {
      projectNeeds = itemsJson
    }
  } else {
    projectNeeds = message || `Prise de contact via article : ${articleUrl}`
  }

  const insProj = ((await d.execute<any>(sql`
    INSERT INTO cs_main.cs_smartproject
      (id_owner, id_ac_smartlead, project_title, project_type, project_intention,
       project_status, reference_client, needs, date_add, date_upd)
    VALUES
      (1, ${leadId}, ${projectTitle}, ${projectType || 'contact'}, ${projectIntention},
       'lead_entrant', ${referenceClient}, ${projectNeeds},
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id_ac_smartproject AS "idAcSmartproject"
  `)) as any) as Array<{ idAcSmartproject: number | string }>
  const projectId = Number(insProj[0]?.idAcSmartproject || 0)
  if (projectId <= 0) {
    return { success: false, leadId, projectId: 0, error: 'INSERT cs_smartproject KO' }
  }

  return { success: true, leadId, projectId }
}

async function getCrmDefault(d: any, key: string, fallback: string): Promise<string> {
  try {
    const r = ((await d.execute(sql`
      SELECT value FROM cs_main.ps_configuration WHERE name = ${key} LIMIT 1
    `)) as any) as Array<{ value: string }>
    return r[0]?.value || fallback
  } catch {
    return fallback
  }
}
