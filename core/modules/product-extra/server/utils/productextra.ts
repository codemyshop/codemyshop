/**
 *
 * ac_productextra facade — phase B2 project #38, PS AJAX eviction.
 *
 * Surface :
 *  - listProducts(input)              ← ajaxgetproducts
 *  - getFormData()                    ← ajaxgetformdata
 *  - queueAiGeneration(input)         ← ajaxqueueaigeneration
 *  - getAiQueueStatus(idQueue)        ← ajaxgetaistatus
 *  - saveProduct(input)               ← ajaxsaveproduct
 *
 * Cible : `ac_postgres` / schema `cs_main` (cutover chantier #44).
 * id_lang fixed to 1 (FR) — primary_ac and tenants have only one active language.
 * id_shop fixed to 1 — no multi-shop in the ecosystem.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface Ctx {
  event?: any
  clientId?: string
}

function db(_ctx: Ctx = {}) {
  return usePocPg()
}

const DEFAULT_LANG = 1
const DEFAULT_SHOP = 1

// ──────────────────────────────────────────────────────────────
// listProducts ← ajaxgetproducts
// ──────────────────────────────────────────────────────────────

export interface ProductListItem {
  id_product: number
  name: string | null
  reference: string | null
  price: string
  active: number
  quantity: number
  id_image: number | null
  category_name: string | null
  img_url: string
}

export interface ProductListResult {
  products: ProductListItem[]
  total: number
  limit: number
  offset: number
}

export async function listProducts(
  input: { limit?: number; offset?: number; baseLink?: string },
  ctx: Ctx = {},
): Promise<ProductListResult> {
  const limit = Math.max(1, Math.min(200, Number(input.limit) || 100))
  const offset = Math.max(0, Number(input.offset) || 0)

  const rowsRes = await db(ctx).execute<any>(sql`
    SELECT
      p.id_product,
      pl.name,
      p.reference,
      p.price,
      p.active,
      sa.quantity,
      img.id_image,
      cl.name AS category_name
    FROM cs_main.ps_product p
    LEFT JOIN cs_main.ps_product_lang pl
      ON pl.id_product = p.id_product
     AND pl.id_lang = ${DEFAULT_LANG}
     AND pl.id_shop = ${DEFAULT_SHOP}
    LEFT JOIN cs_main.ps_stock_available sa
      ON sa.id_product = p.id_product
     AND sa.id_product_attribute = 0
     AND sa.id_shop = ${DEFAULT_SHOP}
    LEFT JOIN cs_main.ps_image img
      ON img.id_product = p.id_product AND img.cover = 1
    LEFT JOIN cs_main.ps_category_lang cl
      ON cl.id_category = p.id_category_default
     AND cl.id_lang = ${DEFAULT_LANG}
     AND cl.id_shop = ${DEFAULT_SHOP}
    ORDER BY p.id_product DESC
    LIMIT ${limit} OFFSET ${offset}
  `)
  const rows = (rowsRes as any[]) || []

  const totalRes = await db(ctx).execute<any>(sql`
    SELECT COUNT(*) AS total FROM cs_main.ps_product
  `)
  const total = Number((totalRes as any[])[0]?.total || 0)

  const baseLink = input.baseLink || ''

  const products: ProductListItem[] = rows.map((r) => {
    let imgUrl = ''
    if (r.id_image) {
      const id = Number(r.id_image)
      const imgDir = String(id).split('').join('/')
      imgUrl = `${baseLink}img/p/${imgDir}/${id}-home_default.jpg`
    }
    return {
      id_product: Number(r.id_product),
      name: r.name,
      reference: r.reference,
      price: String(r.price ?? '0'),
      active: Number(r.active || 0),
      quantity: Number(r.quantity || 0),
      id_image: r.id_image == null ? null : Number(r.id_image),
      category_name: r.category_name,
      img_url: imgUrl,
    }
  })

  return { products, total, limit, offset }
}

// ──────────────────────────────────────────────────────────────
// getFormData ← ajaxgetformdata
// ──────────────────────────────────────────────────────────────

export interface FormDataCategory {
  id_category: number
  name: string
  level: number
}

export interface FormDataManufacturer {
  id_manufacturer: number
  name: string
}

export interface FormDataTaxRule {
  id_tax_rules_group: number
  name: string
}

export interface FormDataResult {
  categories: FormDataCategory[]
  manufacturers: FormDataManufacturer[]
  tax_rules: FormDataTaxRule[]
}

export async function getFormData(ctx: Ctx = {}): Promise<FormDataResult> {
  const d = db(ctx)

  // Catégories aplaties (avec indentation par niveau)
  let catRes = await d.execute<any>(sql`
    SELECT c.id_category, cl.name, c.level_depth
    FROM cs_main.ps_category c
    INNER JOIN cs_main.ps_category_lang cl
      ON cl.id_category = c.id_category
     AND cl.id_lang = ${DEFAULT_LANG}
     AND cl.id_shop = ${DEFAULT_SHOP}
    WHERE c.active = 1 AND c.id_category > 1
    GROUP BY c.id_category, cl.name, c.level_depth
    ORDER BY c.level_depth ASC, cl.name ASC
  `)
  let catRows = (catRes as any[]) || []

  // Fallback sans id_shop (PS mono-shop ou config partielle)
  if (!catRows.length) {
    catRes = await d.execute<any>(sql`
      SELECT c.id_category, cl.name, c.level_depth
      FROM cs_main.ps_category c
      INNER JOIN cs_main.ps_category_lang cl
        ON cl.id_category = c.id_category
       AND cl.id_lang = ${DEFAULT_LANG}
      WHERE c.active = 1 AND c.id_category > 1
      GROUP BY c.id_category, cl.name, c.level_depth
      ORDER BY c.level_depth ASC, cl.name ASC
    `)
    catRows = (catRes as any[]) || []
  }

  const categories: FormDataCategory[] = catRows.length
    ? catRows.map((r) => {
        const depth = Number(r.level_depth || 1)
        const indent = '— '.repeat(Math.max(0, depth - 1))
        return {
          id_category: Number(r.id_category),
          name: indent + (r.name ?? ''),
          level: depth,
        }
      })
    : [{ id_category: 2, name: 'Accueil', level: 1 }]

  // Marques actives
  const manufRes = await d.execute<any>(sql`
    SELECT id_manufacturer, name
    FROM cs_main.ps_manufacturer
    WHERE active = 1
    ORDER BY name ASC
  `)
  const manufacturers: FormDataManufacturer[] = ((manufRes as any[]) || []).map((r) => ({
    id_manufacturer: Number(r.id_manufacturer),
    name: r.name ?? '',
  }))

  // Groupes de taxes actifs
  const taxRes = await d.execute<any>(sql`
    SELECT id_tax_rules_group, name
    FROM cs_main.ps_tax_rules_group
    WHERE active = 1 AND deleted = 0
    ORDER BY name ASC
  `)
  const tax_rules: FormDataTaxRule[] = ((taxRes as any[]) || []).map((r) => ({
    id_tax_rules_group: Number(r.id_tax_rules_group),
    name: r.name ?? '',
  }))

  return { categories, manufacturers, tax_rules }
}

// ──────────────────────────────────────────────────────────────
// AI queue ← ajaxqueueaigeneration / ajaxgetaistatus
// ──────────────────────────────────────────────────────────────

export interface QueueAiInput {
  product_name: string
  context?: string | null
  id_product?: number
}

export type QueueAiResult =
  | { ok: true; id_queue: number }
  | { ok: false; error: string }

export async function queueAiGeneration(
  input: QueueAiInput,
  ctx: Ctx = {},
): Promise<QueueAiResult> {
  const productName = (input.product_name || '').trim()
  if (!productName) {
    return { ok: false, error: 'Le champ product_name est requis' }
  }
  const d = db(ctx)
  const insRes = await d.execute<{ id_queue: number }>(sql`
    INSERT INTO cs_main.cs_product_ai_queue
      (id_product, product_name, context, status, result_html, error_msg, date_add, date_upd)
    VALUES
      (${Number(input.id_product) || 0}, ${productName},
       ${input.context ?? null}, 'pending', NULL, '', NOW(), NOW())
    RETURNING id_queue
  `)
  const idQueue = Number((insRes as any[])[0]?.id_queue || 0)
  return { ok: true, id_queue: idQueue }
}

export interface AiQueueStatusRow {
  id_queue: number
  status: string
  result_html: string | null
  error_msg: string
}

export async function getAiQueueStatus(
  idQueue: number,
  ctx: Ctx = {},
): Promise<AiQueueStatusRow | null> {
  const result = await db(ctx).execute<any>(sql`
    SELECT id_queue, status, result_html, error_msg
    FROM cs_main.cs_product_ai_queue
    WHERE id_queue = ${idQueue}
    LIMIT 1
  `)
  const row = (result as any[])[0]
  if (!row) return null
  return {
    id_queue: Number(row.id_queue),
    status: row.status,
    result_html: row.result_html,
    error_msg: row.error_msg ?? '',
  }
}

// ──────────────────────────────────────────────────────────────
// saveProduct ← ajaxsaveproduct
// ──────────────────────────────────────────────────────────────

export interface SaveProductInput {
  id_product?: number
  name: string
  reference?: string | null
  id_category_default?: number
  id_manufacturer?: number
  id_tax_rules_group?: number
  price?: number | string
  quantity?: number
  active?: number | boolean
  description_short?: string | null
  description?: string | null
}

export type SaveProductResult =
  | { ok: true; id_product: number; created: boolean }
  | { ok: false; error: string; status: number }

function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function saveProduct(
  input: SaveProductInput,
  ctx: Ctx = {},
): Promise<SaveProductResult> {
  const name = (input.name || '').trim()
  if (!name) return { ok: false, error: 'Le nom du produit est requis', status: 400 }

  const idCategory = Number(input.id_category_default) || 2
  const idTaxGroup = Number(input.id_tax_rules_group) || 0
  const idManufacturer = Number(input.id_manufacturer) || 0
  const reference = String(input.reference ?? '').trim()
  const priceRaw = String(input.price ?? '0').replace(',', '.')
  const price = Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : 0
  const quantity = Number(input.quantity) || 0
  const active = input.active === false || input.active === 0 || input.active === '0' ? 0 : 1
  const descShort = String(input.description_short ?? '')
  const description = String(input.description ?? '')
  const linkRewrite = slugify(name) || `product-${Date.now().toString(36)}`

  const d = db(ctx)
  const idProduct = Number(input.id_product) || 0

  // Récupération des langues actives (write multi-lang comme PHP)
  const langsRes = await d.execute<any>(sql`
    SELECT id_lang FROM cs_main.ps_lang WHERE active = 1
  `)
  const langIds = ((langsRes as any[]) || [])
    .map((r) => Number(r.id_lang))
    .filter((n) => n > 0)
  const targetLangs = langIds.length ? langIds : [DEFAULT_LANG]

  try {
    if (idProduct > 0) {
      // ── UPDATE ───────────────────────────────────────────────
      const checkRes = await d.execute<any>(sql`
        SELECT id_product FROM cs_main.ps_product
        WHERE id_product = ${idProduct} LIMIT 1
      `)
      if (!((checkRes as any[]) || []).length) {
        return { ok: false, error: 'Produit introuvable', status: 404 }
      }
      await d.execute(sql`
        UPDATE cs_main.ps_product
           SET id_category_default = ${idCategory},
               id_tax_rules_group = ${idTaxGroup},
               id_manufacturer = ${idManufacturer},
               reference = ${reference},
               price = ${price},
               active = ${active},
               date_upd = NOW()
         WHERE id_product = ${idProduct}
      `)
      await d.execute(sql`
        UPDATE cs_main.ps_product_shop
           SET id_category_default = ${idCategory},
               id_tax_rules_group = ${idTaxGroup},
               price = ${price},
               active = ${active},
               date_upd = NOW()
         WHERE id_product = ${idProduct} AND id_shop = ${DEFAULT_SHOP}
      `)
      for (const lid of targetLangs) {
        await d.execute(sql`
          INSERT INTO cs_main.ps_product_lang
            (id_product, id_shop, id_lang, name, link_rewrite,
             description, description_short, meta_title, meta_description,
             available_now, available_later)
          VALUES
            (${idProduct}, ${DEFAULT_SHOP}, ${lid}, ${name}, ${linkRewrite},
             ${description}, ${descShort}, ${name}, '', '', '')
          ON CONFLICT (id_product, id_shop, id_lang) DO UPDATE SET
            name = EXCLUDED.name,
            link_rewrite = EXCLUDED.link_rewrite,
            description = EXCLUDED.description,
            description_short = EXCLUDED.description_short,
            meta_title = EXCLUDED.meta_title
        `)
      }
      await d.execute(sql`
        INSERT INTO cs_main.ps_category_product (id_category, id_product, position)
        VALUES (${idCategory}, ${idProduct}, 0)
        ON CONFLICT DO NOTHING
      `)
      await d.execute(sql`
        UPDATE cs_main.ps_stock_available
           SET quantity = ${quantity},
               physical_quantity = ${quantity},
               usable_quantity = ${quantity}
         WHERE id_product = ${idProduct}
           AND id_product_attribute = 0
           AND id_shop = ${DEFAULT_SHOP}
      `)
      return { ok: true, id_product: idProduct, created: false }
    }

    // ── CREATE ────────────────────────────────────────────────
    const insRes = await d.execute<{ id_product: number }>(sql`
      INSERT INTO cs_main.ps_product
        (id_category_default, id_tax_rules_group, id_manufacturer, id_shop_default,
         reference, price, active, state, visibility, indexed,
         condition, date_add, date_upd)
      VALUES
        (${idCategory}, ${idTaxGroup}, ${idManufacturer}, ${DEFAULT_SHOP},
         ${reference}, ${price}, ${active}, 1, 'both', 0,
         'new', NOW(), NOW())
      RETURNING id_product
    `)
    const newId = Number((insRes as any[])[0]?.id_product || 0)
    if (!newId) return { ok: false, error: 'INSERT ps_product KO', status: 500 }

    await d.execute(sql`
      INSERT INTO cs_main.ps_product_shop
        (id_product, id_shop, id_category_default, id_tax_rules_group, id_manufacturer,
         price, active, visibility, indexed, condition, date_add, date_upd)
      VALUES
        (${newId}, ${DEFAULT_SHOP}, ${idCategory}, ${idTaxGroup}, ${idManufacturer},
         ${price}, ${active}, 'both', 0, 'new', NOW(), NOW())
    `)

    for (const lid of targetLangs) {
      await d.execute(sql`
        INSERT INTO cs_main.ps_product_lang
          (id_product, id_shop, id_lang, name, link_rewrite,
           description, description_short, meta_title, meta_description,
           available_now, available_later)
        VALUES
          (${newId}, ${DEFAULT_SHOP}, ${lid}, ${name}, ${linkRewrite},
           ${description}, ${descShort}, ${name}, '', '', '')
      `)
    }

    await d.execute(sql`
      INSERT INTO cs_main.ps_category_product (id_category, id_product, position)
      VALUES (${idCategory}, ${newId}, 0)
      ON CONFLICT DO NOTHING
    `)

    await d.execute(sql`
      INSERT INTO cs_main.ps_stock_available
        (id_product, id_product_attribute, id_shop, id_shop_group,
         quantity, physical_quantity, usable_quantity,
         depends_on_stock, out_of_stock, location)
      VALUES
        (${newId}, 0, ${DEFAULT_SHOP}, 0,
         ${quantity}, ${quantity}, ${quantity},
         0, 2, '')
    `)

    return { ok: true, id_product: newId, created: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erreur sauvegarde produit', status: 500 }
  }
}
