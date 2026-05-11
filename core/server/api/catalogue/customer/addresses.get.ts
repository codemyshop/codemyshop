

import { useClientDb } from '~/server/utils/db'
import { resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const { customerId } = getQuery(event) as Record<string, string>
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const db = useClientDb(event)
  const rows = await db.query<any>(
    `SELECT id_address, id_customer, id_country, id_state, alias, company, vat_number,
            firstname, lastname, address1, address2, postcode, city, phone, phone_mobile,
            other, dni, date_add, date_upd
       FROM ps_address
      WHERE id_customer = ? AND deleted = 0 AND active = 1
      ORDER BY id_address DESC`,
    [resolvedId],
  )

  return rows.map((r: any) => ({
    id: Number(r.id_address),
    customerId: Number(r.id_customer),
    alias: String(r.alias || ''),
    company: String(r.company || ''),
    vatNumber: String(r.vat_number || ''),
    firstname: String(r.firstname || ''),
    lastname: String(r.lastname || ''),
    address1: String(r.address1 || ''),
    address2: String(r.address2 || ''),
    postcode: String(r.postcode || ''),
    city: String(r.city || ''),
    countryId: Number(r.id_country),
    stateId: Number(r.id_state || 0),
    phone: String(r.phone || ''),
    phoneMobile: String(r.phone_mobile || ''),
    other: String(r.other || ''),
    dni: String(r.dni || ''),
  }))
})
