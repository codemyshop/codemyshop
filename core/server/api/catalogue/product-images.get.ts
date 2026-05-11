

import { useClientDb, resolveClientId } from '~/server/utils/db'

interface ImageRow { id_image: number; cover: number | null; position: number }

export default defineEventHandler(async (event): Promise<{ imageIds: number[] }> => {
  const tenant = resolveClientId(event)
  if (!tenant) return { imageIds: [] }

  const { id } = getQuery(event)
  const productId = Number(id)
  if (!productId || isNaN(productId)) {
    throw createError({ statusCode: 400, message: 'id produit invalide' })
  }

  const db = useClientDb(event)
  try {
    const rows = await db.query<ImageRow>(
      `SELECT id_image, cover, position
         FROM ps_image
        WHERE id_product = ?
        ORDER BY cover DESC, position ASC, id_image ASC`,
      [productId],
    )
    return { imageIds: rows.map(r => Number(r.id_image)).filter(Number.isFinite) }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return { imageIds: [] }
    console.error('[product-images] DB error:', err?.message)
    return { imageIds: [] }
  }
})
