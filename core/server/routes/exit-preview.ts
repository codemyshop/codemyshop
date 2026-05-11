

import { setCookie, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  setCookie(event, 'ac_preview', '', {
    maxAge:   0,
    path:     '/',
    sameSite: 'lax',
  })
  return sendRedirect(event, '/', 302)
})
