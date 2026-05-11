

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { buildProductImage } from '~/server/utils/ps-image'
import { applyCorseOverride } from '~/server/utils/tax-corsetva'
import {
  applySpecificPrice,
  getActiveSpecificPrices,
  specificPriceLabel,
} from '~/server/utils/specific-price'
import { deriveUnitPricing } from '~/server/utils/unity-label'

interface CartContext {
  event?: any
  clientId?: string
}

function asArray<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function firstOf<T = any>(result: any): T | null {
  return asArray<T>(result)[0] ?? null
}

export interface CartItemRow {
  productId: number
  combinationId: number
  name: string
  reference: string
  quantity: number
  priceHT: number
  priceTTC: number
  image?: string
  

  format?: string
  packaging?: string
  caliber?: string
  

  pricePerKgHT?: number
  pricePerKgFormatted?: string
  

  taxRate?: number
  

  priceHTBeforeDiscount?: number
  
  pricePerKgFormattedBeforeDiscount?: string
  
  reductionLabel?: string
  

  unitLabel?: string
}

const fmtEurFr = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function parseWeightToKg(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).trim().toLowerCase().replace(',', '.').match(/^([\d.]+)\s*(kg|g)$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return m[2] === 'kg' ? n : n / 1000
}

export interface CartDataRow {
  id: number
  customerId: number
  items: CartItemRow[]
  
  subtotalHT: number
  
  subtotalTTC: number
  
  totalHT: number
  
  totalTTC: number
  totalTax: number
  shippingCost: number
  carrierId: number | null
  discountCode?: string
  discountHT?: number
  discountTTC?: number
}

export async function getTaxRatesForProducts(
  productIds: number[],
  countryId = 8,
  _ctx: CartContext = {},
  postcode: string | null = null,
): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  const taxGroups = new Map<number, number>()
  if (!productIds.length) return out
  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  const result = await usePocPg().execute(sql`
    SELECT p.id_product, p.id_tax_rules_group, MAX(t.rate) AS rate
      FROM cs_main.ps_product p
 LEFT JOIN cs_main.ps_tax_rule tr ON tr.id_tax_rules_group = p.id_tax_rules_group AND tr.id_country = ${countryId}
 LEFT JOIN cs_main.ps_tax t ON t.id_tax = tr.id_tax AND t.active = 1
     WHERE p.id_product IN (${ids})
     GROUP BY p.id_product, p.id_tax_rules_group
  `).catch(() => null)
  if (!result) return out
  for (const r of asArray<any>(result)) {
    const pid = Number(r.id_product)
    out.set(pid, Number(r.rate || 0))
    taxGroups.set(pid, Number(r.id_tax_rules_group || 0))
  }
  return applyCorseOverride(out, taxGroups, postcode, countryId)
}

export async function getCartFromDb(cartId: number, ctx: CartContext = {}): Promise<CartDataRow | null> {
  const d = usePocPg()
  const cart = firstOf<any>(await d.execute(sql`
    SELECT id_cart, id_customer, id_carrier FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
  `))
  if (!cart) return null

  
  
  
  const items = asArray<any>(await d.execute(sql`
    SELECT cp.id_product, cp.id_product_attribute, cp.quantity,
           COALESCE(pl.name, plf.name, '')                 AS name,
           COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
           p.reference                                      AS reference,
           p.weight                                         AS "weightKg",
           p.unit_price_ratio                               AS "unitPriceRatio",
           p.unity                                          AS "unity",
           COALESCE(pa.price, 0) + ps.price                AS "priceHT",
           (SELECT id_image FROM cs_main.ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image,
           feat.packaging                                   AS packaging,
           feat.caliber                                     AS caliber,
           feat."unitsPerPack"                              AS "unitsPerPack",
           feat."netWeight"                                 AS "netWeight"
      FROM cs_main.ps_cart_product cp
      JOIN cs_main.ps_product p  ON p.id_product = cp.id_product
      JOIN cs_main.ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
 LEFT JOIN cs_main.ps_product_attribute pa ON pa.id_product_attribute = cp.id_product_attribute AND pa.id_product = p.id_product
 LEFT JOIN cs_main.ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = 1 AND pl.id_shop = 1
 LEFT JOIN cs_main.ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
 LEFT JOIN (
        SELECT fp.id_product,
               MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
               MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
               MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS "unitsPerPack",
               MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS "netWeight"
          FROM cs_main.ps_feature_product fp
          JOIN cs_main.ps_feature_lang fl        ON fl.id_feature        = fp.id_feature        AND fl.id_lang  = 1
          JOIN cs_main.ps_feature_value_lang fvl ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = 1
         WHERE fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
         GROUP BY fp.id_product
      ) feat ON feat.id_product = p.id_product
     WHERE cp.id_cart = ${cartId}
     ORDER BY cp.id_product
  `))

  
  
  
  
  
  const deliveryAddr = await d.execute(sql`
    SELECT a.id_country, a.postcode FROM cs_main.ps_cart c
      LEFT JOIN cs_main.ps_address a ON a.id_address = c.id_address_delivery
     WHERE c.id_cart = ${cartId} LIMIT 1
  `).then(firstOf<{ id_country: number; postcode: string }>).catch(() => null)
  const countryId = Number(deliveryAddr?.id_country || 8)
  const postcode = String(deliveryAddr?.postcode || '')
  const productIds = items.map((r: any) => Number(r.id_product))
  const taxRates = await getTaxRatesForProducts(productIds, countryId, ctx, postcode)
  const specificPrices = await getActiveSpecificPrices(productIds, ctx)

  
  const discountRow = await d.execute(sql`
    SELECT cr.id_cart_rule, cr.code, cr.reduction_percent, cr.reduction_amount, cr.reduction_tax,
           crl.name
      FROM cs_main.ps_cart_cart_rule ccr
      JOIN cs_main.ps_cart_rule cr ON cr.id_cart_rule = ccr.id_cart_rule
 LEFT JOIN cs_main.ps_cart_rule_lang crl ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = 1
     WHERE ccr.id_cart = ${cartId}
       AND cr.date_from <= NOW()
       AND cr.date_to   >= NOW()
     ORDER BY ccr.id_cart_rule DESC
     LIMIT 1
  `).then(firstOf<any>).catch(() => null)

  const mapped: CartItemRow[] = items.map((r: any) => {
    const productId = Number(r.id_product)
    const basePriceHT = Number(r.priceHT || 0)
    
    
    const sp = specificPrices.get(productId)
    const priceHT = applySpecificPrice(basePriceHT, sp)
    const hasPromo = sp !== undefined && priceHT < basePriceHT
    const rate = taxRates.get(productId) ?? 0
    const priceTTC = priceHT * (1 + rate / 100)

    
    
    const unitsRaw = r.unitsPerPack ? Number(r.unitsPerPack) : NaN
    const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined
    const weightKg = Number(r.weightKg || 0)
    let format: string | undefined
    if (unitsPerPack && r.netWeight) format = `${unitsPerPack} × ${r.netWeight}`
    else if (r.netWeight) format = String(r.netWeight)
    else if (weightKg && weightKg > 0) {
      format = weightKg < 1
        ? `${Math.round(weightKg * 1000)}g`
        : `${weightKg.toString().replace('.', ',')}kg`
    }
    const netWeightKg = parseWeightToKg(r.netWeight)
    
    
    
    const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
    const pricing = deriveUnitPricing({
      priceHT,
      unitPriceRatio: r.unitPriceRatio,
      unity: r.unity,
      unitsPerPack,
      netWeightKg: totalNetKg,
      productWeightKg: weightKg,
    })
    const pricePerKgHT = pricing.pricePerUnit
    const pricePerKgHTBeforeDiscount = hasPromo && pricing.divisor && pricing.divisor > 0
      ? basePriceHT / pricing.divisor
      : undefined

    return {
      productId,
      combinationId: Number(r.id_product_attribute || 0),
      name: String(r.name || ''),
      reference: String(r.reference || ''),
      quantity: Number(r.quantity || 0),
      priceHT,
      priceTTC,
      image: buildProductImage(Number(r.id_image), r.link_rewrite)?.src,
      format,
      packaging: r.packaging || undefined,
      caliber: r.caliber || undefined,
      pricePerKgHT,
      pricePerKgFormatted: pricePerKgHT !== undefined ? fmtEurFr(pricePerKgHT) : undefined,
      taxRate: rate || undefined,
      unitLabel: pricing.unitLabel,
      priceHTBeforeDiscount: hasPromo ? basePriceHT : undefined,
      pricePerKgFormattedBeforeDiscount: pricePerKgHTBeforeDiscount !== undefined
        ? fmtEurFr(pricePerKgHTBeforeDiscount)
        : undefined,
      reductionLabel: hasPromo && sp ? specificPriceLabel(sp) : undefined,
    }
  })

  const totalHT = mapped.reduce((s, it) => s + it.priceHT * it.quantity, 0)
  const totalTTC = mapped.reduce((s, it) => s + it.priceTTC * it.quantity, 0)
  let discountHT = 0
  if (discountRow) {
    const pct = Number(discountRow.reduction_percent || 0)
    const flat = Number(discountRow.reduction_amount || 0)
    if (pct > 0) discountHT = totalHT * (pct / 100)
    else if (flat > 0) discountHT = flat
  }
  const taxRatio = totalHT > 0 ? totalTTC / totalHT : 1
  const discountTTC = discountHT * taxRatio
  const totalTax = totalTTC - totalHT

  
  
  
  const appliedCorseTva = countryId === 8 && /^20\d{3}$/.test(postcode.trim())

  return {
    id: Number(cart.id_cart),
    customerId: Number(cart.id_customer || 0),
    items: mapped,
    subtotalHT: totalHT,
    subtotalTTC: totalTTC,
    totalHT: totalHT - discountHT,
    totalTTC: totalTTC - discountTTC,
    totalTax: totalTax - (discountTTC - discountHT),
    shippingCost: 0,
    carrierId: cart.id_carrier ? Number(cart.id_carrier) : null,
    discountCode: discountRow?.code || undefined,
    discountHT: discountHT || undefined,
    discountTTC: discountTTC || undefined,
    appliedCorseTva,
    deliveryPostcode: postcode.trim() || undefined,
  }
}

export async function getLastActiveCartFromDb(customerId: number, ctx: CartContext = {}): Promise<CartDataRow | null> {
  const row = await usePocPg().execute(sql`
    SELECT c.id_cart
      FROM cs_main.ps_cart c
     WHERE c.id_customer = ${customerId}
       AND EXISTS (SELECT 1 FROM cs_main.ps_cart_product cp WHERE cp.id_cart = c.id_cart)
       AND NOT EXISTS (SELECT 1 FROM cs_main.ps_orders o WHERE o.id_cart = c.id_cart)
     ORDER BY c.date_upd DESC
     LIMIT 1
  `).then(firstOf<{ id_cart: number }>)
  return row ? getCartFromDb(Number(row.id_cart), ctx) : null
}

export async function createCartInDb(customerId: number, _ctx: CartContext = {}): Promise<number> {
  const result: any = await usePocPg().execute(sql`
    INSERT INTO cs_main.ps_cart
        (id_shop_group, id_shop, id_carrier, delivery_option, id_lang, id_address_delivery,
         id_address_invoice, id_currency, id_customer, id_guest, secure_key, recyclable, gift,
         gift_message, mobile_theme, allow_seperated_package, date_add, date_upd)
     VALUES (1, 1, 0, '', 1, 0, 0, 1, ${customerId}, 0, '-1', 0, 0, '', 0, 0, NOW(), NOW())
    RETURNING id_cart
  `)
  return Number((result as any[])?.[0]?.id_cart ?? 0)
}

export async function addToCartInDb(
  cartId: number,
  productId: number,
  quantity: number,
  comboId: number,
  _ctx: CartContext = {},
): Promise<void> {
  const d = usePocPg()
  
  await d.execute(sql`
    INSERT INTO cs_main.ps_cart_product
        (id_cart, id_product, id_product_attribute, id_customization, id_address_delivery,
         id_shop, quantity, date_add)
     VALUES (${cartId}, ${productId}, ${comboId || 0}, 0, 0, 1, ${quantity}, NOW())
     ON CONFLICT (id_cart, id_product, id_product_attribute, id_customization, id_address_delivery)
     DO UPDATE SET quantity = cs_main.ps_cart_product.quantity + EXCLUDED.quantity
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)
}

export async function updateCartItemInDb(
  cartId: number,
  productId: number,
  quantity: number,
  comboId: number,
  ctx: CartContext = {},
): Promise<void> {
  if (quantity <= 0) {
    await removeFromCartInDb(cartId, productId, comboId, ctx)
    return
  }
  const d = usePocPg()
  await d.execute(sql`
    UPDATE cs_main.ps_cart_product SET quantity = ${quantity}
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)
}

export async function removeFromCartInDb(
  cartId: number,
  productId: number,
  comboId: number,
  _ctx: CartContext = {},
): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`
    DELETE FROM cs_main.ps_cart_product
     WHERE id_cart = ${cartId} AND id_product = ${productId} AND id_product_attribute = ${comboId || 0}
  `)
  await d.execute(sql`UPDATE cs_main.ps_cart SET date_upd = NOW() WHERE id_cart = ${cartId}`)
}

export async function applyCouponToCart(
  cartId: number,
  code: string,
  _ctx: CartContext = {},
): Promise<{ ok: boolean; error?: string }> {
  const d = usePocPg()
  const rule = await d.execute(sql`
    SELECT id_cart_rule, active, quantity, quantity_per_user, date_from, date_to, minimum_amount
      FROM cs_main.ps_cart_rule
     WHERE code = ${code} AND active = 1
     LIMIT 1
  `).then(firstOf<any>)
  if (!rule) return { ok: false, error: 'Code promo invalide' }
  if (rule.quantity != null && Number(rule.quantity) <= 0) {
    return { ok: false, error: 'Code promo épuisé' }
  }
  const now = new Date()
  if (rule.date_from && rule.date_from !== '0000-00-00 00:00:00' && new Date(rule.date_from) > now) {
    return { ok: false, error: 'Code promo pas encore actif' }
  }
  if (rule.date_to && rule.date_to !== '0000-00-00 00:00:00' && new Date(rule.date_to) < now) {
    return { ok: false, error: 'Code promo expiré' }
  }

  const ruleId = Number(rule.id_cart_rule)

  
  
  
  const perUserLimit = Number(rule.quantity_per_user || 0)
  if (perUserLimit > 0) {
    const cartCust = await d.execute(sql`
      SELECT id_customer FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_customer: number }>)
    const idCustomer = Number(cartCust?.id_customer || 0)
    if (idCustomer > 0) {
      const usedRow = await d.execute(sql`
        SELECT COUNT(*)::int AS n
          FROM cs_main.ps_order_cart_rule ocr
          JOIN cs_main.ps_orders o ON o.id_order = ocr.id_order
         WHERE ocr.id_cart_rule = ${ruleId} AND o.id_customer = ${idCustomer}
      `).then(firstOf<{ n: number }>)
      const used = Number(usedRow?.n || 0)
      if (used >= perUserLimit) {
        return { ok: false, error: `Code promo déjà utilisé ${used > 1 ? used + ' fois' : 'une fois'} — limite ${perUserLimit} par client.` }
      }
    }
  }

  const groupRes = asArray<{ id_group: number }>(await d.execute(sql`
    SELECT id_group FROM cs_main.ps_cart_rule_group WHERE id_cart_rule = ${ruleId}
  `).catch(() => null))
  if (groupRes.length) {
    const cart = await d.execute(sql`
      SELECT id_customer FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_customer: number }>)
    if (!cart?.id_customer) return { ok: false, error: 'Code promo réservé aux clients connectés' }
    const allowed = new Set(groupRes.map((r: any) => Number(r.id_group)))
    const custGroups = asArray<{ id_group: number }>(await d.execute(sql`
      SELECT id_group FROM cs_main.ps_customer_group WHERE id_customer = ${Number(cart.id_customer)}
    `))
    const match = custGroups.some((g: any) => allowed.has(Number(g.id_group)))
    if (!match) return { ok: false, error: 'Code promo non applicable à votre profil' }
  }

  const countryRes = asArray<{ id_country: number }>(await d.execute(sql`
    SELECT id_country FROM cs_main.ps_cart_rule_country WHERE id_cart_rule = ${ruleId}
  `).catch(() => null))
  if (countryRes.length) {
    const addr = await d.execute(sql`
      SELECT a.id_country FROM cs_main.ps_cart c
        JOIN cs_main.ps_address a ON a.id_address = c.id_address_delivery
       WHERE c.id_cart = ${cartId} LIMIT 1
    `).then(firstOf<{ id_country: number }>).catch(() => null)
    const cid = Number(addr?.id_country || 0)
    const allowed = new Set(countryRes.map((r: any) => Number(r.id_country)))
    if (!cid || !allowed.has(cid)) {
      return { ok: false, error: 'Code promo non disponible pour votre pays de livraison' }
    }
  }

  await d.execute(sql`DELETE FROM cs_main.ps_cart_cart_rule WHERE id_cart = ${cartId}`)
  await d.execute(sql`INSERT INTO cs_main.ps_cart_cart_rule (id_cart, id_cart_rule) VALUES (${cartId}, ${ruleId})`)
  return { ok: true }
}

export async function removeCouponFromCart(cartId: number, _ctx: CartContext = {}): Promise<void> {
  await usePocPg().execute(sql`DELETE FROM cs_main.ps_cart_cart_rule WHERE id_cart = ${cartId}`)
}
