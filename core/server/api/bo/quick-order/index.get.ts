

import { listQuickOrderLists } from '~/modules/quickorder/server/utils/quickorder'

export default defineEventHandler(async (event) => {
  const lists = await listQuickOrderLists({ event })
  return { ok: true, lists }
})
