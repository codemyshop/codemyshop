/**
 *
 * Secure client API key management.
 *
 * - Stockage : /data/secrets/api-keys.enc.json (volume Docker persistant, hors code source)
 * - Encryption: AES-256-GCM per value, master key from API_ENCRYPTION_KEY (.env)
 * - GET API: never returns keys in plaintext (masking sk-a****xyz)
 * - Decryption: only in memory at the time of the API call
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientApiKeys {
  prestashopUrl?:   string   // URL Webservice PS (non chiffrée — pas un secret)
  prestashopKey?:   string   // Chiffré sur disque
  aiProvider?:      string   // 'anthropic' | 'openai' (non chiffré)
  aiApiKey?:        string   // Chiffré sur disque
  aiModel?:         string   // Non chiffré
  updatedAt?:       string
}

/** Format stocké sur disque — les champs secrets sont des blobs chiffrés */
interface StoredApiKeys {
  prestashopUrl?:   string
  prestashopKey?:   string   // format: iv:tag:ciphertext (base64)
  aiProvider?:      string
  aiApiKey?:        string   // format: iv:tag:ciphertext (base64)
  aiModel?:         string
  updatedAt?:       string
}

// ── Chemins ───────────────────────────────────────────────────────────────────

const SECRETS_DIR  = '/data/secrets'
const SECRETS_FILE = `${SECRETS_DIR}/api-keys.enc.json`

// Dev fallback: if /data/secrets is not mountable (local dev without Docker)
const DEV_DIR  = process.cwd() + '/.secrets'
const DEV_FILE = `${DEV_DIR}/api-keys.enc.json`

function getSecretsPath(): string {
  // Production : volume Docker /data/secrets
  if (existsSync(SECRETS_DIR) || canCreateDir(SECRETS_DIR)) {
    return SECRETS_FILE
  }
  // Dev fallback (gitignored)
  if (!existsSync(DEV_DIR)) mkdirSync(DEV_DIR, { recursive: true })
  return DEV_FILE
}

function canCreateDir(path: string): boolean {
  try { mkdirSync(path, { recursive: true }); return true }
  catch { return false }
}

// ── Chiffrement AES-256-GCM ──────────────────────────────────────────────────

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getMasterKey(): Buffer {
  const config = useRuntimeConfig()
  const secret = (config as any).apiEncryptionKey
                 || process.env.API_ENCRYPTION_KEY
                 || config.secret    // fallback NUXT_SECRET
                 || ''

  if (!secret) {
    console.warn('[api-keys] AUCUNE CLÉ DE CHIFFREMENT — les secrets ne seront pas protégés')
    // Returns a key derived from an empty string (degraded mode)
  }

  return scryptSync(secret, 'codemyshop-api-keys-salt', 32)
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  const key = getMasterKey()
  const iv  = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all in base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
}

export function decrypt(blob: string): string {
  if (!blob || !blob.includes(':')) return ''
  try {
    const [ivB64, tagB64, ciphertext] = blob.split(':')
    const key = getMasterKey()
    const iv  = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('[api-keys] Erreur de déchiffrement — clé maître changée ?', err)
    return ''
  }
}

// ── Read / Write ────────────────────────────────────────────────────────

function readStore(): Record<string, StoredApiKeys> {
  const path = getSecretsPath()
  try { return JSON.parse(readFileSync(path, 'utf-8')) }
  catch { return {} }
}

function writeStore(data: Record<string, StoredApiKeys>) {
  const path = getSecretsPath()
  writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

// ── API Publique ──────────────────────────────────────────────────────────────

/** Reads client keys. Secrets are DECRYPTED in memory. */
export function readApiKeys(clientId: string): ClientApiKeys {
  const all = readStore()
  const stored = all[clientId]
  if (!stored) return {}

  return {
    prestashopUrl: stored.prestashopUrl,
    prestashopKey: decrypt(stored.prestashopKey ?? ''),
    aiProvider:    stored.aiProvider,
    aiApiKey:      decrypt(stored.aiApiKey ?? ''),
    aiModel:       stored.aiModel,
    updatedAt:     stored.updatedAt,
  }
}

/** Writes client keys. Secrets are ENCRYPTED before writing. */
export function writeApiKeys(clientId: string, keys: Partial<ClientApiKeys>) {
  const all    = readStore()
  const existing = all[clientId] ?? {}

  const updated: StoredApiKeys = { ...existing, updatedAt: new Date().toISOString() }

  // Non-secret fields (stored in plaintext)
  if (keys.prestashopUrl !== undefined) updated.prestashopUrl = keys.prestashopUrl
  if (keys.aiProvider    !== undefined) updated.aiProvider    = keys.aiProvider
  if (keys.aiModel       !== undefined) updated.aiModel       = keys.aiModel

  // Secret fields (encrypted)
  if (keys.prestashopKey !== undefined && keys.prestashopKey) {
    updated.prestashopKey = encrypt(keys.prestashopKey)
  }
  if (keys.aiApiKey !== undefined && keys.aiApiKey) {
    updated.aiApiKey = encrypt(keys.aiApiKey)
  }

  all[clientId] = updated
  writeStore(all)
}

/**
 * Masks a key for frontend display.
 * "sk-ant-api03-xxxxx...xxxxx-8f3a" → "sk-a····················8f3a"
 */
export function maskKey(key?: string): string {
  if (!key) return ''
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 4) + '\u2022'.repeat(Math.min(20, key.length - 8)) + key.slice(-4)
}

/** Indique si une clé existe (sans la déchiffrer — vérifie juste le blob) */
export function hasStoredKey(clientId: string, field: 'prestashopKey' | 'aiApiKey'): boolean {
  const all = readStore()
  return !!(all[clientId]?.[field])
}

// ── Resolution (runtime) ────────────────────────────────────────────────────────

/** Resolves the API key. Priority: encrypted store > .env */
export function resolveAiKey(clientId?: string): { provider: string; apiKey: string; model: string } | null {
  if (clientId) {
    const keys = readApiKeys(clientId)
    if (keys.aiApiKey) {
      return {
        provider: keys.aiProvider ?? 'anthropic',
        apiKey:   keys.aiApiKey,
        model:    keys.aiModel ?? 'claude-sonnet-4-6',
      }
    }
  }

  const config = useRuntimeConfig()
  const envKey = config.anthropicApiKey as string
  if (envKey) return { provider: 'anthropic', apiKey: envKey, model: 'claude-sonnet-4-6' }

  return null
}

/** Resolves PS credentials. Priority: encrypted store > env PS_URL_xxx */
export function resolveClientPsCredentials(clientId?: string): { apiUrl: string; apiKey: string } | null {
  if (clientId) {
    const keys = readApiKeys(clientId)
    if (keys.prestashopKey && keys.prestashopUrl) {
      return { apiUrl: keys.prestashopUrl, apiKey: keys.prestashopKey }
    }
  }
  return null
}
