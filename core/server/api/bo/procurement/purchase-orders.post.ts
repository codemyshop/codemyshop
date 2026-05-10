/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/procurement/purchase-orders — purchase order creation.
 * Body: {
 *   idSupplier: number,
 *   deliveryDate?: string (YYYY-MM-DD),
 *   lines: [{ idProduct, quantity, unitPriceTE?, taxRate? }]
 * }
 *
 * Creates ps_supply_order + ps_supply_order_detail[] + ps_supply_order_history (initial state 1).
 * Auto-provisions a default warehouse if none exists.
 * Totals recalculated on the server side (never from the client).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const idSupplier = Number(body?.idSupplier || 0)
  const deliveryDate: string | null = body?.deliveryDate || null
  const lines = Array.isArray(body?.lines) ? body.lines : []

  if (!idSupplier) throw createError({ statusCode: 422, statusMessage: 'Fournisseur obligatoire' })
  if (!lines.length) throw createError({ statusCode: 422, statusMessage: 'Au moins une ligne requise' })

  const db = useClientDb(event)

  try {
    const supplier = await db.get<any>(`SELECT id_supplier, name FROM ps_supplier WHERE id_supplier = ? LIMIT 1`, [idSupplier])
    if (!supplier) throw createError({ statusCode: 404, statusMessage: 'Fournisseur introuvable' })

    // 1. Warehouse par défaut (auto-provision si nécessaire)
    const idWarehouse = await ensureDefaultWarehouse(db)

    // 2. Normalise les lignes + récupère prix fournisseur / références
    const cleanedLines: any[] = []
    for (const raw of lines) {
      const idProduct = Number(raw?.idProduct || 0)
      const quantity = Math.max(1, Number(raw?.quantity || 0))
      if (!idProduct || !quantity) continue

      const prod = await db.get<any>(`
        SELECT
          p.id_product, p.reference,
          pl.name,
          COALESCE(ps.product_supplier_price_te, p.wholesale_price, 0) AS defaultPrice,
          COALESCE(ps.product_supplier_reference, '') AS supplierRef,
          COALESCE(t.rate, 0) AS taxRate
        FROM ps_product p
        JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
        LEFT JOIN ps_product_supplier ps
          ON ps.id_product = p.id_product AND ps.id_supplier = ? AND ps.id_product_attribute = 0
        LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = p.id_tax_rules_group
        LEFT JOIN ps_tax t ON t.id_tax = tr.id_tax AND t.active = 1
        WHERE p.id_product = ?
        LIMIT 1
      `, [idSupplier, idProduct])

      if (!prod) continue

      const unitPriceTE = raw.unitPriceTE !== undefined && raw.unitPriceTE !== null
        ? Number(raw.unitPriceTE)
        : Number(prod.defaultPrice || 0)
      const taxRate = raw.taxRate !== undefined && raw.taxRate !== null
        ? Number(raw.taxRate)
        : Number(prod.taxRate || 0)

      cleanedLines.push({
        idProduct,
        reference: prod.reference || '',
        supplierRef: prod.supplierRef || '',
        name: prod.name || '',
        quantity, unitPriceTE, taxRate,
      })
    }

    if (!cleanedLines.length) throw createError({ statusCode: 422, statusMessage: 'Aucune ligne valide' })

    // 3. Totaux
    let totalTE = 0
    let totalTax = 0
    for (const l of cleanedLines) {
      const lineTE = l.quantity * l.unitPriceTE
      const lineTax = lineTE * (l.taxRate / 100)
      totalTE += lineTE
      totalTax += lineTax
    }
    const totalTI = totalTE + totalTax

    // 4. ps_supply_order
    const ref = `SUP${Date.now().toString().slice(-8)}`
    const ins = await db.run(`
      INSERT INTO ps_supply_order
        (id_supplier, supplier_name, id_lang, id_warehouse,
         id_supply_order_state, id_currency, id_ref_currency,
         reference, date_add, date_upd, date_delivery_expected,
         total_te, total_with_discount_te, total_tax, total_ti,
         discount_rate, discount_value_te, is_template)
      VALUES (?, ?, 1, ?, 1, 1, 1, ?, NOW(), NOW(), ?, ?, ?, ?, ?, 0, 0, 0)
    `, [idSupplier, supplier.name, idWarehouse, ref, deliveryDate || null,
        totalTE, totalTE, totalTax, totalTI])

    const newId = ins.insertId
    if (!newId) throw createError({ statusCode: 500, statusMessage: 'Échec création' })

    // 5. ps_supply_order_detail (une ligne par produit)
    for (const l of cleanedLines) {
      const priceTE = l.quantity * l.unitPriceTE
      const taxValue = priceTE * (l.taxRate / 100)
      const priceTI = priceTE + taxValue
      await db.run(`
        INSERT INTO ps_supply_order_detail
          (id_supply_order, id_currency, id_product, id_product_attribute,
           reference, supplier_reference, name, exchange_rate,
           unit_price_te, quantity_expected, quantity_received,
           price_te, discount_rate, discount_value_te, price_with_discount_te,
           tax_rate, tax_value, price_ti, tax_value_with_order_discount, price_with_order_discount_te)
        VALUES (?, 1, ?, 0, ?, ?, ?, 1,
                ?, ?, 0, ?, 0, 0, ?, ?, ?, ?, 0, ?)
      `, [newId, l.idProduct, l.reference, l.supplierRef, l.name,
          l.unitPriceTE, l.quantity, priceTE, priceTE, l.taxRate, taxValue, priceTI, priceTE])
    }

    // 6. ps_supply_order_history (état initial)
    await db.run(`
      INSERT INTO ps_supply_order_history
        (id_supply_order, id_employee, employee_lastname, employee_firstname, id_state, date_add)
      VALUES (?, 0, 'Hub', 'AC', 1, NOW())
    `, [newId])

    return { ok: true, id: newId, reference: ref }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/purchase-orders POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB : ' + (err?.message || '') })
  }
})

/**
 * Retrieves (or creates) a default warehouse. PS requires id_warehouse
 * on ps_supply_order — silently provisioned if absent.
 */
async function ensureDefaultWarehouse(db: any): Promise<number> {
  const existing = await db.get<any>(`SELECT id_warehouse FROM ps_warehouse WHERE deleted = 0 ORDER BY id_warehouse ASC LIMIT 1`)
  if (existing?.id_warehouse) return Number(existing.id_warehouse)

  // Besoin d'une adresse pour le warehouse
  const addrIns = await db.run(`
    INSERT INTO ps_address
      (id_country, id_warehouse, alias, lastname, firstname, address1, postcode, city,
       phone, date_add, date_upd, active, deleted)
    VALUES (8, 0, 'warehouse', 'Stock', 'Principal', '—', '00000', '—', '', NOW(), NOW(), 1, 0)
  `)
  const idAddress = addrIns.insertId

  const whIns = await db.run(`
    INSERT INTO ps_warehouse
      (id_currency, id_address, id_employee, reference, name, management_type, deleted)
    VALUES (1, ?, 1, 'MAIN', 'Stock principal', 'WA', 0)
  `, [idAddress])
  const idWarehouse = whIns.insertId

  // Update ps_address.id_warehouse maintenant qu'on a l'id
  await db.run(`UPDATE ps_address SET id_warehouse = ? WHERE id_address = ?`, [idWarehouse, idAddress])

  // Lien shop
  await db.run(`INSERT IGNORE INTO ps_warehouse_shop (id_shop, id_warehouse) VALUES (1, ?)`, [idWarehouse])

  return idWarehouse
}
