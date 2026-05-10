/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/productextra/products?limit=N&offset=N
 * Remplace ac_productextra/ajaxgetproducts (chantier #38 Phase B2).
 *
 * baseLink derived from NUXT_PUBLIC_PS_FRONT_URL (or env psFrontUrl) to
 * build legacy PS image URLs. Phase E rewire to /img/p Nuxt.
 */
import { listProducts } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const limit = Number(q.limit) || 100
  const offset = Number(q.offset) || 0
  const runtime = useRuntimeConfig(event)
  const baseLink = (runtime.public?.psFrontUrl as string) || ''
  const result = await listProducts({ limit, offset, baseLink: baseLink ? `${baseLink}/` : '' }, { event })
  return { success: true, ...result }
})
