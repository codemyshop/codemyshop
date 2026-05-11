

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, 'id')
  if (!rawId) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)

  const isNew = rawId === 'new' || Number(rawId) === 0

  
  
  
  if (isNew) {
    if (!isMaster) {
      throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master (id_lang=1)' })
    }

    const code = String(body.code || '').trim()
    const name = String(body.name || '').trim()
    if (!code) throw createError({ statusCode: 400, message: 'Le code est obligatoire' })
    if (!name) throw createError({ statusCode: 400, message: 'Le nom est obligatoire' })

    const dateFrom = body.dateFrom ? String(body.dateFrom).replace('T', ' ') : null
    const dateTo = body.dateTo ? String(body.dateTo).replace('T', ' ') : null
    if (!dateFrom || !dateTo) {
      throw createError({ statusCode: 400, message: 'Dates de validité requises' })
    }

    const insert = await db.run(`
      INSERT INTO ps_cart_rule
        (id_customer, date_from, date_to, description, quantity, quantity_per_user,
         priority, partial_use, code, minimum_amount, minimum_amount_tax,
         minimum_amount_currency, minimum_amount_shipping, country_restriction,
         carrier_restriction, group_restriction, cart_rule_restriction,
         product_restriction, shop_restriction, free_shipping,
         reduction_percent, reduction_amount, reduction_tax, reduction_currency,
         reduction_product, reduction_exclude_special, gift_product,
         gift_product_attribute, highlight, active, date_add, date_upd)
      VALUES (0, ?, ?, ?, ?, ?, 1, 0, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, NOW(), NOW())
    `, [
      dateFrom,
      dateTo,
      String(body.description || ''),
      Number(body.quantity) || 0,
      Number(body.quantityPerUser) || 0,
      code,
      Number(body.minimumAmount) || 0,
      body.freeShipping ? 1 : 0,
      Number(body.reductionPercent) || 0,
      Number(body.reductionAmount) || 0,
      body.active ? 1 : 0,
    ])

    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    
    
    
    
    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(
        `INSERT INTO ps_cart_rule_lang (id_cart_rule, id_lang, name) VALUES (?, ?, ?)`,
        [newId, Number(l.id_lang), name]
      )
    }

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_cart_rule FROM ps_cart_rule WHERE id_cart_rule = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Code promo introuvable' })

  
  if (isMaster) {
    const pf: string[] = []
    const pp: any[] = []
    if (body.code !== undefined) { pf.push('code = ?'); pp.push(String(body.code).trim()) }
    if (body.description !== undefined) { pf.push('description = ?'); pp.push(String(body.description || '')) }
    if (body.dateFrom !== undefined) { pf.push('date_from = ?'); pp.push(String(body.dateFrom).replace('T', ' ')) }
    if (body.dateTo !== undefined) { pf.push('date_to = ?'); pp.push(String(body.dateTo).replace('T', ' ')) }
    if (body.quantity !== undefined) { pf.push('quantity = ?'); pp.push(Number(body.quantity) || 0) }
    if (body.quantityPerUser !== undefined) { pf.push('quantity_per_user = ?'); pp.push(Number(body.quantityPerUser) || 0) }
    if (body.minimumAmount !== undefined) { pf.push('minimum_amount = ?'); pp.push(Number(body.minimumAmount) || 0) }
    if (body.reductionPercent !== undefined) { pf.push('reduction_percent = ?'); pp.push(Number(body.reductionPercent) || 0) }
    if (body.reductionAmount !== undefined) { pf.push('reduction_amount = ?'); pp.push(Number(body.reductionAmount) || 0) }
    if (body.freeShipping !== undefined) { pf.push('free_shipping = ?'); pp.push(body.freeShipping ? 1 : 0) }
    if (body.active !== undefined) { pf.push('active = ?'); pp.push(body.active ? 1 : 0) }

    if (pf.length) {
      pf.push('date_upd = NOW()')
      await db.run(`UPDATE ps_cart_rule SET ${pf.join(', ')} WHERE id_cart_rule = ?`, [...pp, id])
    }
  }

  
  
  
  
  if (body.name !== undefined) {
    await db.run(`
      INSERT INTO ps_cart_rule_lang (id_cart_rule, id_lang, name)
      VALUES (?, ?, ?)
      ON CONFLICT (id_cart_rule, id_lang) DO UPDATE SET name = EXCLUDED.name
    `, [id, langId, String(body.name || '')])
  }

  return { success: true, id, langId, isMaster, created: false }
})
