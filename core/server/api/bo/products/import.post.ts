

import { useClientDb } from '~/server/utils/db'

interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    reference?: string
    ean13?: string
    name?: string
    priceHT?: string
    stock?: string
    categoryName?: string
  }
  createMissing?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.reference && !mapping.ean13) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : reference ou ean13' })
  }

  const db = useClientDb(event)
  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  
  
  
  const defaultCat = await db.get<any>(
    `SELECT id_category_default AS cat FROM ps_product ORDER BY id_product LIMIT 1`
  )
  const fallbackCategory = Number(defaultCat?.cat) || 2

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const reference = pick(mapping.reference)
    const ean13 = pick(mapping.ean13)
    const name = pick(mapping.name)
    const priceHT = pick(mapping.priceHT)
    const stock = pick(mapping.stock)

    
    let existingId: number | null = null
    try {
      if (reference && String(reference).trim()) {
        const r = await db.get<any>(
          `SELECT id_product FROM ps_product WHERE reference = ? AND reference != '' LIMIT 1`,
          [String(reference).trim()]
        )
        if (r?.id_product) existingId = Number(r.id_product)
      }
      if (!existingId && ean13 && String(ean13).trim()) {
        const r = await db.get<any>(
          `SELECT id_product FROM ps_product WHERE ean13 = ? AND ean13 != '' LIMIT 1`,
          [String(ean13).trim()]
        )
        if (r?.id_product) existingId = Number(r.id_product)
      }
    } catch (err: any) {
      stats.errors.push({ row: i + 1, reason: `match failed: ${err.message || String(err)}` })
      continue
    }

    if (existingId) {
      
      try {
        
        const pf: string[] = []
        const pp: any[] = []
        if (reference !== undefined) { pf.push('reference = ?'); pp.push(String(reference).trim()) }
        if (ean13 !== undefined) { pf.push('ean13 = ?'); pp.push(String(ean13).trim()) }
        if (priceHT !== undefined && priceHT !== '' && !Number.isNaN(Number(priceHT))) {
          pf.push('price = ?'); pp.push(Number(priceHT))
        }
        if (pf.length) {
          pf.push('date_upd = NOW()')
          await db.run(`UPDATE ps_product SET ${pf.join(', ')} WHERE id_product = ?`, [...pp, existingId])
          await db.run(`UPDATE ps_product_shop SET ${pf.join(', ')} WHERE id_product = ?`, [...pp, existingId]).catch(() => {})
        }
        
        if (name !== undefined && String(name).trim()) {
          await db.run(
            `UPDATE ps_product_lang SET name = ? WHERE id_product = ? AND id_lang = 1`,
            [String(name).trim(), existingId]
          )
        }
        
        if (stock !== undefined && stock !== '' && !Number.isNaN(Number(stock))) {
          await db.run(
            `UPDATE ps_stock_available SET quantity = ? WHERE id_product = ? AND id_product_attribute = 0`,
            [Number(stock), existingId]
          )
        }
        stats.updated++
      } catch (err: any) {
        stats.errors.push({ row: i + 1, reason: `update failed: ${err.message || String(err)}` })
      }
    } else if (body.createMissing) {
      
      
      
      
      
      if (!name || !String(name).trim()) {
        stats.skipped++
        stats.errors.push({ row: i + 1, reason: 'name required for create' })
        continue
      }
      try {
        const price = Number(priceHT) || 0
        const qty = Number(stock) || 0
        const ref = reference !== undefined ? String(reference).trim() : ''
        const ean = ean13 !== undefined ? String(ean13).trim() : ''

        const insertProd = await db.run(`
          INSERT INTO ps_product
            (id_supplier, id_manufacturer, id_category_default, id_shop_default,
             id_tax_rules_group, on_sale, online_only, ean13, isbn, upc, mpn,
             ecotax, quantity, minimal_quantity, low_stock_alert, price, wholesale_price,
             unity, unit_price_ratio, additional_shipping_cost, reference, supplier_reference,
             location, width, height, depth, weight, out_of_stock, additional_delivery_times,
             quantity_discount, customizable, uploadable_files, text_fields, active,
             redirect_type, id_type_redirected, available_for_order, show_condition,
             condition, show_price, indexed, visibility, cache_is_pack, cache_has_attachments,
             is_virtual, cache_default_attribute, date_add, date_upd,
             advanced_stock_management, pack_stock_type, state)
          VALUES
            (0, 0, ?, 1,
             0, 0, 0, ?, '', '', '',
             0, 0, 1, 0, ?, 0,
             '', 0, 0, ?, '',
             '', 0, 0, 0, 0, 2, 1,
             0, 0, 0, 0, 1,
             '', 0, 1, 0,
             'new', 1, 0, 'both', 0, 0,
             0, 0, NOW(), NOW(),
             0, 3, 1)
        `, [fallbackCategory, ean, price, ref]) as any

        const newId = Number(insertProd?.insertId || insertProd?.lastInsertId || 0)
        if (!newId) throw new Error('id_product introuvable après INSERT')

        
        await db.run(`
          INSERT INTO ps_product_shop
            (id_product, id_shop, id_category_default, id_tax_rules_group, on_sale,
             online_only, ecotax, minimal_quantity, low_stock_alert, price,
             wholesale_price, unity, unit_price_ratio, additional_shipping_cost,
             customizable, uploadable_files, text_fields, active, redirect_type,
             id_type_redirected, available_for_order, show_condition, condition,
             show_price, indexed, visibility, cache_default_attribute, advanced_stock_management,
             date_add, date_upd, pack_stock_type)
          VALUES
            (?, 1, ?, 0, 0,
             0, 0, 1, 0, ?,
             0, '', 0, 0,
             0, 0, 0, 1, '',
             0, 1, 0, 'new',
             1, 0, 'both', 0, 0,
             NOW(), NOW(), 3)
        `, [newId, fallbackCategory, price])

        
        const slug = slugify(String(name))
        await db.run(`
          INSERT INTO ps_product_lang
            (id_product, id_shop, id_lang, description, description_short, link_rewrite,
             meta_description, meta_title, name, available_now, available_later,
             delivery_in_stock, delivery_out_stock)
          VALUES
            (?, 1, 1, '', '', ?, '', '', ?, '', '', '', '')
        `, [newId, slug, String(name).trim()])

        
        await db.run(`
          INSERT INTO ps_stock_available
            (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
             physical_quantity, reserved_quantity, depends_on_stock, out_of_stock, location)
          VALUES
            (?, 0, 1, 0, ?, ?, 0, 0, 2, '')
        `, [newId, qty, qty])

        
        await db.run(
          `INSERT IGNORE INTO ps_category_product (id_category, id_product, position) VALUES (?, ?, 0)`,
          [fallbackCategory, newId]
        )

        stats.created++
      } catch (err: any) {
        stats.errors.push({ row: i + 1, reason: `create failed: ${err.message || String(err)}` })
      }
    } else {
      stats.skipped++
    }
  }

  return { success: true, stats }
})

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'produit'
}
