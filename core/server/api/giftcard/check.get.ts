

import { resolveClientId } from '~/server/utils/db'
import { isFeatureEnabled } from '~/server/utils/feature-flags'
import { getGiftcardByCode } from '~/server/utils/giftcard'

export default defineEventHandler(async (event) => {
  const clientId = resolveClientId(event)
  const enabled = await isFeatureEnabled(clientId, 'ac_giftcard')
  if (!enabled) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const { code } = getQuery(event)
  if (!code) throw createError({ statusCode: 400, statusMessage: 'code requis' })

  const r = await getGiftcardByCode(clientId, String(code))
  if (!r.giftcard || r.state !== 'valid') {
    return { ok: false, state: r.state }
  }
  return {
    ok: true,
    state: r.state,
    amount_cents: r.giftcard.amount_cents,
    balance_cents: r.giftcard.balance_cents,
    currency: r.giftcard.currency,
    expires_at: r.giftcard.expires_at,
  }
})
