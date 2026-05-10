/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/newsletter/unsubscribe?token=… — Public one-click unsubscription
 * (Article 7.3 GDPR: consent withdrawal must be as simple as
 * its collection). Link to include in every email sent.
 */

import { unsubscribeByToken } from '~/server/utils/newsletter-subscriber'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  const t = String(token ?? '').trim()
  if (!t) {
    throw createError({ statusCode: 400, statusMessage: 'token requis' })
  }
  const r = await unsubscribeByToken(t)
  return { ok: r.ok }
})
