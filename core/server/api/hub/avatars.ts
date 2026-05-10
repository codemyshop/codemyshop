/**
 *
 * GET    /api/hub/avatars              — list of active definitions
 * GET    /api/hub/avatars?id=XX        — a definition
 * POST   /api/hub/avatars              — create
 * PUT    /api/hub/avatars              — modifier
 * DELETE /api/hub/avatars?id=XX        — supprimer (soft delete)
 *
 * Drizzle DB direct (cs_avatar_definition).
 */
import {
  createAvatar,
  getAvatarById,
  listAvatars,
  softDeleteAvatar,
  updateAvatar,
} from '~/server/utils/hub-avatars-db'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    const { id } = getQuery(event)
    if (id) {
      const row = await getAvatarById(Number(id))
      if (!row) throw createError({ statusCode: 404, message: 'Avatar introuvable' })
      return row
    }
    return await listAvatars()
  }

  if (method === 'POST') {
    const body = await readBody<Record<string, any>>(event)
    const result = await createAvatar(body as any)
    if (!result.ok) {
      throw createError({ statusCode: result.status || 500, message: result.error || 'createAvatar KO' })
    }
    return { ok: true, id: result.id }
  }

  if (method === 'PUT') {
    const body = await readBody<Record<string, any>>(event)
    if (!body?.id) throw createError({ statusCode: 400, message: 'id requis' })
    const result = await updateAvatar(body as any)
    if (!result.ok) {
      throw createError({ statusCode: result.status || 500, message: result.error || 'updateAvatar KO' })
    }
    return { ok: true }
  }

  if (method === 'DELETE') {
    const { id } = getQuery(event)
    if (!id) throw createError({ statusCode: 400, message: 'id requis' })
    const result = await softDeleteAvatar(Number(id))
    if (!result.ok) {
      throw createError({ statusCode: result.status || 500, message: result.error || 'softDeleteAvatar KO' })
    }
    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
