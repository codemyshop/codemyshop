/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/customers/import — bulk UPSERT of customers (ps_customer).
 *
 * Body : { rows, mapping, createMissing? }
 * Match key: email (implicit unique index in PS).
 *
 * Security rule: only modify ps_customer (deleted=0). No
 * groups, no addresses, no orders — the import remains a
 * directory operation, not an account re-initialization.
 *
 * createMissing: creates an account with temporary password (the customer will have to
 * reset it), id_default_group=3, id_lang=1, id_gender=0 (unchanged from
 * endpoint /create.post.ts existant).
 */
interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    email?: string
    firstname?: string
    lastname?: string
    company?: string
    siret?: string
    website?: string
    active?: string
    newsletter?: string
    optin?: string
  }
  createMissing?: boolean
}

function toBool(v: any): 0 | 1 | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'oui', 'yes', 'y', 'actif', 'active'].includes(s)) return 1
  if (['0', 'false', 'non', 'no', 'n', 'inactif', 'inactive'].includes(s)) return 0
  return undefined
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.email) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : email' })
  }

  const db = useClientDb(event)
  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  let bcryptMod: any = null
  const ensureBcrypt = async () => {
    if (!bcryptMod) bcryptMod = await import('bcryptjs')
    return bcryptMod
  }

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const emailRaw = pick(mapping.email)
    const email = emailRaw ? String(emailRaw).trim().toLowerCase() : ''
    if (!email || !email.includes('@')) {
      stats.skipped++
      stats.errors.push({ row: i + 1, reason: 'email invalide' })
      continue
    }

    const firstname = pick(mapping.firstname)
    const lastname = pick(mapping.lastname)
    const company = pick(mapping.company)
    const siret = pick(mapping.siret)
    const website = pick(mapping.website)
    const active = toBool(pick(mapping.active))
    const newsletter = toBool(pick(mapping.newsletter))
    const optin = toBool(pick(mapping.optin))

    try {
      const existing = await db.get<any>(
        `SELECT id_customer FROM ps_customer WHERE email = ? AND deleted = 0 LIMIT 1`,
        [email],
      )

      if (existing?.id_customer) {
        const id = Number(existing.id_customer)
        const f: string[] = []
        const p: any[] = []
        if (firstname !== undefined) { f.push('firstname = ?'); p.push(String(firstname).trim().slice(0, 255)) }
        if (lastname !== undefined) { f.push('lastname = ?'); p.push(String(lastname).trim().slice(0, 255)) }
        if (company !== undefined) { f.push('company = ?'); p.push(String(company).trim().slice(0, 255)) }
        if (siret !== undefined) { f.push('siret = ?'); p.push(String(siret).trim().slice(0, 14)) }
        if (website !== undefined) { f.push('website = ?'); p.push(String(website).trim().slice(0, 128)) }
        if (active !== undefined) { f.push('active = ?'); p.push(active) }
        if (newsletter !== undefined) { f.push('newsletter = ?'); p.push(newsletter) }
        if (optin !== undefined) { f.push('optin = ?'); p.push(optin) }
        if (f.length) {
          f.push('date_upd = NOW()')
          await db.run(`UPDATE ps_customer SET ${f.join(', ')} WHERE id_customer = ?`, [...p, id])
        }
        stats.updated++
      } else if (body.createMissing) {
        const fn = firstname ? String(firstname).trim().slice(0, 255) : ''
        const ln = lastname ? String(lastname).trim().slice(0, 255) : ''
        if (!fn || !ln) {
          stats.skipped++
          stats.errors.push({ row: i + 1, reason: 'prénom + nom requis pour créer' })
          continue
        }
        const bcrypt = await ensureBcrypt()
        const passwd = bcrypt.hashSync('TempPass2026!', 12).replace('$2a$', '$2y$')
        await db.run(
          `INSERT INTO ps_customer
            (id_shop, id_shop_group, id_gender, id_default_group, id_lang, id_risk,
             firstname, lastname, email, passwd, company, siret, website,
             active, deleted, newsletter, optin,
             date_add, date_upd, max_payment_days, outstanding_allow_amount)
           VALUES
            (1, 1, 0, 3, 1, 0,
             ?, ?, ?, ?, ?, ?, ?,
             ?, 0, ?, ?,
             NOW(), NOW(), 0, 0)`,
          [
            fn, ln, email, passwd,
            company ? String(company).trim().slice(0, 255) : '',
            siret ? String(siret).trim().slice(0, 14) : '',
            website ? String(website).trim().slice(0, 128) : '',
            active ?? 1,
            newsletter ?? 0,
            optin ?? 0,
          ],
        )
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
