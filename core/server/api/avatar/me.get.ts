

import type { VisitorAvatar } from '~/types/avatar'

export default defineEventHandler(async (event) => {
  const config    = useRuntimeConfig()
  const visitorId = getCookie(event, 'ac_visitor_id')

  if (!visitorId) {
    throw createError({ statusCode: 404, message: 'No visitor profile found' })
  }

  const clientId = config.aiClientId ?? 'ac-hub'
  const storage  = useStorage('avatars')
  const key      = `${clientId}:${visitorId}`

  const avatar = await storage.getItem<VisitorAvatar>(key)

  if (!avatar) {
    throw createError({ statusCode: 404, message: 'No avatar computed yet' })
  }

  return avatar
})
