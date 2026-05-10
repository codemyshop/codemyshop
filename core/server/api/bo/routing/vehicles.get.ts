/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listVehicles } from '~/modules/routing/server/utils/routing'

/** GET /api/bo/routing/vehicles — list of active vehicles. */
export default defineEventHandler(async (event) => {
  const vehicles = await listVehicles({ event })
  return { ok: true, vehicles }
})
