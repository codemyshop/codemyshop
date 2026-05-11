

import { upsertExperiment } from '~/enterprise/misc/ab-testing/server/utils/ab-testing'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const id = Number(body?.id || 0)
  const name = String(body?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'name requis' })

  const slug = (body?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 120)
  const status = ['draft', 'running', 'paused', 'ended'].includes(body?.status) ? body.status : 'draft'
  const productId = body?.productId ? Number(body.productId) : null
  const trafficSplit = Math.max(0, Math.min(100, Number(body?.trafficSplit ?? 50)))
  const variantA = JSON.stringify(body?.variantA || {})
  const variantB = JSON.stringify(body?.variantB || {})
  const notes = body?.notes ?? null
  const dateStart = body?.dateStart || null
  const dateEnd = body?.dateEnd || null

  try {
    const newId = await upsertExperiment(
      { id, name, slug, status, productId, trafficSplit, variantA, variantB, notes, dateStart, dateEnd },
      { event },
    )
    return { ok: true, id: newId }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/products/ab-testing POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Erreur DB' })
  }
})
