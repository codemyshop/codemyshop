

import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const email = String(q.email ?? '').trim()
  if (!email) return { status: 'invalid_input' as const }
  const r = await verifyEmailViaSmtp(email)
  return { status: r.status, mxHost: r.mxHost ?? null }
})
