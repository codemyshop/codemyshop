

import { deleteExperiment } from '~/enterprise/misc/ab-testing/server/utils/ab-testing'

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
