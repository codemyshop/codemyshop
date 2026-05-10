/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/indexnow-key
 * Returns the IndexNow key as plain text.
 * The protocol also requires /{key}.txt to be accessible — handled by Nginx rewrite.
 */
export default defineEventHandler((event) => {
  const key = process.env.INDEXNOW_API_KEY || ''
  if (!key) {
    throw createError({ statusCode: 404, message: 'Not configured' })
  }
  setResponseHeader(event, 'content-type', 'text/plain')
  return key
})
