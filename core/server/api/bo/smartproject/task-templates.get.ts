

import { listTaskTemplates } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const templates = await listTaskTemplates({ event })
  return { success: true, templates }
})
