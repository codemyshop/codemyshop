

import { incrementQaUpvote } from '~/server/utils/academy-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') ?? 0)
  if (!id) {
    throw createError({ statusCode: 422, message: 'id requis' })
  }

  const upvotes = await incrementQaUpvote(id)
  if (upvotes === null) {
    throw createError({ statusCode: 404, message: 'Q&A introuvable ou non publiée' })
  }
  return { success: true, upvotes }
})
