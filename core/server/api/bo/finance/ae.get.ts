

import {
  getAeSaturation,
  getUrssafYearSummary,
  listAeClients,
} from '~/internal/aetracker/server/utils/aetracker'

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
