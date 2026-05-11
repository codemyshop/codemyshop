

import { addTeamMember } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'Body manquant' })
  }
  const session = getSession(event)
  const idOwner = Number(body.id_owner ?? session?.employeeId ?? 0)

  const result = await addTeamMember(
    {
      id_owner: idOwner,
      firstname: String(body.firstname ?? ''),
      lastname: String(body.lastname ?? ''),
      email: String(body.email ?? ''),
      role: body.role ?? null,
    },
    { event },
  )

  if (!result.ok) {
    return { success: false, message: result.error }
  }
  return {
    success: true,
    message: 'Membre ajouté avec succès',
    member: result.member,
  }
})
