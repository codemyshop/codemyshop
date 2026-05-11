

import { getBotStats7d } from '~/enterprise/data/telemetry/server/utils/telemetry'

export default defineEventHandler(async (event) => {
  return await getBotStats7d({ event })
})
