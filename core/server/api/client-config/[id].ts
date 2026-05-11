

import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''

  if (!/^[a-z0-9-]+$/.test(id)) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }

  try {
    const configJson = await getClientConfigJson(id, { event })
    if (!configJson) {
      throw createError({ statusCode: 404, message: 'No config found' })
    }
    return JSON.parse(configJson)
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[client-config] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
