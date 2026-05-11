

import { useClientDb } from '~/server/utils/db'
import { resolveCustomerIdForRequest } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, any>>(event)
  const { customerId, firstname, lastname, company, siret, email, newsletter } = body || {}
  const resolvedId = resolveCustomerIdForRequest(event, customerId)
  if (!resolvedId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const sets: string[] = []
  const params: any[] = []
  const add = (col: string, val: any) => {
    if (val === undefined) return
    sets.push(`${col} = ?`)
    params.push(val)
  }
  add('firstname', firstname)
  add('lastname', lastname)
  add('company', company)
  add('siret', siret)
  add('email', email)
  add('newsletter', newsletter != null ? (newsletter ? 1 : 0) : undefined)
  if (!sets.length) throw createError({ statusCode: 400, message: 'aucun champ modifiable' })

  sets.push('date_upd = NOW()')
  params.push(resolvedId)

  const db = useClientDb(event)
  await db.run(
    `UPDATE ps_customer SET ${sets.join(', ')} WHERE id_customer = ? AND deleted = 0`,
    params,
  )

  const updated = await db.get<any>(
    `SELECT id_customer, firstname, lastname, email, company, siret, newsletter
       FROM ps_customer WHERE id_customer = ? LIMIT 1`,
    [resolvedId],
  )
  if (!updated) throw createError({ statusCode: 404, message: 'Client introuvable' })

  return {
    id: Number(updated.id_customer),
    firstname: String(updated.firstname || ''),
    lastname: String(updated.lastname || ''),
    email: String(updated.email || ''),
    company: String(updated.company || ''),
    siret: String(updated.siret || ''),
    newsletter: Number(updated.newsletter) === 1,
  }
})
