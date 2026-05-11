

import { getSession } from '~/server/utils/session'
import {
  getClientConfigJson,
  upsertClientConfigJson,
} from '~/internal/clientconfig/server/utils/clientconfig'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    const { clientId } = getQuery(event)
    const id = (clientId as string) || ''
    if (!/^[a-z0-9-]+$/.test(id)) {
      throw createError({ statusCode: 400, message: 'Invalid clientId' })
    }

    const json = await getClientConfigJson(id, { event })
    let gscSiteUrl = ''
    if (json) {
      try {
        const cfg = JSON.parse(json)
        if (typeof cfg?.gscSiteUrl === 'string') gscSiteUrl = cfg.gscSiteUrl
      } catch {}
    }

    return { clientId: id, gscSiteUrl }
  }

  if (method === 'POST') {
    const session = getSession(event)
    if (!session?.isAdmin) {
      throw createError({ statusCode: 403, message: 'Admin requis' })
    }

    const body = await readBody<{ clientId?: string; gscSiteUrl?: string }>(event)
    const id = (body.clientId ?? '').trim()
    const url = (body.gscSiteUrl ?? '').trim()

    if (!/^[a-z0-9-]+$/.test(id)) {
      throw createError({ statusCode: 400, message: 'clientId requis' })
    }

    
    if (url && !/^(sc-domain:|https?:\/\/)/.test(url)) {
      throw createError({
        statusCode: 400,
        message: 'gscSiteUrl invalide (attendu : "sc-domain:..." ou "https://...")',
      })
    }

    const existingJson = await getClientConfigJson(id, { event })
    let cfg: Record<string, unknown> = {}
    if (existingJson) {
      try { cfg = JSON.parse(existingJson) } catch {}
    }
    if (url) cfg.gscSiteUrl = url
    else delete cfg.gscSiteUrl

    await upsertClientConfigJson(id, JSON.stringify(cfg), { event })
    return { ok: true, clientId: id, gscSiteUrl: url }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
