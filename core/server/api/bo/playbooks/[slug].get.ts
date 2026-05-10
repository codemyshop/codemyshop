/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPlaybookBySlug } from '~/modules/playbook/server/utils/playbook'

/** GET /api/bo/playbooks/:slug — detail of a playbook by slug via the playbook service. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Slug requis' })

  const playbook = await getPlaybookBySlug(slug, { event })
  if (!playbook) throw createError({ statusCode: 404, message: 'Playbook introuvable' })
  return { playbook }
})
