

import { insertReferral } from '~/enterprise/base/referral/server/utils/referral'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, phone, activity, network } = body ?? {}

  if (!name?.trim() || !email?.trim() || !activity?.trim()) {
    throw createError({ statusCode: 400, message: 'Champs requis : name, email, activity' })
  }

  const { randomUUID } = await import('node:crypto')

  await insertReferral({
    refUuid: randomUUID(),
    type: 'ambassador_application',
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone || '').trim() || null,
    activity: String(activity).trim(),
    network: String(network || '').trim() || null,
  }, { event })

  return { success: true, message: 'Candidature enregistrée. Nous vous recontactons sous 48h.' }
})
