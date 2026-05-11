

import { getPlaybookBySlug } from '~/modules/playbook/server/utils/playbook'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Slug requis' })

  const playbook = await getPlaybookBySlug(slug, { event })
  if (!playbook) throw createError({ statusCode: 404, message: 'Playbook introuvable' })
  return { playbook }
})
