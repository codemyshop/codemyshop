

export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const visitorId = getCookie(event, 'ac_visitor_id')

  if (visitorId) {
    const clientId = config.aiClientId ?? 'ac-hub'
    const storage  = useStorage('avatars')
    await storage.removeItem(`${clientId}:${visitorId}`)
  }

  
  setCookie(event, 'ac_avatar_type', '', { maxAge: 0, path: '/' })
  setCookie(event, 'ac_visitor_id',  '', { maxAge: 0, path: '/' })

  return { ok: true }
})
