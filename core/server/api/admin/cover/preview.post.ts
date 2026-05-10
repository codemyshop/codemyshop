/**
 *
 * POST /api/admin/cover/preview
 *
 * Generates a cover preview on the fly (resvg + sharp) — Wave 3 #3 Phase D.
 * Usage: visually validate parity between Pillow and resvg+sharp in preprod
 * without going through the cs_covergen_queue.
 *
 * Auth duale (cookie hub_session admin OU Bearer AC_ADMIN_TASK_TOKEN).
 *
 * Body JSON :
 *   { title: string, tenant?: string, usePhotoBg?: boolean,
 *     withAvatar?: boolean, forcePerso?: string }
 *
 * 200 response: binary PNG (Content-Type image/png).
 */

import { timingSafeEqual } from 'node:crypto'
import { verifyToken } from '~/server/utils/session-crypto'
import { generateCover } from '~/server/utils/cover-render'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isAuthorized(event: any): boolean {
  const cookie = getCookie(event, 'hub_session')
  if (cookie) {
    const session = verifyToken<any>(cookie)
    if (session?.isAdmin) return true
  }
  const auth = getRequestHeader(event, 'authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (match) {
    const expected = process.env.AC_ADMIN_TASK_TOKEN || ''
    if (expected.length >= 32 && safeEqual(match[1].trim(), expected)) return true
  }
  return false
}

export default defineEventHandler(async (event) => {
  if (!isAuthorized(event)) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const body = await readBody(event).catch(() => ({}))
  const { title, tenant, usePhotoBg, withAvatar, forcePerso } = body || {}

  if (typeof title !== 'string' || !title.trim()) {
    throw createError({ statusCode: 400, message: 'title requis' })
  }

  const t0 = Date.now()
  const png = await generateCover({
    title: title.trim(),
    tenant: typeof tenant === 'string' ? tenant : 'ac-hub',
    usePhotoBg: typeof usePhotoBg === 'boolean' ? usePhotoBg : false,
    withAvatar: typeof withAvatar === 'boolean' ? withAvatar : true,
    forcePerso: typeof forcePerso === 'string' ? forcePerso : undefined,
  })
  const durationMs = Date.now() - t0
  console.log(`[admin/cover/preview] ${title.slice(0, 60)} → ${png.length}B in ${durationMs}ms`)

  setResponseHeader(event, 'Content-Type', 'image/png')
  setResponseHeader(event, 'Content-Length', String(png.length))
  setResponseHeader(event, 'X-Render-Duration-Ms', String(durationMs))
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return png
})
