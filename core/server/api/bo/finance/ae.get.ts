/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  getAeSaturation,
  getUrssafYearSummary,
  listAeClients,
} from '~/internal/aetracker/server/utils/aetracker'

/**
 * GET /api/bo/finance/ae — Aggregate dashboard for freelance accounts.
 *
 * Retourne :
 * - saturation: capacity ceiling gauge 77,700 €/year (revenue YTD + projected + slots)
 *   - clients    : portefeuille AE actif/paused/ended
 * - social-security: current year summary (declared, due, paid, months overdue)
 *
 * Doctrine : documentation/legal/STRATEGY_DUAL_STRUCTURE_AE_SASU.md
 */
export default defineEventHandler(async (event) => {
  try {
    const [saturation, clients] = await Promise.all([
      getAeSaturation({ event }),
      listAeClients({ event }),
    ])
    const urssaf = await getUrssafYearSummary(saturation.year, { event })
    return { saturation, clients, urssaf }
  } catch (err: any) {
    console.error('[bo/finance/ae] DB error:', err?.message)
    return {
      saturation: null,
      clients: [],
      urssaf: null,
      error: err?.message || 'unknown',
    }
  }
})
