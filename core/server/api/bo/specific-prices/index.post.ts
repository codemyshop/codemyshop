

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

const FROM_SENTINEL = '1970-01-01 00:00:00'
const TO_SENTINEL   = '9999-12-31 23:59:59'

interface Body {
  mode: 'product' | 'category'
  idProduct?: number
  idCategory?: number
  reduction: number
  reductionType: 'percentage' | 'amount'
  reductionTax?: 0 | 1
  fromQuantity?: number
  idGroup?: number
  dateFrom?: string | null
  dateTo?: string | null
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const body = await readBody<Body>(event)

  if (!body || !body.mode) {
    throw createError({ statusCode: 400, statusMessage: 'mode requis (product|category)' })
  }
  if (!Number.isFinite(body.reduction) || body.reduction <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'reduction doit être > 0' })
  }
  if (body.reductionType !== 'percentage' && body.reductionType !== 'amount') {
    throw createError({ statusCode: 400, statusMessage: 'reductionType invalide' })
  }
  if (body.reductionType === 'percentage' && body.reduction >= 1) {
    throw createError({ statusCode: 400, statusMessage: 'reduction % doit être < 1 (ex: 0.20 = 20%)' })
  }

  const reductionTax  = body.reductionTax === 0 ? 0 : 1
  const fromQuantity  = Math.max(Number(body.fromQuantity) || 1, 1)
  const idGroup       = Math.max(Number(body.idGroup) || 0, 0)
  const dateFrom      = body.dateFrom ? body.dateFrom : FROM_SENTINEL
  const dateTo        = body.dateTo   ? body.dateTo   : TO_SENTINEL

  const db = useClientDb(event)

  if (body.mode === 'product') {
    const idProduct = Number(body.idProduct)
    if (!Number.isFinite(idProduct) || idProduct <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'idProduct requis' })
    }
    const exists = await db.get<{ id_product: number }>(
      `SELECT id_product FROM ps_product WHERE id_product = ? AND active = 1 LIMIT 1`,
      [idProduct],
    )
    if (!exists) throw createError({ statusCode: 404, statusMessage: 'Produit introuvable ou inactif' })

    const res = await db.run(
      `INSERT INTO ps_specific_price (
         id_specific_price_rule, id_cart, id_product, id_shop, id_shop_group,
         id_currency, id_country, id_group, id_customer, id_product_attribute,
         price, from_quantity, reduction, reduction_tax, reduction_type,
         \`from\`, \`to\`
       ) VALUES (0, 0, ?, 1, 0, 0, 0, ?, 0, 0, -1, ?, ?, ?, ?, ?, ?)`,
      [idProduct, idGroup, fromQuantity, body.reduction, reductionTax, body.reductionType, dateFrom, dateTo],
    )
    return { ok: true, created: 1, ids: res.insertId ? [res.insertId] : [] }
  }

  
  const idCategory = Number(body.idCategory)
  if (!Number.isFinite(idCategory) || idCategory <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'idCategory requis' })
  }

  
  const targets = await db.query<{ id_product: number }>(
    `WITH RECURSIVE cat_tree AS (
       SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
       UNION ALL
       SELECT c.id_category FROM ps_category c
        INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
        WHERE c.active = 1
     )
     SELECT DISTINCT p.id_product
       FROM cat_tree t
       JOIN ps_category_product cp ON cp.id_category = t.id_category
       JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
    [idCategory],
  )
  if (!targets.length) {
    return { ok: true, created: 0, ids: [], message: 'Aucun produit actif dans la catégorie' }
  }

  let created = 0
  const ids: number[] = []
  for (const t of targets) {
    const res = await db.run(
      `INSERT INTO ps_specific_price (
         id_specific_price_rule, id_cart, id_product, id_shop, id_shop_group,
         id_currency, id_country, id_group, id_customer, id_product_attribute,
         price, from_quantity, reduction, reduction_tax, reduction_type,
         \`from\`, \`to\`
       ) VALUES (0, 0, ?, 1, 0, 0, 0, ?, 0, 0, -1, ?, ?, ?, ?, ?, ?)`,
      [Number(t.id_product), idGroup, fromQuantity, body.reduction, reductionTax, body.reductionType, dateFrom, dateTo],
    )
    if (res.insertId) ids.push(res.insertId)
    created++
  }

  return { ok: true, created, ids, idCategory }
})
