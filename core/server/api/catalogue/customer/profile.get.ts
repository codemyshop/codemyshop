/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/customer/profile?customerId=...
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { useClientDb } from '~/server/utils/db'
import { resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const { customerId } = getQuery(event) as Record<string, string>
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const db = useClientDb(event)
  const row = await db.get<any>(
    `SELECT id_customer, id_gender, firstname, lastname, email, company, siret, ape,
            birthday, newsletter, optin, website, note, active, id_default_group
       FROM ps_customer
      WHERE id_customer = ? AND deleted = 0
      LIMIT 1`,
    [resolvedId],
  )
  if (!row) throw createError({ statusCode: 404, message: 'Client introuvable' })

  return {
    id: Number(row.id_customer),
    firstname: String(row.firstname || ''),
    lastname: String(row.lastname || ''),
    email: String(row.email || ''),
    company: String(row.company || ''),
    siret: String(row.siret || ''),
    ape: String(row.ape || ''),
    birthday: row.birthday ? String(row.birthday) : null,
    newsletter: Number(row.newsletter) === 1,
    optin: Number(row.optin) === 1,
    website: String(row.website || ''),
    active: Number(row.active) === 1,
    defaultGroupId: Number(row.id_default_group || 0),
    genderId: Number(row.id_gender || 0),
  }
})
