/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** GET /api/bo/products/:id — full product details via direct DB.
 *
 * Sprint 12 — multilang: `?lang=X` selects the row.
 * `ps_product_lang` (localized fields). Non-localized tables
 * (ps_product, ps_stock_available, ps_image, etc.) are unchanged.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const product = await db.get<any>(`
    SELECT
      p.id_product AS id, pl.name, pl.description, pl.description_short AS descriptionShort,
      pl.link_rewrite AS slug, pl.meta_title AS metaTitle, pl.meta_description AS metaDescription,
      pl.delivery_in_stock AS deliveryInStock, pl.delivery_out_stock AS deliveryOutStock,
      p.reference, p.ean13, p.isbn, p.upc,
      ROUND(p.price, 6) AS priceHT, p.wholesale_price AS wholesalePrice,
      p.additional_shipping_cost AS additionalShippingCost,
      p.unity, p.unit_price_ratio AS unitPriceRatio,
      p.id_category_default AS categoryId,
      COALESCE(cl.name, '') AS categoryName,
      p.id_tax_rules_group AS taxRulesGroupId,
      p.active, p.available_for_order AS availableForOrder,
      p.show_price AS showPrice, p.online_only AS onlineOnly,
      p.condition, p.weight, p.width, p.height, p.depth,
      p.quantity_discount AS quantityDiscount,
      p.redirect_type AS redirectType,
      p.date_add AS dateAdd, p.date_upd AS dateUpd,
      COALESCE(sa.quantity, 0) AS stock,
      COALESCE(m.name, '') AS manufacturerName, p.id_manufacturer AS manufacturerId
    FROM ps_product p
    LEFT JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ? AND pl.id_shop = 1
    LEFT JOIN ps_category_lang cl ON cl.id_category = p.id_category_default AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
    LEFT JOIN ps_manufacturer m ON m.id_manufacturer = p.id_manufacturer
    WHERE p.id_product = ?
  `, [langId, langId, Number(id)])

  if (!product) throw createError({ statusCode: 404, message: 'Produit introuvable' })

  // Features
  const features = await db.query<any>(`
    SELECT fl.name AS featureName, fvl.value AS featureValue
    FROM ps_feature_product fp
    JOIN ps_feature_lang fl ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
    JOIN ps_feature_value_lang fvl ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
    WHERE fp.id_product = ?
    ORDER BY fl.name
  `, [langId, langId, Number(id)])

  // Images
  const images = await db.query<any>(`
    SELECT id_image AS id, cover, position
    FROM ps_image WHERE id_product = ? ORDER BY position
  `, [Number(id)])

  // Catégories associées
  const categories = await db.query<any>(`
    SELECT cp.id_category AS id, cl.name
    FROM ps_category_product cp
    JOIN ps_category_lang cl ON cl.id_category = cp.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    WHERE cp.id_product = ?
    ORDER BY cl.name
  `, [langId, Number(id)])

  // Specific prices
  const specificPrices = await db.query<any>(`
    SELECT id_specific_price AS id, id_customer AS customerId, id_group AS groupId,
           ROUND(reduction, 4) AS reduction, reduction_type AS reductionType,
           from_quantity AS fromQuantity, \`from\` AS dateFrom, \`to\` AS dateTo
    FROM ps_specific_price WHERE id_product = ?
    ORDER BY from_quantity
  `, [Number(id)])

  // Déclinaisons (combinaisons) — ps_product_attribute + stock + attributs liés
  const combinations = await db.query<any>(`
    SELECT
      pa.id_product_attribute AS id,
      pa.reference,
      pa.supplier_reference AS supplierReference,
      pa.ean13,
      ROUND(pa.price, 6) AS priceImpact,
      ROUND(pa.wholesale_price, 6) AS wholesalePrice,
      ROUND(pa.unit_price_impact, 6) AS unitPriceImpact,
      ROUND(pa.weight, 6) AS weight,
      pa.default_on AS defaultOn,
      pa.minimal_quantity AS minimalQuantity,
      COALESCE(sa.quantity, 0) AS quantity
    FROM ps_product_attribute pa
    LEFT JOIN ps_stock_available sa
      ON sa.id_product = pa.id_product
     AND sa.id_product_attribute = pa.id_product_attribute
    WHERE pa.id_product = ?
    ORDER BY pa.id_product_attribute
  `, [Number(id)])

  if (combinations.length) {
    const paIds = combinations.map((c: any) => c.id)
    const placeholders = paIds.map(() => '?').join(',')
    const links = await db.query<any>(`
      SELECT pac.id_product_attribute AS paId, pac.id_attribute AS attributeId,
             a.id_attribute_group AS groupId, al.name
      FROM ps_product_attribute_combination pac
      JOIN ps_attribute a ON a.id_attribute = pac.id_attribute
      LEFT JOIN ps_attribute_lang al
        ON al.id_attribute = pac.id_attribute AND al.id_lang = ?
      WHERE pac.id_product_attribute IN (${placeholders})
    `, [langId, ...paIds])

    const byPa = new Map<number, any[]>()
    for (const l of links) {
      if (!byPa.has(l.paId)) byPa.set(l.paId, [])
      byPa.get(l.paId)!.push({ attributeId: l.attributeId, groupId: l.groupId, name: l.name })
    }
    for (const c of combinations) {
      c.attributes = byPa.get(c.id) || []
    }
  } else {
    for (const c of combinations) c.attributes = []
  }

  // Règles de taxe (toutes celles actives — multi-tenant).
  // Strict PG : toutes les colonnes non-agrégées du SELECT/ORDER BY doivent
  // figurer dans le GROUP BY. On agrège t.rate via MAX (1 rate par groupe
  // au plus côté FR/UE — sinon on prend la plus haute, robuste).
  const taxRules = await db.query<any>(`
    SELECT trg.id_tax_rules_group AS id, trg.name AS label, ROUND(MAX(t.rate), 2) AS rate
    FROM ps_tax_rules_group trg
    JOIN ps_tax_rule tr ON tr.id_tax_rules_group = trg.id_tax_rules_group AND tr.id_country = 8
    JOIN ps_tax t ON t.id_tax = tr.id_tax
    WHERE trg.active = 1 AND trg.deleted = 0
    GROUP BY trg.id_tax_rules_group, trg.name
    ORDER BY MAX(t.rate) DESC
  `)

  // Transporteurs associés (id_carrier_reference — stable across versions)
  const carrierRows = await db.query<any>(`
    SELECT id_carrier_reference AS ref
    FROM ps_product_carrier
    WHERE id_product = ?
  `, [Number(id)])
  const carrierRefs = carrierRows.map((r: any) => Number(r.ref)).filter((n: number) => n > 0)

  return { product, features, images, categories, specificPrices, combinations, carrierRefs, taxRules, langId }
})
