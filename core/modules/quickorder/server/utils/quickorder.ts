/**
 *
 * Quick Order facade — B2B quick order lists (reorder favorites).
 * Sources of truth: `cs_quick_order_list` + `cs_quick_order_line`,
 * owned by ac_quickorder. 100% PostgreSQL runtime (Project #44, schema
 * `cs_main`).
 *
 * Surface :
 * - listQuickOrderLists (backoffice view, all active lists + line count)
 * - getListWithLines (list details + lines with product metadata)
 *  - createListWithItems (insertion + lignes idempotentes ON CONFLICT)
 *  - deleteList (cascade lignes + liste)
 * - cloneOrderItems (retrieves SKU/qty from an existing order for reordering)
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface QuickOrderContext {
  event?: any
  clientId?: string
}

function db(_ctx: QuickOrderContext = {}) {
  return usePocPg()
}

export interface QuickOrderListSummary {
  id: number
  idCustomer: number
  customerName: string | null
  customerEmail: string | null
  name: string
  isDefault: number
  active: number
  dateAdd: Date
  dateUpd: Date
  nbLines: number
}

/**
 * Backoffice view: all active lists, across all clients, with line count.
 * Sorted DESC by date_upd.
 */
export async function listQuickOrderLists(ctx: QuickOrderContext = {}): Promise<QuickOrderListSummary[]> {
  const rows = await db(ctx).execute<any>(sql`
    SELECT
      l.id_list                               AS id,
      l.id_customer                           AS "idCustomer",
      CONCAT(c.firstname, ' ', c.lastname)    AS "customerName",
      c.email                                 AS "customerEmail",
      l.name,
      l.is_default                            AS "isDefault",
      l.active,
      l.date_add                              AS "dateAdd",
      l.date_upd                              AS "dateUpd",
      (SELECT COUNT(*) FROM cs_main.cs_quick_order_line WHERE id_list = l.id_list) AS "nbLines"
    FROM cs_main.cs_quick_order_list l
    LEFT JOIN cs_main.ps_customer c ON c.id_customer = l.id_customer
    WHERE l.active = 1
    ORDER BY l.date_upd DESC
  `)
  return (rows as any[]).map((r) => ({
    id: Number(r.id),
    idCustomer: Number(r.idCustomer),
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    name: r.name,
    isDefault: Number(r.isDefault),
    active: Number(r.active),
    dateAdd: r.dateAdd,
    dateUpd: r.dateUpd,
    nbLines: Number(r.nbLines),
  }))
}

export interface QuickOrderListHeader {
  id: number
  idCustomer: number
  customerName: string | null
  name: string
  isDefault: number
  active: number
}

export interface QuickOrderLineItem {
  id: number
  idProduct: number
  idProductAttribute: number
  quantity: number
  position: number
  reference: string | null
  productName: string | null
  basePrice: number | null
}

/**
 * List details + lines with product metadata (reference, name, base price).
 */
export async function getListWithLines(
  idList: number,
  ctx: QuickOrderContext = {},
): Promise<{ list: QuickOrderListHeader; lines: QuickOrderLineItem[] } | null> {
  const headers = await db(ctx).execute<any>(sql`
    SELECT
      l.id_list                               AS id,
      l.id_customer                           AS "idCustomer",
      CONCAT(c.firstname, ' ', c.lastname)    AS "customerName",
      l.name,
      l.is_default                            AS "isDefault",
      l.active
    FROM cs_main.cs_quick_order_list l
    LEFT JOIN cs_main.ps_customer c ON c.id_customer = l.id_customer
    WHERE l.id_list = ${idList}
    LIMIT 1
  `)
  const headerRow = (headers as any[])[0]
  if (!headerRow) return null

  const lineRows = await db(ctx).execute<any>(sql`
    SELECT
      ln.id_line              AS id,
      ln.id_product           AS "idProduct",
      ln.id_product_attribute AS "idProductAttribute",
      ln.quantity,
      ln.position,
      p.reference             AS reference,
      pl.name                 AS "productName",
      p.price                 AS "basePrice"
    FROM cs_main.cs_quick_order_line ln
    LEFT JOIN cs_main.ps_product      p  ON p.id_product = ln.id_product
    LEFT JOIN cs_main.ps_product_lang pl ON pl.id_product = ln.id_product AND pl.id_lang = 1
    WHERE ln.id_list = ${idList}
    ORDER BY ln.position ASC, ln.id_line ASC
  `)

  return {
    list: {
      id: Number(headerRow.id),
      idCustomer: Number(headerRow.idCustomer),
      customerName: headerRow.customerName,
      name: headerRow.name,
      isDefault: Number(headerRow.isDefault),
      active: Number(headerRow.active),
    },
    lines: (lineRows as any[]).map((r) => ({
      id: Number(r.id),
      idProduct: Number(r.idProduct),
      idProductAttribute: Number(r.idProductAttribute),
      quantity: Number(r.quantity),
      position: Number(r.position),
      reference: r.reference,
      productName: r.productName,
      basePrice: r.basePrice == null ? null : Number(r.basePrice),
    })),
  }
}

export interface CreateListInput {
  idCustomer: number
  name: string
  isDefault?: number
  items?: { idProduct: number; idProductAttribute?: number; quantity: number; position?: number }[]
}

/**
 * Creates a list + its lines. If `isDefault=1`, first disables the other
 * `is_default` for the same client. Idempotent line upserts (UNIQUE list+product+attribute).
 */
export async function createListWithItems(
  input: CreateListInput,
  ctx: QuickOrderContext = {},
): Promise<{ idList: number }> {
  const d = db(ctx)

  if (input.isDefault) {
    await d.execute(sql`
      UPDATE cs_main.cs_quick_order_list SET is_default = 0 WHERE id_customer = ${input.idCustomer}
    `)
  }

  const inserted = await d.execute<{ id_list: number }>(sql`
    INSERT INTO cs_main.cs_quick_order_list (id_customer, name, is_default, active, date_add, date_upd)
    VALUES (${input.idCustomer}, ${input.name}, ${input.isDefault ?? 0}, 1, NOW(), NOW())
    RETURNING id_list
  `)
  const idList = Number((inserted as any[])[0]?.id_list || 0)
  if (!idList) {
    throw new Error('insertion liste échouée')
  }

  if (Array.isArray(input.items) && input.items.length > 0) {
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i]
      if (!it?.idProduct || !(it.quantity > 0)) continue
      const idPa = it.idProductAttribute ?? 0
      const pos = it.position ?? i
      await d.execute(sql`
        INSERT INTO cs_main.cs_quick_order_line
          (id_list, id_product, id_product_attribute, quantity, position, date_add, date_upd)
        VALUES
          (${idList}, ${it.idProduct}, ${idPa}, ${it.quantity}, ${pos}, NOW(), NOW())
        ON CONFLICT (id_list, id_product, id_product_attribute) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          position = EXCLUDED.position,
          date_upd = NOW()
      `)
    }
  }

  return { idList }
}

/**
 * List deletion: cascade lines then list (no FK ON DELETE in the database).
 */
export async function deleteList(idList: number, ctx: QuickOrderContext = {}): Promise<void> {
  const d = db(ctx)
  await d.execute(sql`
    DELETE FROM cs_main.cs_quick_order_line WHERE id_list = ${idList}
  `)
  await d.execute(sql`
    DELETE FROM cs_main.cs_quick_order_list WHERE id_list = ${idList}
  `)
}

export interface OrderHeader {
  id: number
  date: Date
  idCustomer: number
  customerName: string | null
  totalHt: number
}

export interface OrderItemForReorder {
  sku: string
  qty: number
  idProduct: number
  idProductAttribute: number
  productName: string
}

/**
 * Retrieves SKU/qty from an existing order for reordering (clone to /bulk).
 * Source: ps_orders + ps_order_detail (native PS), filtered for non-empty SKU.
 */
export async function cloneOrderItems(
  idOrder: number,
  ctx: QuickOrderContext = {},
): Promise<{ order: OrderHeader; items: OrderItemForReorder[] } | null> {
  const headers = await db(ctx).execute<any>(sql`
    SELECT
      o.id_order                              AS id,
      o.date_add                              AS date,
      o.id_customer                           AS "idCustomer",
      CONCAT(c.firstname, ' ', c.lastname)    AS "customerName",
      o.total_paid_tax_excl                   AS "totalHt"
    FROM cs_main.ps_orders o
    LEFT JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
    WHERE o.id_order = ${idOrder}
    LIMIT 1
  `)
  const headerRow = (headers as any[])[0]
  if (!headerRow) return null

  const lineRows = await db(ctx).execute<any>(sql`
    SELECT
      od.product_reference    AS sku,
      od.product_quantity     AS qty,
      od.product_id           AS "idProduct",
      od.product_attribute_id AS "idProductAttribute",
      od.product_name         AS "productName"
    FROM cs_main.ps_order_detail od
    WHERE od.id_order = ${idOrder}
    ORDER BY od.id_order_detail ASC
  `)
  const items = (lineRows as any[])
    .map((l) => ({
      sku: String(l.sku || ''),
      qty: Number(l.qty || 0),
      idProduct: Number(l.idProduct),
      idProductAttribute: Number(l.idProductAttribute),
      productName: String(l.productName || ''),
    }))
    .filter((i) => i.sku && i.qty > 0)

  return {
    order: {
      id: Number(headerRow.id),
      date: headerRow.date,
      idCustomer: Number(headerRow.idCustomer),
      customerName: headerRow.customerName,
      totalHt: Number(headerRow.totalHt || 0),
    },
    items,
  }
}
