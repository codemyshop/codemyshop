/**
 *
 * Nuxt server DB facade — task #44 phase E.4 DONE 2026-04-30:
 * MariaDB completely eliminated, runtime 100% PostgreSQL via adapter
 * (`db-pg-adapter.ts` — postgres-js + conversion ?→$N + schema prefix
 * `cs_main.`).
 *
 * Surface restante :
 *  - `useClientDb(event)` / `useClientDbById(clientId)` → adapter PG
 * - `resolveClientId(event)` → multi-tenant resolution (config + hostname)
 * - `getKnownTenantClientIds()` → list tenants for broadcast
 *
 * Tenants migrated to PG: Example Shop v2 + another tenant v2 (cutover 2026-05-01,
 * verified in production 2026-05-06). `example_v2_postgres` and `smoke_v2_postgres`
 * runtime healthy, no more Nuxt binaries on the mysql2 path.
 */

import { isDomainOnPg } from './pg-flag'
import { buildPgAdapter, type PgAdapterClient } from './db-pg-adapter'

/**
 * DB config by clientId — read from environment variables.
 *
 * Convention : NUXT_TENANT_DB_<KEY>=<database>[,<host>[,<port>[,<user>[,<password>]]]]
 *   <KEY> = clientId en MAJUSCULES, tirets → underscores
 */
function buildClientDbMap(): Record<string, { database: string; host?: string; port?: number; user?: string; password?: string }> {
  const map: Record<string, { database: string; host?: string; port?: number; user?: string; password?: string }> = {}
  const PREFIX = 'NUXT_TENANT_DB_'

  for (const [key, val] of Object.entries(process.env)) {
    if (!key.startsWith(PREFIX) || !val) continue
    const clientKey = key.slice(PREFIX.length).toLowerCase().replace(/_/g, '-')
    const parts = val.split(',')
    map[clientKey] = {
      database: parts[0],
      host: parts[1] || undefined,
      port: parts[2] ? Number(parts[2]) : undefined,
      user: parts[3] || undefined,
      password: parts[4] || undefined,
    }
  }

  return map
}

const CLIENT_DB_MAP = buildClientDbMap()

/**
 * List of known tenant clientIds (extracted from NUXT_TENANT_DB_*).
 * Serves to broadcast global secrets that must be mirrored
 * in each tenant DB (cf. utils/secrets.ts → writeGlobalSecretEverywhere).
 */
export function getKnownTenantClientIds(): string[] {
  return Object.keys(CLIENT_DB_MAP)
}

/**
 * Resolves the clientId from runtimeConfig or the H3 request hostname.
 *
 * Priority: runtimeConfig.clientId (defined by each tenant deployment)
 * → hostname matching in CLIENT_DB_MAP (fallback for multi-tenant on a single Nuxt)
 * → 'ac-hub' (default)
 */
export function resolveClientId(event?: any): string {
  // 1. runtimeConfig.clientId — chaque VPS tenant le définit
  try {
    const cfg = useRuntimeConfig(event)
    const fromCfg = (cfg.clientId as string | undefined) || ''
    if (fromCfg && fromCfg !== 'ac-hub') return fromCfg
  } catch { /* pas d'event */ }

  // 2. Hostname matching — for multi-tenant setups on a single Nuxt
  if (event) {
    try {
      const host = getRequestHost(event) || ''
      for (const clientKey of Object.keys(CLIENT_DB_MAP)) {
        const keyword = clientKey.replace(/-v\d+$/, '').replace(/-/g, '')
        if (host.includes(keyword)) return clientKey
      }
    } catch { /* pas de requête */ }
  }

  return 'ac-hub'
}

const VAISSEAU_MERE_TENANTS = new Set(['ac-hub', 'alexandrecarette', 'codemyshop'])

// Third-party tenants already migrated to their own dedicated PG (cf. task #44
// example-vape-pg-cutover). Read from the deploy env: each container
// Nuxt tenant declares its clientId here once its DB is pointed to its PG.
function getExtraPgTenants(): Set<string> {
  const raw = process.env.PG_ENABLED_TENANTS || ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

function shouldDispatchToPg(clientId: string): boolean {
  if (!isDomainOnPg('*')) return false
  return VAISSEAU_MERE_TENANTS.has(clientId) || getExtraPgTenants().has(clientId)
}

/**
 * DB access by explicit clientId. Always use the PG adapter since task #44 E.4.
 * If shouldDispatchToPg() is false (never in production), throw.
 */
export function useClientDbById(clientId: string): PgAdapterClient {
  if (shouldDispatchToPg(clientId)) return buildPgAdapter(clientId)
  throw new Error(
    `[db] useClientDbById('${clientId}') : path mysql2 droppé (chantier #44 E.4). `
    + `Tenant non vaisseau-mère AC ou PG_ENABLED_DOMAINS non wildcard. `
    + `Migrer ce tenant vers PG avant son prochain deploy.`,
  )
}

/**
 * Returns a DB access for the client associated with the request.
 * Always use the PG adapter since task #44 E.4.
 */
export function useClientDb(event?: any): PgAdapterClient {
  const clientId = resolveClientId(event)
  return useClientDbById(clientId)
}
