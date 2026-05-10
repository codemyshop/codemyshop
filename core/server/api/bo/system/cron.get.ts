/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireRoleOrSaas } from '~/server/utils/session'
import { listRecurringForCron, tableExists } from '~/internal/automates/server/utils/automates'

/**
 * GET /api/bo/system/cron — viewer for recurring automation tasks.
 *
 * Source: `cs_automates` (kind='recurring', active=1) + last execution
 * from `cs_automate_logs`. Read-only for this V1 — modifying
 * system crontab is not exposed via UI (too sensitive).
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder'])

  if (!(await tableExists({ event }))) {
    return { crons: [], total: 0 }
  }

  const rows = await listRecurringForCron({ event })
  return { crons: rows, total: rows.length }
})
