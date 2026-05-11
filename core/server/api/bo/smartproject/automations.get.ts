

import { listAutomationRules } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const automations = await listAutomationRules({ event })
  return { success: true, automations }
})
