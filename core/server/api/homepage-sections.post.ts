/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/homepage-sections
 *
 * Saves the order and active/inactive state of homepage sections.
 * Body attendu : { sections: Array<{ id: number; position: number; active: boolean }> }
 */

import { updateSectionsOrder, type SectionOrderUpdate } from '~/modules/homepage-section/server/utils/homepage-section'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sections: SectionOrderUpdate[] }>(event)
  if (!body?.sections?.length) {
    throw createError({ statusCode: 400, message: 'sections[] requis' })
  }

  const updated = await updateSectionsOrder(body.sections, { event })
  return { ok: true, updated }
})
