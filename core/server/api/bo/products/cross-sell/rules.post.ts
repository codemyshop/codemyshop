/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/products/cross-sell/rules — adds an accessory pair.
 * Body: { src: number, dst: number }
 * Creates the unidirectional ps_accessory relationship (display on source product page).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ src?: number; dst?: number }>(event)
  const src = Number(body?.src || 0)
  const dst = Number(body?.dst || 0)

  if (!src || !dst || src === dst) {
    throw createError({ statusCode: 400, statusMessage: 'src et dst requis et distincts' })
  }

  const db = useClientDb(event)

  try {
    // Vérifie que les produits existent avant d'insérer
    const check = await db.get<any>(
      `SELECT
        (SELECT COUNT(*) FROM ps_product WHERE id_product = ?) AS srcOk,
        (SELECT COUNT(*) FROM ps_product WHERE id_product = ?) AS dstOk`,
      [src, dst],
    )
    if (!check?.srcOk || !check?.dstOk) {
      throw createError({ statusCode: 404, statusMessage: 'Produit introuvable' })
    }

    // INSERT IGNORE pour idempotence (pas de clé unique native, on vérifie en amont)
    const existing = await db.get<any>(
      `SELECT 1 FROM ps_accessory WHERE id_product_1 = ? AND id_product_2 = ? LIMIT 1`,
      [src, dst],
    )
    if (existing) {
      return { ok: true, alreadyExists: true, src, dst }
    }

    await db.run(
      `INSERT INTO ps_accessory (id_product_1, id_product_2) VALUES (?, ?)`,
      [src, dst],
    )
    return { ok: true, alreadyExists: false, src, dst }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/products/cross-sell/rules POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
