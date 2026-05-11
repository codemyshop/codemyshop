

import { listTeamMembers } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const members = await listTeamMembers({ event })
  return { success: true, members }
})
