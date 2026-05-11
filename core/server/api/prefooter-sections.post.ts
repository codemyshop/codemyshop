

import { updateSectionsOrder, type SectionOrderUpdate } from '~/modules/prefooter-section/server/utils/prefooter-section'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sections: SectionOrderUpdate[] }>(event)
  if (!body?.sections?.length) {
    throw createError({ statusCode: 400, message: 'sections[] requis' })
  }

  const updated = await updateSectionsOrder(body.sections, { event })
  return { ok: true, updated }
})
