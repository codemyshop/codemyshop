/**
 * POST /api/avatar/analyze
 * Body : { signals: VisitorSignals }
 * Reads the visitorId from the ac_visitor_id cookie (or creates a new one).
 * Classifies the avatar and writes to KV + sets ac_avatar_type cookie.
 */
import { analyzeVisitor } from '~/server/tasks/analyze-visitor'
import type { VisitorSignals } from '~/types/avatar'
import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const body    = await readBody<{ signals?: VisitorSignals }>(event)
  const signals = body?.signals ?? {}

  // ── Visitor ID (anonyme, UUID v4) ────────────────────────────────────────
  let visitorId = getCookie(event, 'ac_visitor_id')
  if (!visitorId) {
    visitorId = randomUUID()
    setCookie(event, 'ac_visitor_id', visitorId, {
      maxAge:   60 * 60 * 24 * 365, // 1 an
      httpOnly: false,
      sameSite: 'lax',
      path:     '/',
    })
  }

  const clientId = config.aiClientId ?? 'ac-hub'

  // ── Classification ────────────────────────────────────────────────────────
  const avatar = await analyzeVisitor(visitorId, clientId, signals)

  // ── Cookie avatar type (accessible côté client) ──────────────────────────
  setCookie(event, 'ac_avatar_type', avatar.type, {
    maxAge:   60 * 60 * 24 * 30, // 30 jours
    httpOnly: false,
    sameSite: 'lax',
    path:     '/',
  })

  return { ok: true, avatar }
})
