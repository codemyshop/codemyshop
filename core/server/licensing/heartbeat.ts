/**
 *
 * Heartbeat-based license system.
 * On boot, the instance validates its key against the license server.
 * Token valid for 48h — automatically renewed.
 * If expired → soft-lock (Hub disabled, PS intact).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHmac } from 'node:crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LicenseToken {
  clientId:   string
  validUntil: string   // ISO date
  features:   string[] // features autorisées
  signature:  string   // HMAC pour empêcher la falsification locale
}

export type LicenseStatus = 'active' | 'grace' | 'expired' | 'standalone'

// ── Chemins ───────────────────────────────────────────────────────────────────

const TOKEN_PATH = '/data/secrets/license-token.json'
const FALLBACK_PATH = process.cwd() + '/.secrets/license-token.json'

function getTokenPath(): string {
  if (existsSync('/data/secrets')) return TOKEN_PATH
  return FALLBACK_PATH
}

// ── Lecture / Écriture du jeton ────────────────────────────────────────────────

export function readToken(): LicenseToken | null {
  try {
    const path = getTokenPath()
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch { return null }
}

function writeToken(token: LicenseToken) {
  const path = getTokenPath()
  writeFileSync(path, JSON.stringify(token, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

// ── Vérification de signature ─────────────────────────────────────────────────

function signToken(clientId: string, validUntil: string, features: string[]): string {
  const secret = process.env.API_ENCRYPTION_KEY || process.env.NUXT_SECRET || ''
  return createHmac('sha256', secret)
    .update(`${clientId}:${validUntil}:${features.join(',')}`)
    .digest('hex')
}

function verifySignature(token: LicenseToken): boolean {
  const expected = signToken(token.clientId, token.validUntil, token.features)
  return token.signature === expected
}

// ── Statut de la licence ──────────────────────────────────────────────────────

export function getLicenseStatus(): LicenseStatus {
  const motherUrl = process.env.MOTHER_HUB_URL

  // Mode standalone (pas de Vaisseau Mère configuré — AC Hub lui-même)
  if (!motherUrl) return 'standalone'

  const token = readToken()
  if (!token) return 'expired'

  // Vérifier la signature (anti-falsification)
  if (!verifySignature(token)) return 'expired'

  const now = new Date()
  const expiry = new Date(token.validUntil)

  if (now < expiry) return 'active'

  // Période de grâce : 7 jours après expiration
  const gracePeriod = new Date(expiry.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (now < gracePeriod) return 'grace'

  return 'expired'
}

// ── Heartbeat vers le Vaisseau Mère ───────────────────────────────────────────

export async function performHeartbeat(): Promise<LicenseStatus> {
  const motherUrl = process.env.MOTHER_HUB_URL
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.MASTER_WEBHOOK_SECRET
  const clientId = process.env.AI_CLIENT_ID || 'unknown'

  if (!motherUrl) return 'standalone'

  try {
    const res = await $fetch<{
      ok: boolean
      validUntil: string
      features: string[]
    }>(`${motherUrl}/api/licensing/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${webhookSecret}`,
        'Content-Type': 'application/json',
      },
      body: { clientId },
      timeout: 10000,
    })

    if (res.ok) {
      const token: LicenseToken = {
        clientId,
        validUntil: res.validUntil,
        features:   res.features,
        signature:  signToken(clientId, res.validUntil, res.features),
      }
      writeToken(token)
      return 'active'
    }

    return getLicenseStatus() // fallback sur le jeton local
  } catch {
    // Vaisseau Mère injoignable → utiliser le jeton local en cache
    return getLicenseStatus()
  }
}
