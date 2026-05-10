/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/notify-indexed
 * Notifies Google (Indexing API) and Bing (IndexNow) that a URL has been published/updated.
 *
 * Body: { url: string } ou { urls: string[] }
 *
 * Automatically called by ac_publish.py after each publication.
 */

import { notifyUrlUpdated, notifyUrlsBatch } from '~/server/services/indexing'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string; urls?: string[] }>(event)

  if (body.urls?.length) {
    const result = await notifyUrlsBatch(body.urls)
    return { success: true, ...result }
  }

  if (body.url) {
    const result = await notifyUrlUpdated(body.url)
    return { success: true, ...result }
  }

  throw createError({ statusCode: 400, message: 'url ou urls requis' })
})
