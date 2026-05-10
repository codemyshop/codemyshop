/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Middleware : Block /__nuxt_error
 * Prevents bots from crawling /__nuxt_error in a loop.
 * Nuxt serves this page with 200 by default → bots think it's actual content.
 * This middleware returns a clean 404 before Nuxt renders the page.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path === '/__nuxt_error' || path === '/__nuxt_error/') {
    setResponseStatus(event, 404)
    setResponseHeader(event, 'X-Robots-Tag', 'noindex')
    return '404 - Not Found'
  }
})
