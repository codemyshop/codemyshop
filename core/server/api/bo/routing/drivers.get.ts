/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listDrivers } from '~/modules/routing/server/utils/routing'

/** GET /api/bo/routing/drivers — list of active drivers. */
export default defineEventHandler(async (event) => {
  const drivers = await listDrivers({ event })
  return { ok: true, drivers }
})
