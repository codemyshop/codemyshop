/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/automations
 * Remplace ac_smartproject/ajaxgetautomation (chantier #38 Phase B1.2).
 */
import { listAutomationRules } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const automations = await listAutomationRules({ event })
  return { success: true, automations }
})
