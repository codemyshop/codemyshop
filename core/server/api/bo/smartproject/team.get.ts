/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/team
 * Remplace ac_smartproject/ajaxgetteam (chantier #38 Phase B1.4).
 */
import { listTeamMembers } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const members = await listTeamMembers({ event })
  return { success: true, members }
})
