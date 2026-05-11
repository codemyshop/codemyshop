

import { randomBytes } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

interface WishlistContext {
  event?: any
  clientId?: string
}

function db(_ctx: WishlistContext = {}) {
  return usePocPg()
}

function rows<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function first<T = any>(result: any): T | null {
  return rows<T>(result)[0] ?? null
}

export const MAX_LIST_NAME = 64
export const MAX_LISTS_PER_CUSTOMER = 20
export const MAX_MESSAGE_LENGTH = 5000

export interface WishlistSummary {
  idWishlist: number
  name: string
  isDefault: boolean
  itemCount: number
  shareToken: string | null
  dateAdd: string
  dateUpd: string
}

export interface WishlistItem {
  idWishlistProduct: number
  idProduct: number
  idProductAttribute: number
  quantity: number
  priority: number
  productName: string
  linkRewrite: string
  basePrice: number
  reference: string
  active: boolean
  idImage: number | null
}

export function sanitizeName(raw: string): string {
  const clean = raw.replace(/<[^>]*>/g, '').trim()
  return clean.slice(0, MAX_LIST_NAME)
}

export function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

export async function assertOwnership(
  idWishlist: number,
  idCustomer: number,
  ctx: WishlistContext = {},
): Promise<boolean> {
  if (idWishlist <= 0 || idCustomer <= 0) return false
  const row = await db(ctx).execute(sql`
    SELECT id_customer FROM cs_main.ps_wishlist WHERE id_wishlist = ${idWishlist} LIMIT 1
  `).then(first<{ id_customer: number }>).catch(() => null)
  return !!row && Number(row.id_customer) === idCustomer
}

export async function listForCustomer(
  idCustomer: number,
  ctx: WishlistContext = {},
): Promise<WishlistSummary[]> {
  if (idCustomer <= 0) return []
  const result = rows<any>(await db(ctx).execute(sql`
    SELECT
        w.id_wishlist,
        w.name,
        w."default" AS is_default,
        w.date_add,
        w.date_upd,
        (SELECT COUNT(*) FROM cs_main.ps_wishlist_product wp
            WHERE wp.id_wishlist = w.id_wishlist) AS item_count,
        e.share_token
      FROM cs_main.ps_wishlist w
 LEFT JOIN cs_main.cs_wishlist_extra e ON e.id_wishlist = w.id_wishlist
     WHERE w.id_customer = ${idCustomer}
     ORDER BY w."default" DESC, w.date_add ASC
  `))
  return result.map((r): WishlistSummary => ({
    idWishlist: Number(r.id_wishlist),
    name: String(r.name || ''),
    isDefault: Number(r.is_default) === 1,
    itemCount: Number(r.item_count || 0),
    shareToken: r.share_token || null,
    dateAdd: String(r.date_add || ''),
    dateUpd: String(r.date_upd || ''),
  }))
}

export async function itemsForList(
  idWishlist: number,
  idLang: number,
  ctx: WishlistContext = {},
): Promise<WishlistItem[]> {
  if (idWishlist <= 0) return []
  const result = rows<any>(await db(ctx).execute(sql`
    SELECT
        wp.id_wishlist_product,
        wp.id_product,
        wp.id_product_attribute,
        wp.quantity,
        wp.priority,
        pl.name           AS product_name,
        pl.link_rewrite   AS link_rewrite,
        p.price           AS base_price,
        p.reference       AS reference,
        p.active          AS active,
        (SELECT id_image FROM cs_main.ps_image
            WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
      FROM cs_main.ps_wishlist_product wp
      JOIN cs_main.ps_product p ON p.id_product = wp.id_product
 LEFT JOIN cs_main.ps_product_lang pl
        ON pl.id_product = p.id_product AND pl.id_lang = ${idLang}
     WHERE wp.id_wishlist = ${idWishlist}
     ORDER BY wp.priority ASC, wp.id_wishlist_product ASC
  `))
  return result.map((r): WishlistItem => ({
    idWishlistProduct: Number(r.id_wishlist_product),
    idProduct: Number(r.id_product),
    idProductAttribute: Number(r.id_product_attribute || 0),
    quantity: Number(r.quantity || 0),
    priority: Number(r.priority || 0),
    productName: String(r.product_name || ''),
    linkRewrite: String(r.link_rewrite || ''),
    basePrice: Number(r.base_price || 0),
    reference: String(r.reference || ''),
    active: Number(r.active) === 1,
    idImage: r.id_image ? Number(r.id_image) : null,
  }))
}

export async function ensureExtra(idWishlist: number, ctx: WishlistContext = {}): Promise<void> {
  if (idWishlist <= 0) return
  await db(ctx).execute(sql`
    INSERT INTO cs_main.cs_wishlist_extra
        (id_wishlist, share_token, meta_json, date_add, date_upd)
     VALUES (${idWishlist}, NULL, NULL, NOW(), NOW())
     ON CONFLICT (id_wishlist) DO NOTHING
  `)
}

export interface CreateListResult {
  ok: boolean
  idWishlist?: number
  name?: string
  isDefault?: boolean
  error?: string
  status?: number
}

export async function createList(
  idCustomer: number,
  rawName: string,
  ctx: WishlistContext = {},
): Promise<CreateListResult> {
  if (idCustomer <= 0) return { ok: false, status: 422, error: 'id_customer requis' }
  const name = sanitizeName(rawName) || 'Ma liste'
  const d = db(ctx)

  const count = await d.execute(sql`
    SELECT COUNT(*) AS n FROM cs_main.ps_wishlist WHERE id_customer = ${idCustomer}
  `).then(first<{ n: number | string }>)
  const existingCount = Number(count?.n || 0)
  if (existingCount >= MAX_LISTS_PER_CUSTOMER) {
    return {
      ok: false,
      status: 429,
      error: `Limite de ${MAX_LISTS_PER_CUSTOMER} listes atteinte`,
    }
  }

  const isDefault = existingCount === 0
  const token = generateShareToken()
  const ins: any = await d.execute(sql`
    INSERT INTO cs_main.ps_wishlist
        (id_customer, id_shop, id_shop_group, token, name, counter, date_add, date_upd, "default")
     VALUES (${idCustomer}, 1, 1, ${token}, ${name}, 0, NOW(), NOW(), ${isDefault ? 1 : 0})
     RETURNING id_wishlist
  `)
  const idWishlist = Number(ins?.[0]?.id_wishlist ?? 0)
  if (!idWishlist) return { ok: false, status: 500, error: 'INSERT ps_wishlist KO' }

  await ensureExtra(idWishlist, ctx)
  return { ok: true, idWishlist, name, isDefault }
}

export interface UpdateListResult {
  ok: boolean
  updated?: boolean
  error?: string
  status?: number
}

export async function updateList(
  idWishlist: number,
  idCustomer: number,
  body: { name?: string; isDefault?: boolean | null },
  ctx: WishlistContext = {},
): Promise<UpdateListResult> {
  if (!(await assertOwnership(idWishlist, idCustomer, ctx))) {
    return { ok: false, status: 403, error: 'Liste introuvable ou non autorisée' }
  }
  const d = db(ctx)
  const sets: any[] = []

  if (body.name !== undefined) {
    const n = sanitizeName(String(body.name))
    if (n !== '') sets.push(sql`name = ${n}`)
  }
  if (body.isDefault === true) {
    await d.execute(sql`UPDATE cs_main.ps_wishlist SET "default" = 0 WHERE id_customer = ${idCustomer}`)
    sets.push(sql`"default" = 1`)
  } else if (body.isDefault === false) {
    sets.push(sql`"default" = 0`)
  }

  if (!sets.length) return { ok: true, updated: false }

  sets.push(sql`date_upd = NOW()`)
  await d.execute(sql`UPDATE cs_main.ps_wishlist SET ${sql.join(sets, sql`, `)} WHERE id_wishlist = ${idWishlist}`)
  return { ok: true, updated: true }
}

export interface DeleteListResult {
  ok: boolean
  deleted?: boolean
  error?: string
  status?: number
}

export async function deleteList(
  idWishlist: number,
  idCustomer: number,
  ctx: WishlistContext = {},
): Promise<DeleteListResult> {
  if (!(await assertOwnership(idWishlist, idCustomer, ctx))) {
    return { ok: false, status: 403, error: 'Liste introuvable ou non autorisée' }
  }
  const d = db(ctx)
  const wasDefaultRow = await d.execute(sql`
    SELECT "default" AS d FROM cs_main.ps_wishlist WHERE id_wishlist = ${idWishlist} LIMIT 1
  `).then(first<{ d: number }>)
  const wasDefault = Number(wasDefaultRow?.d) === 1

  await d.execute(sql`DELETE FROM cs_main.ps_wishlist_product   WHERE id_wishlist = ${idWishlist}`)
  await d.execute(sql`DELETE FROM cs_main.cs_wishlist_extra WHERE id_wishlist = ${idWishlist}`)
  await d.execute(sql`DELETE FROM cs_main.ps_wishlist           WHERE id_wishlist = ${idWishlist}`)

  if (wasDefault) {
    
    await d.execute(sql`
      UPDATE cs_main.ps_wishlist
         SET "default" = 1
       WHERE id_wishlist = (
         SELECT id_wishlist FROM cs_main.ps_wishlist
          WHERE id_customer = ${idCustomer}
          ORDER BY date_add ASC
          LIMIT 1
       )
    `)
  }
  return { ok: true, deleted: true }
}

export interface AddItemResult {
  ok: boolean
  added?: boolean
  incremented?: boolean
  idWishlistProduct?: number
  error?: string
  status?: number
}

export async function addItem(
  idWishlist: number,
  idCustomer: number,
  idProduct: number,
  idAttribute: number,
  quantity: number,
  ctx: WishlistContext = {},
): Promise<AddItemResult> {
  if (!(await assertOwnership(idWishlist, idCustomer, ctx))) {
    return { ok: false, status: 403, error: 'Liste introuvable ou non autorisée' }
  }
  if (idProduct <= 0) return { ok: false, status: 422, error: 'id_product requis' }
  const qty = Math.max(1, Number(quantity || 1))
  const d = db(ctx)

  const existing = await d.execute(sql`
    SELECT id_wishlist_product FROM cs_main.ps_wishlist_product
     WHERE id_wishlist = ${idWishlist}
       AND id_product = ${idProduct}
       AND id_product_attribute = ${idAttribute}
     LIMIT 1
  `).then(first<{ id_wishlist_product: number }>)

  if (existing) {
    await d.execute(sql`
      UPDATE cs_main.ps_wishlist_product
         SET quantity = quantity + ${qty}
       WHERE id_wishlist = ${idWishlist}
         AND id_product = ${idProduct}
         AND id_product_attribute = ${idAttribute}
    `)
    await d.execute(sql`UPDATE cs_main.ps_wishlist SET date_upd = NOW() WHERE id_wishlist = ${idWishlist}`)
    return { ok: true, added: false, incremented: true, idWishlistProduct: Number(existing.id_wishlist_product) }
  }

  const maxRow = await d.execute(sql`
    SELECT COALESCE(MAX(priority), 0) AS m FROM cs_main.ps_wishlist_product
     WHERE id_wishlist = ${idWishlist}
  `).then(first<{ m: number | string }>)
  const nextPriority = Number(maxRow?.m || 0) + 1

  const ins: any = await d.execute(sql`
    INSERT INTO cs_main.ps_wishlist_product
        (id_wishlist, id_product, id_product_attribute, quantity, priority)
     VALUES (${idWishlist}, ${idProduct}, ${idAttribute}, ${qty}, ${nextPriority})
     RETURNING id_wishlist_product
  `)
  const newId = Number(ins?.[0]?.id_wishlist_product ?? 0)
  if (!newId) return { ok: false, status: 500, error: 'INSERT ps_wishlist_product KO' }

  await d.execute(sql`UPDATE cs_main.ps_wishlist SET date_upd = NOW() WHERE id_wishlist = ${idWishlist}`)
  return { ok: true, added: true, idWishlistProduct: newId }
}

export interface RemoveItemResult {
  ok: boolean
  removed?: boolean
  error?: string
  status?: number
}

export async function removeItem(
  idWishlist: number,
  idCustomer: number,
  idProduct: number,
  idAttribute: number,
  ctx: WishlistContext = {},
): Promise<RemoveItemResult> {
  if (!(await assertOwnership(idWishlist, idCustomer, ctx))) {
    return { ok: false, status: 403, error: 'Liste introuvable ou non autorisée' }
  }
  if (idProduct <= 0) return { ok: false, status: 422, error: 'id_product requis' }
  const d = db(ctx)
  await d.execute(sql`
    DELETE FROM cs_main.ps_wishlist_product
     WHERE id_wishlist = ${idWishlist}
       AND id_product = ${idProduct}
       AND id_product_attribute = ${idAttribute}
  `)
  await d.execute(sql`UPDATE cs_main.ps_wishlist SET date_upd = NOW() WHERE id_wishlist = ${idWishlist}`)
  return { ok: true, removed: true }
}

export interface WishlistOwnerInfo {
  firstname: string
  lastname: string
  email: string
  name: string
}

export async function fetchListOwner(
  idWishlist: number,
  ctx: WishlistContext = {},
): Promise<WishlistOwnerInfo | null> {
  const row = await db(ctx).execute(sql`
    SELECT w.name, c.firstname, c.lastname, c.email
      FROM cs_main.ps_wishlist w
      JOIN cs_main.ps_customer c ON c.id_customer = w.id_customer
     WHERE w.id_wishlist = ${idWishlist}
     LIMIT 1
  `).then(first<any>)
  if (!row) return null
  return {
    firstname: String(row.firstname || ''),
    lastname: String(row.lastname || ''),
    email: String(row.email || ''),
    name: String(row.name || ''),
  }
}
