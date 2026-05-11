

import { useClientDb, useClientDbById } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ quantity: number; clientId?: string }>(event)
  const { quantity, clientId } = body || {}
  if (!id || quantity === undefined) {
    throw createError({ statusCode: 400, message: 'id et quantity requis' })
  }

  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)
  const { affectedRows } = await db.run(
    `UPDATE ps_stock_available
        SET quantity = ?, physical_quantity = ?, usable_quantity = ?
      WHERE id_product = ? AND id_product_attribute = 0`,
    [Number(quantity), Number(quantity), Number(quantity), id],
  )
  if (!affectedRows) {
    
    await db.run(
      `INSERT INTO ps_stock_available
          (id_product, id_product_attribute, id_shop, id_shop_group, quantity,
           physical_quantity, usable_quantity, depends_on_stock, out_of_stock, location)
       VALUES (?, 0, 1, 0, ?, ?, ?, 0, 2, '')`,
      [id, Number(quantity), Number(quantity), Number(quantity)],
    )
  }
  return { success: true }
})
