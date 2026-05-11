

import { listDrivers } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const drivers = await listDrivers({ event })
  return { ok: true, drivers }
})
