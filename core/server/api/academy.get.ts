

import { getAllModulesAsync } from '~/server/utils/academy-content'

export default defineEventHandler(async () => {
  return await getAllModulesAsync()
})
