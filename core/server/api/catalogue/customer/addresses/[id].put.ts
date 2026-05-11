

import { useClientDb } from '~/server/utils/db'

const ALLOWED = new Set([
  'alias', 'company', 'vat_number', 'vatNumber',
  'firstname', 'lastname', 'address1', 'address2',
  'postcode', 'city', 'id_country', 'countryId',
  'phone', 'phone_mobile', 'phoneMobile',
  'other', 'dni', 'active',
])

const CAMEL_TO_SNAKE: Record<string, string> = {
  vatNumber: 'vat_number',
  countryId: 'id_country',
  phoneMobile: 'phone_mobile',
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const body = await readBody<Record<string, any>>(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'body vide' })
  }

  const sets: string[] = []
  const params: any[] = []
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED.has(k)) continue
    const col = CAMEL_TO_SNAKE[k] ?? k
    sets.push(`${col} = ?`)
    params.push(v)
  }
  if (!sets.length) throw createError({ statusCode: 400, message: 'aucun champ modifiable' })

  sets.push('date_upd = NOW()')
  params.push(id)

  const db = useClientDb(event)
  await db.run(
    `UPDATE ps_address SET ${sets.join(', ')} WHERE id_address = ? AND deleted = 0`,
    params,
  )

  const updated = await db.get<any>(
    `SELECT id_address, id_customer, id_country, alias, company, vat_number,
            firstname, lastname, address1, address2, postcode, city, phone, phone_mobile
       FROM ps_address WHERE id_address = ? LIMIT 1`,
    [id],
  )
  if (!updated) throw createError({ statusCode: 404, message: 'Adresse introuvable' })

  return {
    id: Number(updated.id_address),
    customerId: Number(updated.id_customer),
    alias: String(updated.alias || ''),
    company: String(updated.company || ''),
    vatNumber: String(updated.vat_number || ''),
    firstname: String(updated.firstname || ''),
    lastname: String(updated.lastname || ''),
    address1: String(updated.address1 || ''),
    address2: String(updated.address2 || ''),
    postcode: String(updated.postcode || ''),
    city: String(updated.city || ''),
    countryId: Number(updated.id_country || 0),
    phone: String(updated.phone || ''),
    phoneMobile: String(updated.phone_mobile || ''),
  }
})
