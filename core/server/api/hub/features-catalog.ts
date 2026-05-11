

import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event)
  const id = (clientId as string) || resolveClientId(event)

  return await readCatalog(id)
})
