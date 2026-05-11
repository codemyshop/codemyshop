

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id_product?: number; id_category?: number }>(event)
  const idProduct = Number(body?.id_product)
  const idCategory = Number(body?.id_category)
  if (!idProduct || !idCategory) {
    throw createError({ statusCode: 400, message: 'id_product et id_category requis' })
  }

  const db = useClientDb(event)
  await db.run(
    `INSERT IGNORE INTO ps_category_product (id_category, id_product, position) VALUES (?, ?, 0)`,
    [idCategory, idProduct],
  )
  return { ok: true, id_product: idProduct, id_category: idCategory }
})
