

import { requireRoleOrSaas } from '~/server/utils/session'
import { listRecurringForCron, tableExists } from '~/internal/automates/server/utils/automates'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder'])

  if (!(await tableExists({ event }))) {
    return { crons: [], total: 0 }
  }

  const rows = await listRecurringForCron({ event })
  return { crons: rows, total: rows.length }
})
