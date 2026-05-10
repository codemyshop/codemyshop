/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listCorbieSignals } from '~/internal/corbie/server/utils/corbie'

/**
 * GET /api/corbie/signals
 * Cross-space — returns signals from other spaces.
 * Source of truth: cs_corbie_signals (DB)
 */
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const signals = await listCorbieSignals(cookie, 20)
  return { signals }
})
