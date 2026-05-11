

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const db = useClientDb(event)

  const cart = await db.get<any>(`
    SELECT ca.id_cart AS id, ca.id_customer AS customerId, ca.id_carrier AS carrierId,
           ca.date_add AS dateAdd, ca.date_upd AS dateUpd,
           CASE WHEN ca.id_customer > 0 THEN CONCAT(c.firstname, ' ', c.lastname) ELSE 'Anonyme' END AS customerName,
           c.email AS customerEmail, c.company AS customerCompany
    FROM ps_cart ca
    LEFT JOIN ps_customer c ON c.id_customer = ca.id_customer
    WHERE ca.id_cart = ?
  `, [Number(id)])
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable' })

  const items = await db.query<any>(`
    SELECT cp.id_product AS productId, cp.id_product_attribute AS combinationId,
           cp.quantity,
           COALESCE(pl.name, CONCAT('Produit #', cp.id_product)) AS productName,
           p.reference, p.price AS priceHT,
           ROUND(p.price * (1 + COALESCE(t.rate, 0) / 100), 2) AS priceTTC
    FROM ps_cart_product cp
    JOIN ps_product p ON p.id_product = cp.id_product
    LEFT JOIN ps_product_lang pl ON pl.id_product = cp.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
    LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = p.id_tax_rules_group AND tr.id_country = 8
    LEFT JOIN ps_tax t ON t.id_tax = tr.id_tax
    WHERE cp.id_cart = ?
    ORDER BY pl.name
  `, [Number(id)])

  const order = await db.get<any>(`
    SELECT id_order AS id, reference, current_state AS statusId,
           ROUND(total_paid_tax_incl, 2) AS totalTTC, date_add AS dateAdd
    FROM ps_orders WHERE id_cart = ? LIMIT 1
  `, [Number(id)])

  return { cart, items, order }
})
