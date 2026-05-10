/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findPendingCarousel,
  insertCarouselJob,
} from '~/enterprise/ai/covergen/server/utils/covergen'

/**
 * POST /api/bo/marketing/blog/generate-carousel
 *
 * Inserts a request to generate a LinkedIn PDF carousel into
 * cs_carousel_queue via the ac_covergen facade.
 * The ac_carouselgen cron processes the queue.
 *
 * Body : { id_cms, title, slug, slides: [{title, text}] }
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idCms = Number(body.id_cms)
  const title = String(body.title || '').trim()
  const slug = String(body.slug || '').trim()
  const slides = body.slides

  if (!idCms || !title || !slug || !Array.isArray(slides) || slides.length < 3) {
    throw createError({ statusCode: 422, message: 'id_cms, title, slug et slides (min 3) requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const existing = await findPendingCarousel(tenant, idCms, { event })
    if (existing) {
      return {
        queued: true,
        id_carousel: existing.id_carousel,
        status: existing.status,
        message: 'Carrousel déjà en cours de génération',
      }
    }

    const id = await insertCarouselJob({
      tenant,
      idCms,
      title,
      slug,
      slidesJson: JSON.stringify(slides),
    }, { event })

    return {
      queued: true,
      id_carousel: id,
      status: 'pending',
      message: 'Carrousel en file d\'attente — génération dans ~2 min',
    }
  } catch (err: any) {
    console.error('[generate-carousel] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
