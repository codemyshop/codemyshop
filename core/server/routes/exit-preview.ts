/**
 * GET /exit-preview
 * Clears the preview cookie server-side (Set-Cookie Max-Age=0) and redirects to /.
 * 100% reliable: bypasses useCookie and writes directly to the h3 response.
 */
import { setCookie, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  setCookie(event, 'ac_preview', '', {
    maxAge:   0,
    path:     '/',
    sameSite: 'lax',
  })
  return sendRedirect(event, '/', 302)
})
