/**
 *
 * HMAC-SHA256 signature of session cookies (hub_session, ac_session).
 *
 * Scar / backlog #249 (P0 debt_archi 2026-04-29): before this module,
 * the cookie was plain base64url(JSON) — trivially forgeable
 * (forged cookie {isAdmin:true} accepted as-is → Super Admin without login).
 *
 * Signed token format: "<base64url(payload_json)>.<base64url(hmac)>"
 *
 * The HMAC secret comes from HUB_SESSION_SECRET (.env.host) — fail loud if
 * absent in production. In dev, fallback to a fixed dev secret logged
 * so a minimal Nuxt boot doesn't crash (local tests).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const DEV_FALLBACK_SECRET = 'dev-only-do-not-use-in-prod-eb6f1c2a'

let cachedSecret: string | null = null

function getSecret(): string {
  if (cachedSecret) return cachedSecret
  const secret = process.env.HUB_SESSION_SECRET || ''
  if (secret.length >= 32) {
    cachedSecret = secret
    return secret
  }
  if (process.env.NODE_ENV === 'production') {
    // Fail loud — refuser de signer des sessions en prod sans secret valide.
    throw new Error('[session-crypto] HUB_SESSION_SECRET manquant ou trop court (≥32 chars requis) en production')
  }
  console.warn('[session-crypto] HUB_SESSION_SECRET absent — fallback dev secret. NE PAS UTILISER EN PROD.')
  cachedSecret = DEV_FALLBACK_SECRET
  return cachedSecret
}

function hmac(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/**
 * Signs a session payload. Returns `<base64url(json)>.<base64url(hmac)>`.
 */
export function signToken(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = hmac(body)
  return `${body}.${sig}`
}

/**
 * Verifies and decodes a signed token. Returns null if format is invalid,
 * signature is missing, or HMAC doesn't match (uses timing-safe comparison).
 *
 * Tolerates the old unsigned format in dev mode only (warning),
 * to allow local testing without clearing cookies. In prod, hard-cut:
 * any cookie without `.<sig>` or with invalid sig is rejected → re-login.
 */
export function verifyToken<T = unknown>(token: string | undefined | null): T | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev : laisse passer un legacy base64url pur, pour ne pas forcer re-login local.
      try {
        const data = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
        console.warn('[session-crypto] cookie non signé accepté en dev (legacy). Régénérer la session.')
        return data as T
      } catch { return null }
    }
    return null
  }
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = hmac(body)
  let bufA: Buffer, bufB: Buffer
  try {
    bufA = Buffer.from(sig, 'base64url')
    bufB = Buffer.from(expected, 'base64url')
  } catch { return null }
  if (bufA.length !== bufB.length) return null
  if (!timingSafeEqual(bufA, bufB)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as T
  } catch {
    return null
  }
}
