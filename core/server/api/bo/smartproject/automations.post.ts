

import { upsertAutomationRule, type UpsertAutomationRuleInput } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<UpsertAutomationRuleInput>(event)
  const session = getSession(event)
  const idOwner = Number(body?.id_owner ?? session?.employeeId ?? 0)
  try {
    const result = await upsertAutomationRule({ ...body, id_owner: idOwner }, { event })
    return { success: true, ...result }
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err?.message || 'Erreur upsert règle' })
  }
})
