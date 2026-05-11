

import { upsertTaskTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body || !body.title) {
    throw createError({ statusCode: 400, message: 'Paramètres invalides : title requis' })
  }
  const session = getSession(event)
  const idOwner = Number(body.id_owner ?? session?.employeeId ?? 0)
  const id = await upsertTaskTemplate(
    {
      id_template: Number(body.id_template) || 0,
      id_owner: idOwner,
      title: body.title,
      default_description: body.default_description ?? null,
      default_status: body.default_status ?? null,
      days_to_deadline: body.days_to_deadline ?? null,
      next_step: body.next_step ?? null,
    },
    { event },
  )
  return {
    success: true,
    template: {
      id,
      title: body.title,
      days_to_deadline: body.days_to_deadline ?? null,
      next_step: body.next_step ?? null,
      default_status: body.default_status ?? null,
    },
  }
})
