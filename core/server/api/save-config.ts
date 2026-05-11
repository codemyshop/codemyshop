

import { getClientConfigJson, upsertClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  const body = await readBody<Record<string, unknown>>(event)

  if (!body.clientId || typeof body.clientId !== 'string') {
    throw createError({ statusCode: 400, message: 'clientId is required' })
  }
  const clientId = body.clientId as string
  if (!/^[a-z0-9-]+$/.test(clientId)) {
    throw createError({ statusCode: 400, message: 'Invalid clientId' })
  }

  let config: Record<string, unknown>
  if (body.config && typeof body.config === 'object' && !Array.isArray(body.config)) {
    config = body.config as Record<string, unknown>
  } else {
    const { clientId: _id, header, ...slices } = body as any
    config = {
      ...slices,
      ...(header && typeof header === 'object' ? header : {}),
    }
  }

  
  
  
  
  
  
  const STRIP = ['topBar', 'logo', 'menu', 'footer', 'homepage', 'blog']
  for (const k of STRIP) delete config[k]

  
  
  try {
    const existingJson = await getClientConfigJson(clientId, { event })
    let existing: Record<string, unknown> = {}
    if (existingJson) {
      try { existing = JSON.parse(existingJson) } catch { existing = {} }
    }
    const merged = { ...existing, ...config }
    await upsertClientConfigJson(clientId, JSON.stringify(merged), { event })
    return { success: true, clientId }
  } catch (err: any) {
    console.error('[save-config] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
