/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bot-stats
 * Stats de crawl par bot (derniers 7 jours).
 * Source of truth: cs_bot_hits (DB) — read via Drizzle adapter.
 */
import { getBotStats7d } from '~/enterprise/data/telemetry/server/utils/telemetry'

export default defineEventHandler(async (event) => {
  return await getBotStats7d({ event })
})
