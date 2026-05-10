/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getLegalForProduct } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

/**
 * GET /api/product/:id/legal?lang=N — Legal block resolved (product + active batch FIFO).
 *
 * Resolution:
 *   1) cs_product_food (non-i18n) + cs_product_food_lang (i18n) → valeurs explicites
 * 2) Inheritance from cs_lot (FIFO, non-expired) for origin / caliber if empty
 *
 * Used by invoice / delivery note PDF templates and the front-end product sheet.
 * Retourne { origin, caliber, category, mentions, sources: {...} }.
 */
export default defineEventHandler(async (event) => {
  const idProduct = Number(getRouterParam(event, 'id'))
  const idLang = Number(getQuery(event).lang ?? 1)
  if (!idProduct) throw createError({ statusCode: 400, statusMessage: 'id invalide', data: { code: 'INVALID_PRODUCT_ID' } })

  const { legal, lot } = await getLegalForProduct(idProduct, idLang, { event })

  const origin = legal?.originIso2 || lot?.origin || null
  const caliber = legal?.caliber || lot?.caliber || null

  const sources = {
    origin: legal?.originIso2 ? 'product' : (lot?.origin ? 'lot' : 'none'),
    caliber: legal?.caliber ? 'product' : (lot?.caliber ? 'lot' : 'none'),
    category: legal?.categoryLegal ? 'product' : 'none',
    mentions: legal?.additionalMentions ? 'product' : 'none',
  }

  return {
    ok: true,
    idProduct,
    idLang,
    origin,
    caliber,
    category: legal?.categoryLegal || null,
    mentions: legal?.additionalMentions || null,
    sources,
  }
})
