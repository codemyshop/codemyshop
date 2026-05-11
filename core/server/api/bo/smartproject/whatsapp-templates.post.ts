

import { upsertWaTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body || !body.title || !String(body.title).trim()) {
    return { success: false, error: 'Le titre est requis.' }
  }
  const session = getSession(event)
  const idOwner = Number(body.id_owner ?? session?.employeeId ?? 0)

  const id = await upsertWaTemplate(
    {
      id: Number(body.id) || 0,
      id_owner: idOwner,
      title: String(body.title),
      type: String(body.type ?? 'autre'),
      message_body: String(body.message_body ?? ''),
    },
    { event },
  )
  return { success: true, id }
})
