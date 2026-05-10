/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * PUT /api/bo/products/:id — product editing (base fields + translations + stock + categories + existing combinations).
 *
 * Sprint 12 — multilang semantics:
 * - `?lang=1` (master): all editable (ps_product + ps_product_lang
 * FR + stock + categories + combinations + carriers).
 *   - `?lang>1` (traduction) : uniquement ps_product_lang via
 * INSERT…ON CONFLICT DO UPDATE. The rest of the body is ignored to
 * avoid « reset »ting prices or stock when the user has translated
 * only the name/description.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)
  const productId = Number(id)

  const exists = await db.get<any>(`SELECT id_product FROM ps_product WHERE id_product = ?`, [productId])
  if (!exists) throw createError({ statusCode: 404, message: 'Produit introuvable' })

  // ps_product — langue master uniquement
  const pf: string[] = []
  const pp: any[] = []
  if (body.priceHT !== undefined) { pf.push('price = ?'); pp.push(Number(body.priceHT)) }
  if (body.wholesalePrice !== undefined) { pf.push('wholesale_price = ?'); pp.push(Number(body.wholesalePrice)) }
  if (body.reference !== undefined) { pf.push('reference = ?'); pp.push(String(body.reference)) }
  if (body.ean13 !== undefined) { pf.push('ean13 = ?'); pp.push(String(body.ean13)) }
  if (body.active !== undefined) { pf.push('active = ?'); pp.push(body.active ? 1 : 0) }
  if (body.categoryId !== undefined) { pf.push('id_category_default = ?'); pp.push(Number(body.categoryId)) }
  if (body.weight !== undefined) { pf.push('weight = ?'); pp.push(Number(body.weight)) }
  if (body.width !== undefined) { pf.push('width = ?'); pp.push(Number(body.width) || 0) }
  if (body.height !== undefined) { pf.push('height = ?'); pp.push(Number(body.height) || 0) }
  if (body.depth !== undefined) { pf.push('depth = ?'); pp.push(Number(body.depth) || 0) }
  if (body.availableForOrder !== undefined) { pf.push('available_for_order = ?'); pp.push(body.availableForOrder ? 1 : 0) }
  if (body.showPrice !== undefined) { pf.push('show_price = ?'); pp.push(body.showPrice ? 1 : 0) }
  if (body.additionalShippingCost !== undefined) { pf.push('additional_shipping_cost = ?'); pp.push(Number(body.additionalShippingCost) || 0) }
  if (body.taxRulesGroupId !== undefined) { pf.push('id_tax_rules_group = ?'); pp.push(Number(body.taxRulesGroupId) || 0) }

  if (isMaster && pf.length) {
    pf.push('date_upd = NOW()')
    await db.run(`UPDATE ps_product SET ${pf.join(', ')} WHERE id_product = ?`, [...pp, productId])
    await db.run(`UPDATE ps_product_shop SET ${pf.join(', ')} WHERE id_product = ?`, [...pp, productId]).catch(() => {})
  }

  // ps_product_lang — INSERT…ON CONFLICT DO UPDATE (multilang).
  //
  // On récupère d'abord la ligne FR (toujours présente) comme template
  // pour les colonnes NOT NULL non éditées (available_now, tags, etc.),
  // puis on applique les champs fournis par body. Évite l'erreur
  // "Field X doesn't have a default value" à l'INSERT d'une nouvelle
  // langue. Si aucun champ localisé n'est fourni, on ne touche rien.
  const hasLangFields = [
    'name', 'description', 'descriptionShort', 'metaTitle', 'metaDescription',
    'linkRewrite', 'deliveryInStock', 'deliveryOutStock',
  ].some((k) => body[k] !== undefined)

  if (hasLangFields) {
    const base = await db.get<any>(`
      SELECT name, description, description_short, link_rewrite,
             meta_title, meta_description,
             available_now, available_later, delivery_in_stock, delivery_out_stock
        FROM ps_product_lang
       WHERE id_product = ? AND id_lang = 1 AND id_shop = 1
       LIMIT 1
    `, [productId])

    const row = {
      name: body.name !== undefined ? String(body.name) : (base?.name || ''),
      description: body.description !== undefined ? String(body.description) : (base?.description || ''),
      description_short: body.descriptionShort !== undefined ? String(body.descriptionShort) : (base?.description_short || ''),
      link_rewrite: body.linkRewrite !== undefined ? String(body.linkRewrite) : (base?.link_rewrite || ''),
      meta_title: body.metaTitle !== undefined ? String(body.metaTitle) : (base?.meta_title || ''),
      meta_description: body.metaDescription !== undefined ? String(body.metaDescription) : (base?.meta_description || ''),
      available_now: base?.available_now || '',
      available_later: base?.available_later || '',
      delivery_in_stock: body.deliveryInStock !== undefined ? String(body.deliveryInStock || '') : (base?.delivery_in_stock || ''),
      delivery_out_stock: body.deliveryOutStock !== undefined ? String(body.deliveryOutStock || '') : (base?.delivery_out_stock || ''),
    }

    await db.run(`
      INSERT INTO ps_product_lang
        (id_product, id_shop, id_lang, name, description, description_short,
         link_rewrite, meta_title, meta_description,
         available_now, available_later, delivery_in_stock, delivery_out_stock)
      VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id_product, id_shop, id_lang) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        description_short = EXCLUDED.description_short,
        link_rewrite = EXCLUDED.link_rewrite,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        delivery_in_stock = EXCLUDED.delivery_in_stock,
        delivery_out_stock = EXCLUDED.delivery_out_stock
    `, [
      productId, langId,
      row.name, row.description, row.description_short,
      row.link_rewrite, row.meta_title, row.meta_description,
      row.available_now, row.available_later,
      row.delivery_in_stock, row.delivery_out_stock,
    ])
  }

  // Stock + catégories + combinaisons + transporteurs : langue master uniquement
  const stats = { categoriesUpdated: 0, combinationsUpdated: 0, combinationsFailed: 0, carriersUpdated: 0 }

  if (!isMaster) {
    return { success: true, stats, langId, isMaster }
  }

  // Stock de base (combinaison 0)
  if (body.stock !== undefined) {
    await db.run(`UPDATE ps_stock_available SET quantity = ? WHERE id_product = ? AND id_product_attribute = 0`, [Number(body.stock), productId])
  }

  if (Array.isArray(body.categoryIds)) {
    const ids = new Set<number>(
      body.categoryIds.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    )
    if (body.categoryId && Number(body.categoryId) > 0) ids.add(Number(body.categoryId))

    if (ids.size > 0) {
      await db.run(`DELETE FROM ps_category_product WHERE id_product = ?`, [productId])
      for (const catId of ids) {
        await db.run(
          `INSERT INTO ps_category_product (id_category, id_product, position) VALUES (?, ?, 0)`,
          [catId, productId]
        )
        stats.categoriesUpdated++
      }
    }
  }

  // Transporteurs autorisés : DELETE + INSERT sur ps_product_carrier.
  // Clé composite (id_product, id_carrier_reference, id_shop). PS 1.7+ utilise
  // id_carrier_reference (stable) et non id_carrier (versionné à chaque edit).
  // Si body.carrierRefs est [] → supprime toutes les restrictions (PS considère
  // alors que tous les transporteurs actifs sont autorisés — comportement natif).
  if (Array.isArray(body.carrierRefs)) {
    await db.run(`DELETE FROM ps_product_carrier WHERE id_product = ?`, [productId])
    const uniqueRefs = Array.from(new Set(
      body.carrierRefs.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    ))
    for (const ref of uniqueRefs) {
      await db.run(
        `INSERT INTO ps_product_carrier (id_product, id_carrier_reference, id_shop) VALUES (?, ?, 1)`,
        [productId, ref]
      )
      stats.carriersUpdated++
    }
  }

  // Combinaisons existantes : UPDATE price impact + quantité (pas de création de nouvelles en sprint 5)
  if (Array.isArray(body.combinations)) {
    for (const combo of body.combinations) {
      const comboId = Number(combo?.id)
      if (!Number.isFinite(comboId) || comboId <= 0) continue
      try {
        const paFields: string[] = []
        const paParams: any[] = []
        if (combo.priceImpact !== undefined) { paFields.push('price = ?'); paParams.push(Number(combo.priceImpact) || 0) }
        if (combo.reference !== undefined) { paFields.push('reference = ?'); paParams.push(String(combo.reference || '')) }
        if (paFields.length) {
          await db.run(
            `UPDATE ps_product_attribute SET ${paFields.join(', ')} WHERE id_product_attribute = ? AND id_product = ?`,
            [...paParams, comboId, productId]
          )
        }
        if (combo.quantity !== undefined) {
          await db.run(
            `UPDATE ps_stock_available SET quantity = ? WHERE id_product = ? AND id_product_attribute = ?`,
            [Number(combo.quantity) || 0, productId, comboId]
          )
        }
        stats.combinationsUpdated++
      } catch (err) {
        console.error('[bo/products PUT] combo update failed', { comboId, err })
        stats.combinationsFailed++
      }
    }
  }

  return { success: true, stats, langId, isMaster }
})
