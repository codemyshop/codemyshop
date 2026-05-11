

import { listVehicles } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const vehicles = await listVehicles({ event })
  return { ok: true, vehicles }
})
