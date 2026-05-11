

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
    
    throw new Error('[session-crypto] HUB_SESSION_SECRET manquant ou trop court (≥32 chars requis) en production')
  }
  console.warn('[session-crypto] HUB_SESSION_SECRET absent — fallback dev secret. NE PAS UTILISER EN PROD.')
  cachedSecret = DEV_FALLBACK_SECRET
  return cachedSecret
}

function hmac(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function signToken(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = hmac(body)
  return `${body}.${sig}`
}

export function verifyToken<T = unknown>(token: string | undefined | null): T | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) {
    if (process.env.NODE_ENV !== 'production') {
      
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
