/**
 * GET /api/blog/comments/:articleId — Drizzle DB direct (cs_blog_comments).
 *
 */
import { listCommentsForArticle } from '~/enterprise/base/blog-comments/server/utils/blog-comments'

export default defineEventHandler(async (event) => {
  const articleId = Number(getRouterParam(event, 'articleId'))
  if (!articleId || isNaN(articleId)) {
    throw createError({ statusCode: 400, message: 'articleId invalide' })
  }

  const comments = await listCommentsForArticle({ idCms: articleId }, 'approved', { event })

  return comments.map((c) => ({
    id: c.id,
    author: c.author,
    content: c.content,
    aiResponse: c.aiResponse,
    aiRespondedAt: c.aiRespondedAt,
    createdAt: c.dateAdd,
  }))
})
