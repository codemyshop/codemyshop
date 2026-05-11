

import { createListWithItems } from '~/modules/quickorder/server/utils/quickorder'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idCustomer: number
    name: string
    isDefault?: number
    items: { idProduct: number; idProductAttribute?: number; quantity: number; position?: number }[]
  }>(event)

  if (!body?.idCustomer || !body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'idCustomer et name requis' })
  }
  if (body.name.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'name > 128 caractères' })
  }

  try {
    const { idList } = await createListWithItems(
      {
        idCustomer: body.idCustomer,
        name: body.name,
        isDefault: body.isDefault ?? 0,
        items: body.items,
      },
      { event },
    )
    return { ok: true, idList }
  } catch (e: any) {
    if (e?.message === 'insertion liste échouée') {
      throw createError({ statusCode: 500, statusMessage: 'insertion liste échouée' })
    }
    throw e
  }
})
