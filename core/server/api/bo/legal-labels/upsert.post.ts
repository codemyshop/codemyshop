/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { upsertLegalLang, upsertLegalParent } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

/**
 * POST /api/bo/legal-labels/upsert — Creates or updates legal notices.
 *
 * Body : { idProduct, idLang?, originIso2?, caliber?, categoryLegal?, additionalMentions?, active? }
 * Writes to cs_product_food (non-i18n parent) + cs_product_food_lang (i18n).
 * Null values allowed (enables batch inheritance via FIFO cs_lot).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idProduct: number
    idLang?: number
    originIso2?: string | null
    caliber?: string | null
    categoryLegal?: string | null
    additionalMentions?: string | null
    active?: number
  }>(event)

  if (!body?.idProduct) {
    throw createError({ statusCode: 400, statusMessage: 'idProduct requis' })
  }

  const iso = body.originIso2 ? String(body.originIso2).toUpperCase() : null
  if (iso && !/^[A-Z]{2}$/.test(iso)) {
    throw createError({ statusCode: 400, statusMessage: 'originIso2 doit être un code ISO alpha-2 (2 lettres)' })
  }

  const idLang = body.idLang ?? 1

  await upsertLegalParent(
    {
      idProduct: body.idProduct,
      originIso2: iso,
      caliber: body.caliber || null,
      active: body.active ?? 1,
    },
    { event },
  )

  await upsertLegalLang(
    {
      idProduct: body.idProduct,
      idLang,
      categoryLegal: body.categoryLegal || null,
      additionalMentions: body.additionalMentions || null,
    },
    { event },
  )

  return { ok: true }
})
