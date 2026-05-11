

import { createSmartLead } from '~/enterprise/base/smartlead/server/utils/smartlead'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ firstname: string; lastname: string; email: string; phone?: string; company?: string; type?: string; note?: string }>(event)
  if (!body.email?.trim()) throw createError({ statusCode: 400, message: 'Email requis' })

  const id = await createSmartLead({
    firstname: body.firstname?.trim() || '',
    lastname: body.lastname?.trim() || '',
    email: body.email.trim().toLowerCase(),
    phone: body.phone?.trim() || '',
    company: body.company?.trim() || '',
    type: body.type || 'Prospect',
    note: body.note?.trim() || '',
  }, { event })

  return { success: true, id }
})
