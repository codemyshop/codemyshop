

import { createReferral } from '~/server/utils/referrals'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    referrerId:   string
    referrerName: string
    companyName:  string
    contactEmail: string
    message?:     string
  }>(event)

  if (!body.companyName?.trim() || !body.contactEmail?.trim()) {
    throw createError({ statusCode: 400, message: 'companyName et contactEmail requis' })
  }

  const referral = await createReferral({
    referrerId:   body.referrerId,
    referrerName: body.referrerName,
    companyName:  body.companyName,
    contactEmail: body.contactEmail,
    message:      body.message,
  }, event)

  
  console.log(`\n=== NOUVEAU LEAD HIGH-TICKET (REFERRAL) ===`)
  console.log(`De la part de : ${referral.referrerName} (${referral.referrerId})`)
  console.log(`Prospect      : ${referral.companyName}`)
  console.log(`Email         : ${referral.contactEmail}`)
  console.log(`Message       : ${referral.message || '(aucun)'}`)
  console.log(`============================================\n`)

  
  console.log(`[EMAIL STUB] To: ${referral.contactEmail}`)
  console.log(`[EMAIL STUB] Subject: ${referral.referrerName} vous recommande CodeMyShop`)
  console.log(`[EMAIL STUB] Body: De la part de la direction de ${referral.referrerName}, nous avons le plaisir de vous inviter...`)

  return { ok: true, referral }
})
