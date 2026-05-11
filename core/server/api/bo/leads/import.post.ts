

import {
  type SmartLeadUpdateSet,
  findSmartLeadByEmail,
  insertSmartLeadImport,
  updateSmartLeadFields,
} from '~/enterprise/base/smartlead/server/utils/smartlead'

interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    email?: string
    firstname?: string
    lastname?: string
    phone?: string
    company?: string
    siret?: string
    type?: string
    status?: string
    leadSource?: string
    note?: string
  }
  createMissing?: boolean
}

const ALLOWED_TYPES = new Set(['Prospect', 'Client', 'Partenaire', 'Fournisseur'])

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.email) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : email' })
  }

  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const emailRaw = pick(mapping.email)
    const email = emailRaw ? String(emailRaw).trim().toLowerCase() : ''
    if (!email) {
      stats.skipped++
      stats.errors.push({ row: i + 1, reason: 'email vide' })
      continue
    }

    const firstname = pick(mapping.firstname)
    const lastname = pick(mapping.lastname)
    const phone = pick(mapping.phone)
    const company = pick(mapping.company)
    const siret = pick(mapping.siret)
    const typeRaw = pick(mapping.type)
    const status = pick(mapping.status)
    const leadSource = pick(mapping.leadSource)
    const note = pick(mapping.note)

    let type: string | undefined
    if (typeRaw !== undefined) {
      const t = String(typeRaw).trim()
      type = ALLOWED_TYPES.has(t) ? t : 'Prospect'
    }

    try {
      const existing = await findSmartLeadByEmail(email, { event })

      if (existing) {
        const sets: SmartLeadUpdateSet[] = []
        if (firstname !== undefined) sets.push({ kind: 'value', column: 'firstname', value: String(firstname).trim().slice(0, 128) })
        if (lastname !== undefined) sets.push({ kind: 'value', column: 'lastname', value: String(lastname).trim().slice(0, 128) })
        if (phone !== undefined) sets.push({ kind: 'value', column: 'phone', value: String(phone).trim().slice(0, 32) })
        if (company !== undefined) sets.push({ kind: 'value', column: 'company_name', value: String(company).trim().slice(0, 255) })
        if (siret !== undefined) sets.push({ kind: 'value', column: 'siret', value: String(siret).trim().slice(0, 32) })
        if (type !== undefined) sets.push({ kind: 'value', column: 'type', value: type })
        if (status !== undefined) sets.push({ kind: 'value', column: 'status', value: String(status).trim().slice(0, 32) })
        if (leadSource !== undefined) sets.push({ kind: 'value', column: 'lead_source', value: String(leadSource).trim().slice(0, 32) })
        if (note !== undefined) sets.push({ kind: 'value', column: 'note', value: String(note) })
        if (sets.length) await updateSmartLeadFields(existing.idAcSmartlead, sets, { event })
        stats.updated++
      } else if (body.createMissing) {
        await insertSmartLeadImport({
          firstname: firstname ? String(firstname).trim().slice(0, 128) : '',
          lastname: lastname ? String(lastname).trim().slice(0, 128) : '',
          email,
          phone: phone ? String(phone).trim().slice(0, 32) : '',
          company: company ? String(company).trim().slice(0, 255) : '',
          siret: siret ? String(siret).trim().slice(0, 32) : '',
          type: type || 'Prospect',
          status: status ? String(status).trim().slice(0, 32) : 'new',
          leadSource: leadSource ? String(leadSource).trim().slice(0, 32) : 'import',
          note: note ? String(note) : '',
        }, { event })
        stats.created++
      } else {
        stats.skipped++
      }
    } catch (err: any) {
      stats.errors.push({ row: i + 1, reason: err.message || String(err) })
    }
  }

  return { success: true, stats }
})
