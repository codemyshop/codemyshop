/**
 *
 * Context helpers for Nitro Tasks (infrastructure-level crons vs tenant).
 *
 * Issue 2026-05-05 — mailbox leak affecting tenants: `inbox:sync` was reading
 * the infrastructure mailbox from each tenant via fallback SMTP_USER/SMTP_PASS and
 * was writing emails to the tenant DB. Explicit-allow pattern applied
 * via INBOX_SYNC_ENABLED. This module generalizes the pattern to other crons
 * AC-internal (audit:matomo-watch, audit:dictionary-watch, audit:brand-watch,
 * audit:uptime-monitor, audit:daily-meet, audit:synedre-watch, audit:deps-watch,
 * (audit:factcheck, audit:schema-watch, audit:ssl-watch) — all write
 * reports/state to infrastructure-only tables (cs_audit_reports, cs_uptime_state,
 * cs_brand_watch_term, etc.) which have no reason to pollute the tenant databases.
 *
 * Usage :
 *
 *   import { skipIfNotAcInternal } from '~/server/utils/cron-context'
 *
 *   export default defineTask({
 *     meta: { name: 'audit:foo', description: '...' },
 *     async run() {
 *       const skip = skipIfNotAcInternal('audit:foo')
 *       if (skip) return skip
 * // ... actual logic
 *     }
 *   })
 *
 * Activation: `AC_INTERNAL_CRONS=true` in the infrastructure container's environment. Tenants
 * don't have the flag → all infrastructure-level crons skip silently.
 */

/**
 * Returns a literal object if the cron should be skipped (i.e. we're not
 * on the infrastructure), otherwise `null` (the caller continues normally). Return type `any`
 * intentional — Nitro `defineTask({ run })` infers its shape from the
 * caller; a strict named type breaks the inference of other branches.
 *
 * The explicit-allow > filter by client_id pattern: a tenant that inherits
 * infrastructure credentials will do NOTHING as long as AC_INTERNAL_CRONS is not set,
 * even if technically the connection to the infrastructure mailbox/API/DB works.
 */
export function skipIfNotAcInternal(taskName: string): any | null {
  if (process.env.AC_INTERNAL_CRONS === 'true') return null
  // Pas de log : `audit:uptime-monitor` skip toutes les 3 min = 480 lignes/jour
  // de bruit. Pour debug, set DEBUG_CRON_SKIPS=true.
  if (process.env.DEBUG_CRON_SKIPS === 'true') {
    console.log(`[cron-skip:${taskName}] AC_INTERNAL_CRONS!=true (tenant context)`)
  }
  return {
    skipped: true,
    reason:  'AC_INTERNAL_CRONS not enabled — task is AC-only',
  }
}
