/**
 * DELETE /api/avatar/reset
 * Deletes the current visitor's avatar profile (useful for tests).
 * Also clears the ac_avatar_type and ac_visitor_id cookies.
 */
export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const visitorId = getCookie(event, 'ac_visitor_id')

  if (visitorId) {
    const clientId = config.aiClientId ?? 'ac-hub'
    const storage  = useStorage('avatars')
    await storage.removeItem(`${clientId}:${visitorId}`)
  }

  // Effacer les cookies
  setCookie(event, 'ac_avatar_type', '', { maxAge: 0, path: '/' })
  setCookie(event, 'ac_visitor_id',  '', { maxAge: 0, path: '/' })

  return { ok: true }
})
