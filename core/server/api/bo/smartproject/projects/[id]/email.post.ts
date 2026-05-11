

import { sendProjectEmail } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID du projet invalide' })
  }
  const body = await readBody<any>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  const session = getSession(event)
  const idOwner = Number(body.id_owner ?? session?.employeeId ?? 0)

  const result = await sendProjectEmail(
    {
      idProject,
      idOwner,
      subject: String(body.subject ?? ''),
      body: String(body.body ?? body.message ?? ''),
      signature: body.signature ? String(body.signature) : undefined,
      to: body.to ? String(body.to) : undefined,
    },
    { event },
  )
  if (!result.ok) {
    return { success: false, message: result.error }
  }
  return {
    success: true,
    id_ac_smartemail: result.id_ac_smartemail,
    to: result.to,
  }
})
