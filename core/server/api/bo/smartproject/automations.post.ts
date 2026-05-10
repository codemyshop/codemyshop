/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/automations
 * Remplace ac_smartproject/ajaxsaveautomation (upsert + payload action_type, chantier #38 Phase B1.2).
 *
 * Body : { id_ac_smartautomation_rule?, title, trigger_type, action_type, active?,
 *          conditions_json_compiled,
 *          action_email_template? | action_task_title?+action_task_delay? |
 *          action_new_status? | action_whatsapp_template? }
 */
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
