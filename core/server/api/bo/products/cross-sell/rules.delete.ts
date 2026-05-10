/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * DELETE /api/bo/products/cross-sell/rules?src=X&dst=Y
 * Deletes a specific accessory pair.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const src = Number(q.src || 0)
  const dst = Number(q.dst || 0)

  if (!src || !dst) {
    throw createError({ statusCode: 400, statusMessage: 'src et dst requis' })
  }

  const db = useClientDb(event)

  try {
    await db.run(
      `DELETE FROM ps_accessory WHERE id_product_1 = ? AND id_product_2 = ?`,
      [src, dst],
    )
    return { ok: true, src, dst }
  } catch (err: any) {
    console.error('[bo/products/cross-sell/rules DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
