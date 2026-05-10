/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteExperiment } from '~/enterprise/misc/ab-testing/server/utils/ab-testing'

/** DELETE /api/bo/products/ab-testing?id=X — deletes an experiment. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const id = Number(q.id || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  try {
    await deleteExperiment(id, { event })
    return { ok: true, id }
  } catch (err: any) {
    console.error('[bo/products/ab-testing DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
