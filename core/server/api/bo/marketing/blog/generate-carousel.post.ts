

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findPendingCarousel,
  insertCarouselJob,
} from '~/enterprise/ai/covergen/server/utils/covergen'

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
