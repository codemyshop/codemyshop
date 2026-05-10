/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/productextra/products
 * Remplace ac_productextra/ajaxsaveproduct (chantier #38 Phase B2).
 *
 * Body : { name, reference?, id_category_default?, id_manufacturer?,
 *          id_tax_rules_group?, price?, quantity?, active?,
 * description_short?, description?, id_product? (update if > 0) }
 *
 * Multi-table : ps_product + ps_product_shop + ps_product_lang × N langs
 * actives + ps_category_product (INSERT IGNORE) + ps_stock_available.
 */
import { saveProduct } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  const result = await saveProduct(body, { event })
  if (!result.ok) {
    return { success: false, error: result.error }
  }
  return {
    success: true,
    id_product: result.id_product,
    message: result.created ? 'Produit créé avec succès' : 'Produit mis à jour',
  }
})
