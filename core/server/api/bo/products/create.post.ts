/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/products/create
 * Minimal product creation in direct DB (ps_product + ps_product_shop +
 * ps_product_lang + ps_category_product + ps_stock_available).
 * Policy « Zero PrestaShop webservice » 2026-04-22.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'

function slugify(s: string): string {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { clientId, ...data } = body || {}
  if (!data.name) throw createError({ statusCode: 400, message: 'name requis' })

  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  const categoryId = Number(data.categoryId || 2)
  const taxRulesGroupId = Number(data.taxRulesGroupId || 1)
  const active = data.active !== false ? 1 : 0
  const price = Number(data.price || 0)
  const weight = Number(data.weight || 0)
  const reference = String(data.reference || '')
  const name = String(data.name || '')
  const description = String(data.description || '')
  const descriptionShort = String(data.descriptionShort || '')
  const slug = slugify(name)

  try {
    const { insertId } = await db.run(
      `INSERT INTO ps_product
          (id_category_default, id_tax_rules_group, id_shop_default, reference, price,
           weight, active, state, visibility, indexed, date_add, date_upd)
       VALUES (?, ?, 1, ?, ?, ?, ?, 1, 'both', 0, NOW(), NOW())`,
      [categoryId, taxRulesGroupId, reference, price, weight, active],
    )
    const productId = Number(insertId)

    await db.run(
      `INSERT INTO ps_product_shop
          (id_product, id_shop, id_category_default, id_tax_rules_group, price, active,
           visibility, indexed, date_add, date_upd)
       VALUES (?, 1, ?, ?, ?, ?, 'both', 0, NOW(), NOW())`,
      [productId, categoryId, taxRulesGroupId, price, active],
    )

    await db.run(
      `INSERT INTO ps_product_lang
          (id_product, id_shop, id_lang, description, description_short, link_rewrite,
           name, meta_description, meta_title, available_now, available_later)
       VALUES (?, 1, 1, ?, ?, ?, ?, '', ?, '', '')`,
      [productId, description, descriptionShort, slug, name, name],
    )

    // Attache à la catégorie
    await db.run(
      `INSERT IGNORE INTO ps_category_product (id_category, id_product, position)
       VALUES (?, ?, 0)`,
      [categoryId, productId],
    )

    // Stock init à 0 (ou quantity si fourni)
    const initQty = Number(data.quantity || 0)
    await db.run(
      `INSERT INTO ps_stock_available
          (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
           physical_quantity, usable_quantity, depends_on_stock, out_of_stock, location)
       VALUES (?, 0, 1, 0, ?, ?, ?, 0, 2, '')`,
      [productId, initQty, initQty, initQty],
    )

    return { id: productId }
  } catch (err: any) {
    console.error('[bo/products/create] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Impossible de créer le produit' })
  }
})
