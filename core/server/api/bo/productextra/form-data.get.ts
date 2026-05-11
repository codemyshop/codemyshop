

import { getFormData } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const data = await getFormData({ event })
  return { success: true, ...data }
})
