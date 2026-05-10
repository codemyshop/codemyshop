/**
 *
 * Execution mode for tasks "Wave 1 active" (project #43).
 *
 * A watchdog can be:
 * - "shadow": business writes (UPDATE/DELETE/INSERT other than
 * cs_audit_reports) are short-circuited. Checks run, the report is
 * persisted, the Python cron remains the source of truth.
 * Python remains the source of truth.
 * - "active": business writes are applied. The corresponding Python cron
 * must be OFF (cutover).
 *
 * Source of truth: env var `AUDIT_MODE` (`shadow` | `active`),
 * default `shadow` (security). Watchdog cutover = (1) switch
 * `AUDIT_MODE=active` ou (2) au cas par cas via override env var
 * `AUDIT_MODE_<KEY>=active` (ex: `AUDIT_MODE_AC_BLOG_HYGIENE=active`)
 * for progressive ramps without affecting other watchdogs.
 *
 * Watchdogs marked "strict" (audit-only — schema-watch, sitemap-watch,
 * synedre-watch, matomo-watch, dictionary-watch) ignorent ce mode :
 * they never perform business writes, their output is always
 * en `cs_audit_reports`.
 */

export type AuditMode = 'shadow' | 'active'

function readMode(value: string | undefined): AuditMode | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'active' || v === 'on' || v === '1') return 'active'
  if (v === 'shadow' || v === 'off' || v === '0' || v === 'dry-run') return 'shadow'
  return null
}

/**
 * Returns the audit mode for a given watchdog.
 *
 * Order of precedence:
 *   1. AUDIT_MODE_<AUTOMATE_KEY_UPPER> (override par-Vigie)
 *   2. AUDIT_MODE                       (global)
 * 3. 'shadow' (security default)
 *
 * @param automateKey clé de l'automate (ex: 'ac_blog_hygiene'). Optionnel.
 * If provided, the per-watchdog override is consulted.
 */
export function getAuditMode(automateKey?: string): AuditMode {
  if (automateKey) {
    const overrideKey = `AUDIT_MODE_${automateKey.toUpperCase()}`
    const override = readMode(process.env[overrideKey])
    if (override !== null) return override
  }
  const global = readMode(process.env.AUDIT_MODE)
  if (global !== null) return global
  return 'shadow'
}

export function isShadow(automateKey?: string): boolean {
  return getAuditMode(automateKey) === 'shadow'
}

export function isActive(automateKey?: string): boolean {
  return getAuditMode(automateKey) === 'active'
}
