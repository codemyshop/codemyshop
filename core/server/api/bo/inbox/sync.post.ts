/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { runInboxSync } from '~/server/tasks/inbox/sync'

/**
 * POST /api/bo/inbox/sync — triggers an immediate IMAP fetch.
 *
 * Endpoint under /api/bo/* protected upstream by the knock-gate hub
 * (see feedback_hub_knock_gate_pattern.md). No additional auth here:
 * reaching this handler already confirms that the caller has passed the
 * owner-only knock cookie. For a cron-style trigger from the shell
 * (without cookie), we pass through a forwarding script that relays
 * the knock cookie via curl.
 */
export default defineEventHandler(async () => {
  try {
    const result = await runInboxSync()
    return { ok: true, result }
  } catch (err: any) {
    console.error('[bo/inbox/sync] ', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Erreur sync inbox' })
  }
})
