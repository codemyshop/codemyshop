

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import type { OrderData, OrderItemData, AddressData } from '~/server/connectors/base'
import {
  applySpecificPrice,
  getActiveSpecificPrices,
} from '~/server/utils/specific-price'
import { deriveUnitPricing } from '~/server/utils/unity-label'

const formatEurFr = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

interface OrdersContext {
  event?: any
  clientId?: string
}

function db(_ctx: OrdersContext = {}) {
  return usePocPg()
}

function rows<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function first<T = any>(result: any): T | null {
  return rows<T>(result)[0] ?? null
}

export type OrderSummary = OrderData
export type OrderItem = OrderItemData

export interface OrderState {
  id: number
  name: string
  color: string
  delivery: boolean
  paid: boolean
  shipped: boolean
}

export interface CarrierSummary {
  id: number
  name: string
  delay: string
  price: number
  freeAbove: number | null
  active: boolean
  
  isFree: boolean
}

async function fetchAddress(addressId: number, ctx: OrdersContext): Promise<AddressData | undefined> {
  if (!addressId) return undefined
  const a = await db(ctx).execute(sql`
    SELECT id_address, id_customer, id_country, alias, company, firstname, lastname,
           address1, address2, postcode, city, phone, vat_number
      FROM cs_main.ps_address WHERE id_address = ${addressId} AND deleted = 0 LIMIT 1
  `).then(first<any>)
  if (!a) return undefined
  return {
    id: Number(a.id_address),
    customerId: Number(a.id_customer || 0),
    alias: String(a.alias || ''),
    company: a.company ? String(a.company) : undefined,
    firstname: String(a.firstname || ''),
    lastname: String(a.lastname || ''),
    address1: String(a.address1 || ''),
    address2: a.address2 ? String(a.address2) : undefined,
    postcode: String(a.postcode || ''),
    city: String(a.city || ''),
    countryId: Number(a.id_country || 0),
    phone: a.phone ? String(a.phone) : undefined,
    vatNumber: a.vat_number ? String(a.vat_number) : undefined,
  }
}

export async function getOrderFromDb(orderId: number, ctx: OrdersContext = {}): Promise<OrderData | null> {
  const order = await db(ctx).execute(sql`
    SELECT o.id_order, o.reference, o.id_customer,
           o.total_paid, o.total_paid_tax_incl, o.total_paid_tax_excl,
           o.total_products, o.total_products_wt,
           o.total_shipping, o.total_shipping_tax_incl, o.total_shipping_tax_excl,
           o.current_state, o.date_add, o.payment, o.invoice_number, o.invoice_date,
           o.id_address_delivery, o.id_address_invoice,
           COALESCE(osl.name, '') AS state_name
      FROM cs_main.ps_orders o
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `).then(first<any>)
  if (!order) return null

  
  
  const items = rows<any>(await db(ctx).execute(sql`
    SELECT od.product_id, od.product_name, od.product_reference, od.product_quantity,
           od.unit_price_tax_excl, od.unit_price_tax_incl,
           od.original_product_price, od.reduction_percent, od.reduction_amount,
           p.unit_price_ratio, p.unity, p.weight
      FROM cs_main.ps_order_detail od
      LEFT JOIN cs_main.ps_product p ON p.id_product = od.product_id
     WHERE od.id_order = ${orderId} ORDER BY od.id_order_detail
  `))

  const [addressDelivery, addressInvoice] = await Promise.all([
    fetchAddress(Number(order.id_address_delivery || 0), ctx),
    fetchAddress(Number(order.id_address_invoice || 0), ctx),
  ])

  return {
    id: Number(order.id_order),
    reference: String(order.reference || ''),
    customerId: Number(order.id_customer || 0),
    status: String(order.state_name || ''),
    statusId: Number(order.current_state || 0),
    payment: String(order.payment || ''),
    totalPaidHT: Number(order.total_paid_tax_excl || 0),
    totalPaidTTC: Number(order.total_paid_tax_incl || order.total_paid || 0),
    totalShipping: Number(order.total_shipping_tax_incl || order.total_shipping || 0),
    totalProducts: Number(order.total_products_wt || order.total_products || 0),
    items: items.map((r: any): OrderItemData => {
      const priceHT = Number(r.unit_price_tax_excl || 0)
      const original = Number(r.original_product_price || 0)
      const hasPromo = original > 0 && original > priceHT + 0.001
      const reductionPercent = Number(r.reduction_percent || 0)
      const reductionAmount = Number(r.reduction_amount || 0)
      let reductionLabel: string | undefined
      if (hasPromo) {
        if (reductionPercent > 0) {
          reductionLabel = `-${Math.round(reductionPercent * 100)}%`
        } else if (reductionAmount > 0) {
          reductionLabel = `-${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(reductionAmount)}`
        } else {
          
          
          const ratio = (original - priceHT) / original
          reductionLabel = `-${Math.round(ratio * 100)}%`
        }
      }
      
      
      const pricing = deriveUnitPricing({
        priceHT,
        unitPriceRatio: r.unit_price_ratio,
        unity: r.unity,
        unitsPerPack: undefined,
        netWeightKg: undefined,
        productWeightKg: Number(r.weight || 0),
      })
      return {
        productId: Number(r.product_id),
        name: String(r.product_name || ''),
        reference: String(r.product_reference || ''),
        quantity: Number(r.product_quantity || 0),
        priceHT,
        priceTTC: Number(r.unit_price_tax_incl || 0),
        priceHTBeforeDiscount: hasPromo ? original : undefined,
        reductionLabel,
        unitLabel:             pricing.unitLabel,
        pricePerUnitFormatted: pricing.pricePerUnit !== undefined ? formatEurFr(pricing.pricePerUnit) : undefined,
      }
    }),
    dateAdd: String(order.date_add || ''),
    addressDelivery,
    addressInvoice,
    invoiceNumber: order.invoice_number ? String(order.invoice_number) : undefined,
    invoiceDate: order.invoice_date && String(order.invoice_date) !== '0000-00-00 00:00:00' ? String(order.invoice_date) : undefined,
  }
}

export async function getOrdersForCustomer(customerId: number, limit: number, ctx: OrdersContext = {}): Promise<OrderData[]> {
  const idRows = rows<any>(await db(ctx).execute(sql`
    SELECT id_order FROM cs_main.ps_orders WHERE id_customer = ${customerId}
     ORDER BY date_add DESC LIMIT ${limit}
  `))
  const orders: OrderData[] = []
  for (const r of idRows) {
    const o = await getOrderFromDb(Number(r.id_order), ctx)
    if (o) orders.push(o)
  }
  return orders
}

export async function getOrderHistoryFromDb(orderId: number, ctx: OrdersContext = {}) {
  return rows<any>(await db(ctx).execute(sql`
    SELECT oh.id_order_history, oh.id_order_state, oh.date_add,
           COALESCE(osl.name, '') AS state_name
      FROM cs_main.ps_order_history oh
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = oh.id_order_state AND osl.id_lang = 1
     WHERE oh.id_order = ${orderId}
     ORDER BY oh.date_add ASC
  `))
}

export async function getOrderStatesFromDb(ctx: OrdersContext = {}): Promise<OrderState[]> {
  const stateRows = rows<any>(await db(ctx).execute(sql`
    SELECT os.id_order_state, os.color, os.delivery, os.paid, os.shipped,
           COALESCE(osl.name, '') AS name
      FROM cs_main.ps_order_state os
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = os.id_order_state AND osl.id_lang = 1
     WHERE os.deleted = 0
     ORDER BY os.id_order_state
  `))
  return stateRows.map((r: any) => ({
    id: Number(r.id_order_state),
    name: String(r.name || ''),
    color: String(r.color || ''),
    delivery: Number(r.delivery) === 1,
    paid: Number(r.paid) === 1,
    shipped: Number(r.shipped) === 1,
  }))
}

export async function getCarriersFromDb(
  idLang = 1,
  filters: { addressId?: number; totalHT?: number; weight?: number } = {},
  ctx: OrdersContext = {},
): Promise<CarrierSummary[]> {
  const d = db(ctx)
  let idZone: number | null = null
  if (filters.addressId) {
    const addr = await d.execute(sql`
      SELECT co.id_zone
        FROM cs_main.ps_address a
        JOIN cs_main.ps_country co ON co.id_country = a.id_country
       WHERE a.id_address = ${filters.addressId} AND a.deleted = 0
       LIMIT 1
    `).then(first<any>)
    idZone = addr?.id_zone ? Number(addr.id_zone) : null
  }

  const carrierRows = rows<any>(await d.execute(sql`
    SELECT c.id_carrier, c.name, c.active, c.is_free, c.shipping_method, c.range_behavior,
           COALESCE(cl.delay, '') AS delay
      FROM cs_main.ps_carrier c
 LEFT JOIN cs_main.ps_carrier_lang cl ON cl.id_carrier = c.id_carrier AND cl.id_lang = ${idLang}
     WHERE c.active = 1 AND c.deleted = 0
     ORDER BY c.position
  `))

  const out: CarrierSummary[] = []
  for (const r of carrierRows) {
    const idCarrier = Number(r.id_carrier)
    const isFree = Number(r.is_free) === 1
    const shippingMethod = Number(r.shipping_method)
    const rangeBehavior = Number(r.range_behavior)

    if (idZone) {
      const zoneOk = await d.execute(sql`
        SELECT 1 AS ok FROM cs_main.ps_carrier_zone WHERE id_carrier = ${idCarrier} AND id_zone = ${idZone} LIMIT 1
      `).then(first<any>)
      if (!zoneOk) continue
    }

    let price = 0
    if (!isFree) {
      const value = shippingMethod === 1 ? Number(filters.weight ?? 0) : Number(filters.totalHT ?? 0)
      const rangeTable = shippingMethod === 1 ? sql.raw('cs_main.ps_range_weight') : sql.raw('cs_main.ps_range_price')
      const rangeFkCol = shippingMethod === 1 ? sql.raw('id_range_weight') : sql.raw('id_range_price')

      let range = await d.execute(sql`
        SELECT ${rangeFkCol} AS id_range, delimiter1, delimiter2
           FROM ${rangeTable}
          WHERE id_carrier = ${idCarrier} AND delimiter1 <= ${value} AND delimiter2 > ${value}
          ORDER BY delimiter1 DESC LIMIT 1
      `).then(first<any>)
      if (!range && rangeBehavior === 0) {
        range = await d.execute(sql`
          SELECT ${rangeFkCol} AS id_range, delimiter1, delimiter2
             FROM ${rangeTable}
            WHERE id_carrier = ${idCarrier}
            ORDER BY delimiter2 DESC LIMIT 1
        `).then(first<any>)
      }
      if (!range) continue

      const delivery = idZone
        ? await d.execute(sql`
            SELECT price FROM cs_main.ps_delivery
              WHERE id_carrier = ${idCarrier} AND ${rangeFkCol} = ${range.id_range} AND id_zone = ${idZone} LIMIT 1
          `).then(first<any>)
        : await d.execute(sql`
            SELECT price FROM cs_main.ps_delivery
              WHERE id_carrier = ${idCarrier} AND ${rangeFkCol} = ${range.id_range} LIMIT 1
          `).then(first<any>)
      if (!delivery) continue
      price = Number(delivery.price)
    }

    out.push({
      id: idCarrier,
      name: String(r.name || ''),
      delay: String(r.delay || ''),
      price,
      freeAbove: null,
      active: true,
      isFree,
    })
  }
  return out
}

export async function createOrderFromCart(
  params: {
    cartId: number
    customerId: number
    addressDeliveryId: number
    addressInvoiceId: number
    carrierId: number
    paymentMethod: string
    currencyId?: number
    langId?: number
  },
  ctx: OrdersContext = {},
): Promise<{ id: number; reference: string } | null> {
  const { cartId, customerId, addressDeliveryId, addressInvoiceId, carrierId, paymentMethod } = params
  const currencyId = params.currencyId || 1
  const langId = params.langId || 1
  const d = db(ctx)

  const items = rows<any>(await d.execute(sql`
    SELECT cp.id_product, cp.id_product_attribute, cp.quantity,
           COALESCE(pl.name, plf.name, '') AS name,
           p.reference,
           ps.price,
           COALESCE(pa.price, 0) AS price_impact
      FROM cs_main.ps_cart_product cp
      JOIN cs_main.ps_product p ON p.id_product = cp.id_product
      JOIN cs_main.ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
 LEFT JOIN cs_main.ps_product_attribute pa ON pa.id_product_attribute = cp.id_product_attribute
 LEFT JOIN cs_main.ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ${langId} AND pl.id_shop = 1
 LEFT JOIN cs_main.ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
     WHERE cp.id_cart = ${cartId}
  `))
  if (!items.length) return null

  
  
  
  const productIds = items.map((it: any) => Number(it.id_product))
  const specificPrices = await getActiveSpecificPrices(productIds, ctx)
  const itemPricing = items.map((r: any) => {
    const basePrice = Number(r.price) + Number(r.price_impact || 0)
    const sp = specificPrices.get(Number(r.id_product))
    const finalPrice = applySpecificPrice(basePrice, sp)
    return { row: r, basePrice, finalPrice, sp }
  })

  const totalProductsHT = itemPricing.reduce((s: number, ip) =>
    s + ip.finalPrice * Number(ip.row.quantity), 0)

  
  let shippingPrice = 0
  if (carrierId) {
    const carriers = await getCarriersFromDb(langId, { addressId: addressDeliveryId, totalHT: totalProductsHT }, ctx)
    const c = carriers.find((cc: any) => cc.id === Number(carrierId))
    if (c) shippingPrice = Number(c.price || 0)
  }

  
  const ruleRows = await d.execute(sql`
    SELECT cr.id_cart_rule, cr.reduction_amount, cr.reduction_percent
       FROM cs_main.ps_cart_cart_rule ccr
       JOIN cs_main.ps_cart_rule cr ON cr.id_cart_rule = ccr.id_cart_rule
      WHERE ccr.id_cart = ${cartId}
  `).then(rows<any>).catch(() => [] as any[])
  const discountAmount = ruleRows.reduce((s: number, r: any) => {
    const fixed = Number(r.reduction_amount || 0)
    const pct = Number(r.reduction_percent || 0)
    return s + (fixed > 0 ? fixed : pct > 0 ? totalProductsHT * (pct / 100) : 0)
  }, 0)

  const totalExclAfterDiscount = Math.max(0, totalProductsHT - discountAmount)
  const totalPaid = totalExclAfterDiscount + shippingPrice

  const reference = 'AC' + Math.random().toString(36).toUpperCase().slice(2, 10)
  const secureKey = Math.random().toString(36).slice(2, 34)

  
  
  
  
  
  
  
  const paymentLow = String(paymentMethod || '').toLowerCase()
  const isBankwire = paymentLow.includes('virement')
  const isSystempay = paymentLow.includes('systempay') || paymentLow.includes('carte bancaire')
  const initialState = isBankwire ? 10 : isSystempay ? 14 : 2

  const insertResult: any = await d.execute(sql`
    INSERT INTO cs_main.ps_orders
        (id_address_delivery, id_address_invoice, id_cart, id_currency, id_lang,
         id_customer, id_carrier, current_state, secure_key, payment, conversion_rate,
         module, reference, recyclable, gift, gift_message, mobile_theme,
         total_discounts, total_discounts_tax_incl, total_discounts_tax_excl,
         total_paid, total_paid_tax_incl, total_paid_tax_excl, total_paid_real,
         total_products, total_products_wt,
         total_shipping, total_shipping_tax_incl, total_shipping_tax_excl,
         carrier_tax_rate, total_wrapping, total_wrapping_tax_incl, total_wrapping_tax_excl,
         round_mode, round_type, invoice_number, delivery_number,
         invoice_date, delivery_date,
         valid, date_add, date_upd)
     VALUES (${addressDeliveryId}, ${addressInvoiceId}, ${cartId}, ${currencyId}, ${langId},
             ${customerId}, ${carrierId || 0}, ${initialState}, ${secureKey}, ${paymentMethod}, 1.0,
             'checkout', ${reference}, 1, 0, '', 0,
             ${discountAmount}, ${discountAmount}, ${discountAmount},
             ${totalPaid}, ${totalPaid}, ${totalExclAfterDiscount}, 0,
             ${totalProductsHT}, ${totalProductsHT},
             ${shippingPrice}, ${shippingPrice}, ${shippingPrice},
             0, 0, 0, 0,
             2, 2, 0, 0,
             NULL, NULL,
             0, NOW(), NOW())
     RETURNING id_order
  `)
  const orderId = Number(insertResult?.[0]?.id_order ?? 0)

  for (const ip of itemPricing) {
    const it = ip.row
    const unit = ip.finalPrice
    const original = ip.basePrice
    const qty = Number(it.quantity)
    
    
    
    
    const reductionPercent = ip.sp?.reductionType === 'percentage' ? Number(ip.sp.reduction) : 0
    const reductionAmount  = ip.sp?.reductionType === 'amount'     ? Number(ip.sp.reduction) : 0
    const reductionUnit    = Math.max(0, original - unit)
    await d.execute(sql`
      INSERT INTO cs_main.ps_order_detail
          (id_order, id_order_invoice, id_warehouse, id_shop, product_id, product_attribute_id,
           product_name, product_quantity, product_quantity_in_stock, product_price,
           product_reference, unit_price_tax_incl, unit_price_tax_excl,
           total_price_tax_incl, total_price_tax_excl,
           original_product_price, reduction_percent, reduction_amount,
           reduction_amount_tax_incl, reduction_amount_tax_excl,
           group_reduction, ecotax, tax_rate, tax_computation_method,
           discount_quantity_applied,
           product_weight, product_ean13, product_isbn, product_upc, product_mpn,
           product_quantity_refunded, product_quantity_return, product_quantity_reinjected)
       VALUES (${orderId}, 0, 0, 1, ${Number(it.id_product)}, ${Number(it.id_product_attribute || 0)},
               ${String(it.name)}, ${qty}, ${qty}, ${unit},
               ${String(it.reference || '')}, ${unit}, ${unit}, ${unit * qty}, ${unit * qty},
               ${original}, ${reductionPercent}, ${reductionAmount},
               ${reductionUnit}, ${reductionUnit},
               0, 0, 0, 0, 0,
               0, '', '', '', '',
               0, 0, 0)
    `)

    
    await d.execute(sql`
      UPDATE cs_main.ps_stock_available
          SET quantity           = quantity - ${qty},
              physical_quantity  = physical_quantity - ${qty}
        WHERE id_product = ${Number(it.id_product)}
          AND id_product_attribute = ${Number(it.id_product_attribute || 0)}
    `)
    
    await d.execute(sql`
      INSERT INTO cs_main.ps_stock_mvt
          (id_stock, id_order, id_supply_order, id_stock_mvt_reason, id_employee,
           employee_lastname, employee_firstname, physical_quantity, sign, date_add,
           price_te, last_wa, current_wa, referer)
       SELECT sa.id_stock_available, ${orderId}, 0, 11, 0, '', '', ${qty}, -1, NOW(), 0, 0, 0, 0
         FROM cs_main.ps_stock_available sa
        WHERE sa.id_product = ${Number(it.id_product)} AND sa.id_product_attribute = ${Number(it.id_product_attribute || 0)}
        LIMIT 1
    `).catch(() => {  })
  }

  await d.execute(sql`
    INSERT INTO cs_main.ps_order_history (id_employee, id_order, id_order_state, date_add)
     VALUES (0, ${orderId}, ${initialState}, NOW())
  `)

  
  
  
  for (const r of ruleRows as any[]) {
    const ruleId = Number(r.id_cart_rule)
    if (!ruleId) continue
    const fixed = Number(r.reduction_amount || 0)
    const pct = Number(r.reduction_percent || 0)
    const ruleAmount = fixed > 0 ? fixed : pct > 0 ? totalProductsHT * (pct / 100) : 0
    
    const nameRow: any[] = await d.execute(sql`
      SELECT COALESCE(crl.name, cr.code, '') AS name
        FROM cs_main.ps_cart_rule cr
        LEFT JOIN cs_main.ps_cart_rule_lang crl
          ON crl.id_cart_rule = cr.id_cart_rule AND crl.id_lang = 1
       WHERE cr.id_cart_rule = ${ruleId} LIMIT 1
    `).catch(() => [] as any[]) as any[]
    const ruleName = String(nameRow?.[0]?.name || '')
    await d.execute(sql`
      INSERT INTO cs_main.ps_order_cart_rule
          (id_order, id_cart_rule, id_order_invoice, name, value, value_tax_excl, free_shipping, deleted)
       VALUES (${orderId}, ${ruleId}, 0, ${ruleName}, ${ruleAmount}, ${ruleAmount}, 0, 0)
    `).catch((err: any) => {
      console.error(`[createOrderFromCart] ps_order_cart_rule insert failed for rule ${ruleId}:`, err?.message || err)
    })
  }

  return { id: orderId, reference }
}
