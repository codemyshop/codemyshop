/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/task-templates
 * Remplace ac_smartproject/ajaxgettasktemplates (chantier #38 Phase B1.1).
 */
import { listTaskTemplates } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const templates = await listTaskTemplates({ event })
  return { success: true, templates }
})
