/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/expertise/:slug
 * Complete expertise article with HTML content — direct Drizzle DB.
 */
import { getExpertiseBySlug } from '~/server/utils/expertise-db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug requis' })
  }

  const article = await getExpertiseBySlug(slug)
  if (!article) {
    throw createError({ statusCode: 404, message: 'Article introuvable' })
  }

  const wordCount = article.content.split(/\s+/).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return {
    title: article.title,
    slug: article.slug,
    metaDescription: article.metaDescription,
    category: article.category,
    tags: article.tags,
    difficulty: article.difficulty,
    psVersions: article.psVersions,
    content: article.content,
    faq: article.faq.map((f: any) => ({
      q: f.question,
      a: f.answer,
    })),
    tldr: article.tldr,
    readingTime,
    generatedAt: article.generatedAt,
    publishDate: article.publishDate || article.generatedAt,
    relatedArticles: [],
    sourceCategory: article.sourceCategory,
  }
})
