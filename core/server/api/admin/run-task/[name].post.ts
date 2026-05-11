

import { runTask } from 'nitropack/runtime'
import { verifyToken } from '~/server/utils/session-crypto'
import { timingSafeEqual } from 'node:crypto'

const TASK_PREFIXES_ALLOWED = ['audit:', 'cover:', 'business:', 'seo:']
const TASK_NAME_RE = /^[a-z]+:[a-z][a-z0-9-]*$/

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isAuthorized(event: any): { ok: true; via: 'cookie' | 'token' } | { ok: false; reason: string } {
  
  const cookie = getCookie(event, 'hub_session')
  if (cookie) {
    const session = verifyToken<any>(cookie)
    if (session?.isAdmin) return { ok: true, via: 'cookie' }
  }

  
  const auth = getRequestHeader(event, 'authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (match) {
    const provided = match[1].trim()
    const expected = process.env.AC_ADMIN_TASK_TOKEN || ''
    if (expected.length >= 32 && safeEqual(provided, expected)) {
      return { ok: true, via: 'token' }
    }
  }

  return { ok: false, reason: 'no valid session or bearer token' }
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''

  if (!TASK_NAME_RE.test(name)) {
    throw createError({ statusCode: 400, message: `Nom de task invalide : ${name}` })
  }
  if (!TASK_PREFIXES_ALLOWED.some(p => name.startsWith(p))) {
    throw createError({ statusCode: 403, message: `Préfixe interdit (whitelist: ${TASK_PREFIXES_ALLOWED.join('* / ')}*)` })
  }

  const auth = isAuthorized(event)
  if (!auth.ok) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const body = await readBody(event).catch(() => ({}))
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, any>

  const t0 = Date.now()
  console.log(`[run-task] start ${name} via=${auth.via} payload_keys=${Object.keys(payload).join(',') || 'none'}`)

  try {
    const result = await runTask(name, { payload })
    const durationMs = Date.now() - t0
    console.log(`[run-task] done ${name} ${durationMs}ms`)
    return { ok: true, name, durationMs, result }
  } catch (err: any) {
    const durationMs = Date.now() - t0
    console.error(`[run-task] fail ${name} ${durationMs}ms : ${err?.message || err}`)
    throw createError({
      statusCode: err?.statusCode || 500,
      message: `Échec exécution ${name} : ${err?.message || err}`,
    })
  }
})
