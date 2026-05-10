/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * DELETE /api/bo/procurement/suppliers/:id — suppression logique.
 *
 * Refuses if any products (ps_product_supplier) or unclosed purchase orders (ps_supply_order)
 * are attached. Otherwise, disables (active=0) + soft delete ps_address.
 * No hard DELETE: PS refuses deletion to preserve consistency.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const db = useClientDb(event)

  try {
    const existing = await db.get<any>(`SELECT id_supplier, name FROM ps_supplier WHERE id_supplier = ? LIMIT 1`, [id])
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Fournisseur introuvable' })

    const counts = await db.get<any>(`
      SELECT
        (SELECT COUNT(*) FROM ps_product_supplier WHERE id_supplier = ?) AS products,
        (SELECT COUNT(*) FROM ps_supply_order WHERE id_supplier = ? AND is_template = 0) AS orders
    `, [id, id])

    if (Number(counts?.products || 0) > 0) {
      throw createError({ statusCode: 409, statusMessage: `Fournisseur utilisé par ${counts.products} produit(s). Dissociez-les d'abord.` })
    }
    if (Number(counts?.orders || 0) > 0) {
      throw createError({ statusCode: 409, statusMessage: `Fournisseur lié à ${counts.orders} bon(s) de commande. Archive uniquement.` })
    }

    // Soft delete : désactive + marque adresse supprimée
    await db.run(`UPDATE ps_supplier SET active = 0, date_upd = NOW() WHERE id_supplier = ?`, [id])
    await db.run(`UPDATE ps_address SET deleted = 1, date_upd = NOW() WHERE id_supplier = ? AND deleted = 0`, [id])

    return { ok: true, id, softDelete: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/suppliers/:id DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
