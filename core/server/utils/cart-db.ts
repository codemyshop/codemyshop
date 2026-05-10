/**
 *
 * CRUD helpers for `ps_cart` and `ps_cart_product` with direct DB access (principle: 'Zero PrestaShop webservice'
 * 2026-04-22). Used by all endpoints
 * `/api/cart/*` to avoid duplication.
 *
 * Scope: cart read and write, without complex tax calculation
 * (`PS Cart::getOrderTotal` is ~1000 lines of VAT/promo/carrier rules).
 * Returns raw ex-tax total directly from `ps_product_shop.price`, tax is
 * left to the frontend (`useB2bVisibility`), which applies +20% in B2C.
 *
 * Targets PostgreSQL `cs_main` (effort #44 MariaDB removal).
 */
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
  /** Pills produit (parité ProductCard.vue) — drawer + /panier doivent montrer
   * the same business information as the catalog card (3kg / bucket / W320). */
  format?: string
  packaging?: string
  caliber?: string
  /** Price per kg, ex-tax (raw + FR-formatted) — displayed prominently in the cart.
   * Derived from `Net weight` (× `Units per parcel` if > 1) or fall back to p.weight. */
  pricePerKgHT?: number
  pricePerKgFormatted?: string
  /** Effective VAT rate (e.g., 5.5, 20). Used to build "VAT at X%, that is for
   * N parcels: Y € before tax" without hardcoding the tax rate on the front-end. */
  taxRate?: number
  /** Package ex-tax price before discount (= base price). Only present if a
   * when active, `ps_specific_price` reduces the price. */
  priceHTBeforeDiscount?: number
  /** Price per kg before discount, FR-formatted. */
  pricePerKgFormattedBeforeDiscount?: string
  /** Label badge promo ("-20%" / "-2,50 €"). */
  reductionLabel?: string
  /** Short suffix to display after unit price (per kg, per L, per unit).
   * DB-first derived (cf. unity-label.deriveUnitPricing). */
  unitLabel?: string
}

const fmtEurFr = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

/** Parse '3kg' / '500g' / '1.5 KG' → kilograms. Aligned with `by-category.get.ts`. */
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
  /** Subtotal before discount (ex-tax). Always = sum of line items `priceHT` × `qty`. */
  subtotalHT: number
  /** Subtotal before discount (inc-tax). */
  subtotalTTC: number
  /** Total after discount (ex-tax). `subtotalHT` - `discountHT`. */
  totalHT: number
  /** Total after discount (inc-tax). `subtotalTTC` - `discountTTC`. */
  totalTTC: number
  totalTax: number
  shippingCost: number
  carrierId: number | null
  discountCode?: string
  discountHT?: number
  discountTTC?: number
}

/**
 * Resolves effective VAT rates for a list of products in a country
 * given (defaults to France `id_country=8`). Returns `Map(id_product → rate%)`.
 * If `ps_tax_rule` has no entry for the country → rate 0 (B2B ex-tax fallback).
 *
 * If `postcode` is provided and matches a Corsican postal range defined in
 * `cs_corsetva`, the target rate (e.g., 2.1%) is applied instead of the
 * default rate of the related `tax_rules_group`. See `tax-corsetva.ts`.
 */
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

/** Lit un cart complet depuis la DB (cart header + items + discounts + TVA). */
export async function getCartFromDb(cartId: number, ctx: CartContext = {}): Promise<CartDataRow | null> {
  const d = usePocPg()
  const cart = firstOf<any>(await d.execute(sql`
    SELECT id_cart, id_customer, id_carrier FROM cs_main.ps_cart WHERE id_cart = ${cartId} LIMIT 1
  `))
  if (!cart) return null

  // Sub-select product features (Packaging / Size / Units per package /
  // Net weight) — populates the pills and per-kg price calculation. Same approach
  // as `core/server/api/catalogue/by-category.get.ts` (same as the product card).
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

  // VAT resolution via `ps_tax_rules_group` → `ps_tax_rule` → `ps_tax` (cart country).
  // For MVP: country = France (`id_country=8`) or the shipping address country
  // of the cart if set. For B2B: tax often 0 (export/B2B) → `priceTTC` = `priceHT`.
  // Postcode also retrieved: used to apply the Corsican VAT override (see
  // `tax-corsetva.ts`) — postal code 20xxx (Corsica) + protected `tax_rules_group` → 2.1%.
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

  // Applied discount (only 1 supported for MVP, the most recent)
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
    // Product discount (`ps_specific_price`) — applied before VAT and before
    // global `cart_rule` discount. Ensures the `cart_rule` total remains consistent.
    const sp = specificPrices.get(productId)
    const priceHT = applySpecificPrice(basePriceHT, sp)
    const hasPromo = sp !== undefined && priceHT < basePriceHT
    const rate = taxRates.get(productId) ?? 0
    const priceTTC = priceHT * (1 + rate / 100)

    // `Format` / `pricePerKg` — same derivation as `by-category.get.ts` so that
    // the cart display exactly matches the catalog product card.
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
    // Source unique DB-First (cf. unity-label.ts) — multipack → HT/U,
    // else `unit_price_ratio` + `unity`, else fallback to weight. The divisor is
    // reused to calculate the unit price before discount.
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

  // Corsican VAT detection applied: FR shipping address (`id_country=8`)
  // + postcode starting with '20' (South Corsica + Upper Corsica). Used for
  // banner "TVA Corse appliquée — 2.1%" displayed on `/panier` and `/commander`.
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

/** Last non-empty cart of a customer that hasn't yet been converted to an order. */
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

/** Create a new cart. */
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

/** UPSERT an item in the cart (add or increment). */
export async function addToCartInDb(
  cartId: number,
  productId: number,
  quantity: number,
  comboId: number,
  _ctx: CartContext = {},
): Promise<void> {
  const d = usePocPg()
  // PrestaShop unique key on `ps_cart_product`: (`id_cart`, `id_product`, `id_product_attribute`, `id_customization`, `id_address_delivery`)
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

/** Set the exact quantity of an item. */
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

/** Remove an item from the cart. */
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

/** Apply a promo code (`cart_rule`) to the cart. Returns true if accepted.
 * Also validates:
 * - time window (`date_from`/`date_to`)
 *   - group restrictions (ps_cart_rule_group ∩ ps_customer_group)
 *   - country restrictions (ps_cart_rule_country ∩ address delivery country)
 */
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

  // Garde-fou quantity_per_user : on compte combien de fois le customer a
  // déjà utilisé ce cart_rule via `ps_order_cart_rule`. Cicatrice 2026-05-07
  // la 1ère commande pouvait être ré-appliqué sur N commandes suivantes.
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

/** Retire le code promo du cart. */
export async function removeCouponFromCart(cartId: number, _ctx: CartContext = {}): Promise<void> {
  await usePocPg().execute(sql`DELETE FROM cs_main.ps_cart_cart_rule WHERE id_cart = ${cartId}`)
}
