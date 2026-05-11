

import { useClientDb } from '~/server/utils/db'
import { resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { customerId, alias, company, firstname, lastname, address1, address2, postcode, city, countryId, phone, vatNumber } = body || {}
  const resolvedId = resolveCustomerIdForRequest(event, customerId)

  if (!resolvedId || !firstname || !lastname || !address1 || !city) {
    throw createError({ statusCode: 400, message: 'customerId, firstname, lastname, address1 et city requis' })
  }

  const db = useClientDb(event)
  const { insertId } = await db.run(
    `INSERT INTO ps_address
        (id_country, id_customer, alias, company, vat_number,
         firstname, lastname, address1, address2, postcode, city,
         phone, active, deleted, date_add, date_upd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
    [
      Number(countryId || 8),
      resolvedId,
      String(alias || 'Adresse'),
      String(company || ''),
      String(vatNumber || ''),
      String(firstname),
      String(lastname),
      String(address1),
      String(address2 || ''),
      String(postcode || ''),
      String(city),
      String(phone || ''),
    ],
  )

  return {
    id: Number(insertId),
    customerId: resolvedId,
    alias: String(alias || 'Adresse'),
    company: String(company || ''),
    firstname: String(firstname),
    lastname: String(lastname),
    address1: String(address1),
    address2: String(address2 || ''),
    postcode: String(postcode || ''),
    city: String(city),
    countryId: Number(countryId || 8),
    phone: String(phone || ''),
    vatNumber: String(vatNumber || ''),
  }
})
