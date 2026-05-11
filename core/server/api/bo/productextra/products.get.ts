

import { listProducts } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const limit = Number(q.limit) || 100
  const offset = Number(q.offset) || 0
  const runtime = useRuntimeConfig(event)
  const baseLink = (runtime.public?.psFrontUrl as string) || ''
  const result = await listProducts({ limit, offset, baseLink: baseLink ? `${baseLink}/` : '' }, { event })
  return { success: true, ...result }
})
