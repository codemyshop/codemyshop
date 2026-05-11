

import { listWaTemplates } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const templates = await listWaTemplates({ event })
  return { success: true, templates }
})
