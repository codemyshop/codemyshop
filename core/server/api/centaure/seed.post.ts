

import { seedFromAutoblog } from '~/server/utils/centaure-embed'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session?.isAdmin) {
    throw createError({ statusCode: 403, message: 'Réservé aux administrateurs' })
  }
  const report = await seedFromAutoblog()
  return { ok: true, ...report }
})
