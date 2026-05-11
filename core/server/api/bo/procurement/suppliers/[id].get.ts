

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const db = useClientDb(event)

  try {
    const supplier = await db.get<any>(`
      SELECT
        s.id_supplier AS id, s.name, s.active, s.date_add AS dateAdd, s.date_upd AS dateUpd,
        sl.description,
        a.phone, a.phone_mobile AS phoneMobile,
        a.address1, a.postcode, a.city, a.id_country AS idCountry,
        c.name AS countryName
      FROM ps_supplier s
      LEFT JOIN ps_supplier_lang sl ON sl.id_supplier = s.id_supplier AND sl.id_lang = 1
      LEFT JOIN ps_address a        ON a.id_supplier = s.id_supplier AND a.deleted = 0
      LEFT JOIN ps_country_lang c   ON c.id_country = a.id_country AND c.id_lang = 1
      WHERE s.id_supplier = ?
      LIMIT 1
    `, [id])

    if (!supplier) throw createError({ statusCode: 404, statusMessage: 'Fournisseur introuvable' })

    const products = await db.query<any>(`
      SELECT
        ps.id_product AS id,
        pl.name,
        p.reference,
        ps.product_supplier_reference AS supplierRef,
        ROUND(ps.product_supplier_price_te, 2) AS priceTE,
        COALESCE(sa.quantity, 0) AS stock
      FROM ps_product_supplier ps
      JOIN ps_product p       ON p.id_product = ps.id_product
      JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
      LEFT JOIN ps_stock_available sa
        ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
      WHERE ps.id_supplier = ? AND ps.id_product_attribute = 0
      ORDER BY pl.name ASC
      LIMIT 200
    `, [id])

    const orders = await db.query<any>(`
      SELECT
        po.id_supply_order AS id,
        po.reference,
        po.date_add AS dateAdd,
        po.date_delivery_expected AS deliveryDate,
        ROUND(po.total_ti, 2) AS totalTTC,
        ROUND(po.total_te, 2) AS totalHT,
        COALESCE(sl.name, 'État inconnu') AS stateName
      FROM ps_supply_order po
      LEFT JOIN ps_supply_order_state_lang sl
        ON sl.id_supply_order_state = po.id_supply_order_state AND sl.id_lang = 1
      WHERE po.id_supplier = ? AND po.is_template = 0
      ORDER BY po.date_add DESC
      LIMIT 20
    `, [id])

    return {
      supplier: {
        id: supplier.id, name: supplier.name,
        active: Number(supplier.active) === 1,
        dateAdd: supplier.dateAdd, dateUpd: supplier.dateUpd,
        description: supplier.description || '',
        phone: supplier.phone || '', phoneMobile: supplier.phoneMobile || '',
        address1: supplier.address1 || '', postcode: supplier.postcode || '',
        city: supplier.city || '', idCountry: Number(supplier.idCountry || 8),
        countryName: supplier.countryName || '',
      },
      products: products.map((p: any) => ({
        id: p.id, name: p.name, reference: p.reference, supplierRef: p.supplierRef,
        priceTE: Number(p.priceTE || 0), stock: Number(p.stock || 0),
      })),
      orders: orders.map((o: any) => ({
        id: o.id, reference: o.reference,
        dateAdd: o.dateAdd, deliveryDate: o.deliveryDate,
        totalTTC: Number(o.totalTTC || 0), totalHT: Number(o.totalHT || 0),
        stateName: o.stateName,
      })),
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/suppliers/:id GET] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
