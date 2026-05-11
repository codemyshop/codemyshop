

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const d = usePocPg()
  const orderId = Number(id)

  const orderRows: any[] = await d.execute(sql`
    SELECT
      o.id_order AS "id", o.reference, o.id_customer AS "customerId",
      o.current_state AS "statusId",
      COALESCE(osl.name, CONCAT('État #', o.current_state)) AS status,
      os.color AS "statusColor",
      o.payment, o.module AS "paymentModule",
      ROUND(o.total_paid_tax_excl::numeric, 2) AS "totalPaidHT",
      ROUND(o.total_paid_tax_incl::numeric, 2) AS "totalPaidTTC",
      ROUND(o.total_shipping_tax_excl::numeric, 2) AS "totalShippingHT",
      ROUND(o.total_shipping_tax_incl::numeric, 2) AS "totalShippingTTC",
      ROUND(o.total_products::numeric, 2) AS "totalProducts",
      ROUND(o.total_products_wt::numeric, 2) AS "totalProductsTTC",
      ROUND(o.total_discounts_tax_incl::numeric, 2) AS "totalDiscounts",
      ROUND(o.total_wrapping_tax_incl::numeric, 2) AS "totalWrapping",
      o.id_address_delivery AS "addressDeliveryId",
      o.id_address_invoice AS "addressInvoiceId",
      o.id_carrier AS "carrierId",
      o.id_cart AS "cartId",
      o.note, o.date_add AS "dateAdd", o.date_upd AS "dateUpd",
      o.invoice_number AS "invoiceNumber",
      o.delivery_number AS "deliveryNumber",
      o.valid
    FROM cs_main.ps_orders o
    LEFT JOIN cs_main.ps_order_state os ON os.id_order_state = o.current_state
    LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
    WHERE o.id_order = ${orderId}
  `) as any[]
  const order = orderRows?.[0]

  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  
  const customerRows: any[] = await d.execute(sql`
    SELECT id_customer AS "id", firstname, lastname, email, company, siret,
           date_add AS "dateAdd", note
    FROM cs_main.ps_customer WHERE id_customer = ${order.customerId}
  `) as any[]
  const customer = customerRows?.[0]

  
  const items: any[] = await d.execute(sql`
    SELECT
      od.id_order_detail AS "id",
      od.product_id AS "productId",
      od.product_attribute_id AS "combinationId",
      od.product_name AS name,
      od.product_reference AS reference,
      od.product_quantity AS quantity,
      ROUND(od.unit_price_tax_excl::numeric, 2) AS "priceHT",
      ROUND(od.unit_price_tax_incl::numeric, 2) AS "priceTTC",
      ROUND(od.total_price_tax_excl::numeric, 2) AS "totalHT",
      ROUND(od.total_price_tax_incl::numeric, 2) AS "totalTTC",
      ROUND(od.reduction_percent::numeric, 2) AS "reductionPercent",
      ROUND(od.reduction_amount_tax_incl::numeric, 2) AS "reductionAmount",
      ROUND(od.original_product_price::numeric, 2) AS "priceHTBeforeDiscount"
    FROM cs_main.ps_order_detail od
    WHERE od.id_order = ${orderId}
    ORDER BY od.id_order_detail
  `) as any[]

  
  const history: any[] = await d.execute(sql`
    SELECT
      oh.id_order_history AS "id",
      oh.id_order_state AS "statusId",
      COALESCE(osl.name, CONCAT('État #', oh.id_order_state)) AS status,
      os.color AS "statusColor",
      oh.date_add AS "dateAdd",
      CONCAT(e.firstname, ' ', e.lastname) AS "employeeName"
    FROM cs_main.ps_order_history oh
    LEFT JOIN cs_main.ps_order_state os ON os.id_order_state = oh.id_order_state
    LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = oh.id_order_state AND osl.id_lang = 1
    LEFT JOIN cs_main.ps_employee e ON e.id_employee = oh.id_employee
    WHERE oh.id_order = ${orderId}
    ORDER BY oh.date_add DESC
  `) as any[]

  
  const [addrDeliveryRows, addrInvoiceRows]: [any[], any[]] = await Promise.all([
    d.execute(sql`
      SELECT a.*, cl.name AS "countryName"
      FROM cs_main.ps_address a
      LEFT JOIN cs_main.ps_country_lang cl ON cl.id_country = a.id_country AND cl.id_lang = 1
      WHERE a.id_address = ${order.addressDeliveryId}
    `) as Promise<any[]>,
    d.execute(sql`
      SELECT a.*, cl.name AS "countryName"
      FROM cs_main.ps_address a
      LEFT JOIN cs_main.ps_country_lang cl ON cl.id_country = a.id_country AND cl.id_lang = 1
      WHERE a.id_address = ${order.addressInvoiceId}
    `) as Promise<any[]>,
  ])
  const addrDelivery = addrDeliveryRows?.[0]
  const addrInvoice = addrInvoiceRows?.[0]

  
  const invoiceRows: any[] = await d.execute(sql`
    SELECT id_order_invoice AS "id", number AS "invoiceNumber"
    FROM cs_main.ps_order_invoice WHERE id_order = ${orderId} AND number > 0 LIMIT 1
  `) as any[]
  const invoice = invoiceRows?.[0]

  return { order, customer, items, history, addrDelivery, addrInvoice, invoice }
})
