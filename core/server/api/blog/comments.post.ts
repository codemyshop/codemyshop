

import { createComment } from '~/enterprise/base/blog-comments/server/utils/blog-comments'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { articleId, author, email, content, articleSlug } = body ?? {}

  const result = await createComment({
    idCms: Number(articleId || 0),
    author: String(author || ''),
    email: String(email || ''),
    content: String(content || ''),
    articleSlug: articleSlug ? String(articleSlug) : undefined,
    event,
  }, { event })

  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'createComment KO' })
  }

  return {
    success: true,
    message: result.message,
    id: result.idComment,
  }
})
