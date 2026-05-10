/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { setCustomerLinkedinUrl } from '~/modules/customer-extra/server/utils/customer-extra'

/**
 * PUT /api/bo/customers/{id}/linkedin
 *
 * Saves the verified LinkedIn URL of a customer in
 * cs_customer_extra.linkedin_url (UPSERT — the row may not
 * exist as long as no metadata has been entered).
 *
 * Body: { url: string } — empty to clear.
 * Accepted URL: https?://….linkedin.com/… or empty.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event) as { url?: string }
  const raw = typeof body?.url === 'string' ? body.url.trim() : ''

  let url = ''
  if (raw) {
    if (!/^https?:\/\//i.test(raw) || !/linkedin\.com\//i.test(raw)) {
      throw createError({ statusCode: 400, statusMessage: 'URL LinkedIn invalide' })
    }
    url = raw.slice(0, 255)
  }

  await setCustomerLinkedinUrl(id, url || null, { event })
  return { ok: true, id, url }
})
