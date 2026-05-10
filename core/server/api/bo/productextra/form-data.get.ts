/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/productextra/form-data
 * Remplace ac_productextra/ajaxgetformdata (chantier #38 Phase B2).
 *
 * Returns: categories (flattened tree with indent), manufacturers, tax_rules.
 */
import { getFormData } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const data = await getFormData({ event })
  return { success: true, ...data }
})
