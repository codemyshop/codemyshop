/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/marketing/promos/:id — detail of a promo code.
 *
 * Returns the cart rule + the localized name via `?lang=X`.
 * Structural fields (dates, amounts, quantities, %/€) live on
 * ps_cart_rule (non-localized). Only `name` is multilingual
 * (ps_cart_rule_lang) — master/translation semantics.
 *
 * Special case: `id=new` returns an empty skeleton to pre-fill
 * the editor during creation.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  if (id === 'new') {
    const now = new Date()
    const in1y = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
    return {
      rule: {
        id: 0,
        code: '',
        name: '',
        description: '',
        active: 1,
        dateFrom: now.toISOString().slice(0, 10),
        dateTo: in1y.toISOString().slice(0, 10),
        quantity: 100,
        quantityPerUser: 1,
        freeShipping: 0,
        reductionPercent: 0,
        reductionAmount: 0,
        minimumAmount: 0,
        status: 'active',
      },
      langId,
      isNew: true,
    }
  }

  const db = useClientDb(event)

  const rule = await db.get<any>(`
    SELECT
      cr.id_cart_rule AS id,
      cr.code,
      crl.name,
      cr.description,
      cr.active,
      DATE_FORMAT(cr.date_from, '%Y-%m-%dT%H:%i') AS dateFrom,
      DATE_FORMAT(cr.date_to,   '%Y-%m-%dT%H:%i') AS dateTo,
      cr.quantity,
      cr.quantity_per_user AS quantityPerUser,
      cr.free_shipping AS freeShipping,
      cr.reduction_percent AS reductionPercent,
      cr.reduction_amount AS reductionAmount,
      cr.minimum_amount AS minimumAmount,
      cr.id_customer AS customerId,
      cr.priority,
      cr.partial_use AS partialUse,
      cr.highlight,
      CASE
        WHEN cr.active = 0 THEN 'inactive'
        WHEN cr.date_to < NOW() THEN 'expired'
        WHEN cr.quantity = 0 THEN 'exhausted'
        ELSE 'active'
      END AS status
    FROM ps_cart_rule cr
    LEFT JOIN ps_cart_rule_lang crl ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = ?
    WHERE cr.id_cart_rule = ?
  `, [langId, Number(id)])

  if (!rule) throw createError({ statusCode: 404, message: 'Code promo introuvable' })

  return { rule, langId, isNew: false }
})
