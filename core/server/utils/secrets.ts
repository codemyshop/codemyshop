/**
 *
 * DB-only storage of global system secrets (Google Search Console Service
 * Account, Powens refresh token, etc.).
 *
 * Model:
 * - 1 row in `cs_client_config` with `client_id = '_global'`.
 *   - Structure JSON : { secrets: { <slug>: <encrypted_blob>, ... } }
 * - AES-256-GCM encryption via the API_ENCRYPTION_KEY master key
 * (same primitives as api-keys.ts).
 *
 * Why not a dedicated `cs_secret` table?
 * - 1 global row, no need for multi-secret indexing for now.
 * - Avoids creating a new module (avoid shadow IT rule).
 * - The `_` prefix on `client_id` clearly marks the pseudo-tenant
 * system — no collision possible with a real tenant
 * (slug normalized to /^[a-z0-9-]+$/).
 * - Future migration possible if we accumulate >3 global secrets.
 */

import { encrypt, decrypt } from './api-keys'
import { getKnownTenantClientIds } from './db'
import {
  getClientConfigJson,
  upsertClientConfigJson,
} from '~/internal/clientconfig/server/utils/clientconfig'

const GLOBAL_CLIENT_ID = '_global'

interface GlobalConfigShape {
  secrets?: Record<string, string>  // slug → encrypted blob
  [key: string]: unknown
}

type FacadeContext = { global?: boolean; clientId?: string }

async function readGlobalRowFrom(ctx: FacadeContext): Promise<GlobalConfigShape> {
  const json = await getClientConfigJson(GLOBAL_CLIENT_ID, ctx)
  if (!json) return {}
  try {
    return JSON.parse(json) as GlobalConfigShape
  } catch {
    return {}
  }
}

async function writeGlobalRowTo(ctx: FacadeContext, config: GlobalConfigShape): Promise<void> {
  await upsertClientConfigJson(GLOBAL_CLIENT_ID, JSON.stringify(config), ctx)
}

/** Lit un secret global déchiffré (DB locale Nuxt). Renvoie '' si absent. */
export async function readGlobalSecret(slug: string): Promise<string> {
  const config = await readGlobalRowFrom({ global: true })
  const blob = config.secrets?.[slug]
  if (!blob) return ''
  return decrypt(blob)
}

/**
 * Writes (or updates) a global secret. Empty plaintext = deletion of the slug.
 * Mode `local`: only the current Nuxt database (NUXT_DB_NAME).
 * Mode `broadcast`: the local DB + all known tenant databases
 * (NUXT_TENANT_DB_*) — to propagate the secret to Nuxt tenants that
 * read from their own DB.
 */
export async function writeGlobalSecret(
  slug: string,
  plaintext: string,
  mode: 'local' | 'broadcast' = 'local',
): Promise<{ written: string[]; failed: { db: string; error: string }[] }> {
  const config = await readGlobalRowFrom({ global: true })
  const secrets = { ...(config.secrets ?? {}) }
  if (plaintext) {
    secrets[slug] = encrypt(plaintext)
  } else {
    delete secrets[slug]
  }
  const nextConfig = { ...config, secrets }

  const written: string[] = []
  const failed: { db: string; error: string }[] = []

  // 1. DB locale (toujours)
  try {
    await writeGlobalRowTo({ global: true }, nextConfig)
    written.push('_local')
  } catch (err: any) {
    failed.push({ db: '_local', error: err?.message ?? 'unknown' })
  }

  // 2. Broadcast vers toutes les DBs tenants connues
  if (mode === 'broadcast') {
    for (const clientId of getKnownTenantClientIds()) {
      try {
        // On ré-applique le merge sur la row tenant existante (peut avoir
        // d'autres secrets ou clés top-level différents).
        const tenantConfig = await readGlobalRowFrom({ clientId })
        const tenantSecrets = { ...(tenantConfig.secrets ?? {}) }
        if (plaintext) tenantSecrets[slug] = secrets[slug]
        else delete tenantSecrets[slug]
        await writeGlobalRowTo({ clientId }, { ...tenantConfig, secrets: tenantSecrets })
        written.push(clientId)
      } catch (err: any) {
        failed.push({ db: clientId, error: err?.message?.slice(0, 200) ?? 'unknown' })
      }
    }
  }

  return { written, failed }
}

/** Indique si un secret existe localement (sans le déchiffrer). */
export async function hasGlobalSecret(slug: string): Promise<boolean> {
  const config = await readGlobalRowFrom({ global: true })
  return !!config.secrets?.[slug]
}
