/**
 *
 * Feature flag PG_ENABLED_DOMAINS — chantier #38 db-pg-pgvector Phase 1+D.
 *
 * Usage :
 *   - `PG_ENABLED_DOMAINS=drill,snake` (Phase 1, opt-in domaine par domaine)
 * (global phase cutover, all domains on PG)
 * (complete rollback, all on MariaDB)
 *
 * Listed domains route their runtime requests to ac_postgres
 * (Drizzle PG) instead of ac_mariadb. Enables progressive migration with
 * instant rollback (edit .env + restart Nuxt).
 *
 * Domain names are free but conventionally named after the module
 * (without the `ac_` prefix): `drill`, `snake`, `blog`, `agents`, `bank`...
 *
 * Performance: the list is parsed once at boot (stored in memory),
 * no cost per request. The wildcard `*` is detected at load and stored
 * as a separate flag to avoid an extra check per call.
 */

let cached: { set: Set<string>; wildcard: boolean } | null = null

function load(): { set: Set<string>; wildcard: boolean } {
  if (cached) return cached
  const raw = process.env.PG_ENABLED_DOMAINS || ''
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  cached = {
    set: new Set(tokens.filter((t) => t !== '*')),
    wildcard: tokens.includes('*'),
  }
  return cached
}

/** True si le domaine est routé sur Postgres. */
export function isDomainOnPg(domain: string): boolean {
  const { set, wildcard } = load()
  return wildcard || set.has(domain.toLowerCase())
}

/** Cache reset — reserved for tests. */
export function _resetPgFlagCache(): void {
  cached = null
}
