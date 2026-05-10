/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/whatsapp-templates
 * Remplace ac_smartproject/ajaxgettemplates (chantier #38 Phase B1.4).
 *
 * id_lang frozen at 1 (FR), aligned with other BO endpoints (carriers, attributes,
 * cms/search, etc.) where the BO is only served in French.
 */
import { listWaTemplates } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const templates = await listWaTemplates({ event })
  return { success: true, templates }
})
