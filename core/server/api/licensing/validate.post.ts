

import { timingSafeEqual } from 'node:crypto'

export default defineEventHandler(async (event) => {
  
  const auth = (getHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '')
  const secret = process.env.MASTER_WEBHOOK_SECRET ?? ''

  if (!secret || !auth || !safeCompare(auth, secret)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<{ clientId: string }>(event)
  const clientId = (body.clientId ?? '').trim()

  if (!clientId) throw createError({ statusCode: 400, message: 'clientId requis' })

  
  const { isClientActive } = await import('~/internal/hub/server/utils/hub')
  const isActive = await isClientActive(clientId)

  if (!isActive) {
    return { ok: false, reason: 'suspended' }
  }

  
  const validUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  
  let features: string[] = []
  try {
    features = getTenantEnabledFeatures(clientId)
  } catch {
    features = ['broadcast', 'blog-ia', 'avatars'] 
  }

  console.log(`[licensing] Jeton émis pour ${clientId} — valide jusqu'à ${validUntil}`)

  return {
    ok: true,
    validUntil,
    features,
  }
})

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)) }
  catch { return false }
}
