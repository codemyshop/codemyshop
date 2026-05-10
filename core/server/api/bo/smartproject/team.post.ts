/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/team
 * Remplace ac_smartproject/ajaxaddteammember (chantier #38 Phase B1.4).
 *
 * Body : { firstname, lastname, email, role? }
 *
 * id_owner is resolved server-side from the Hub session (employeeId), aligned
 * with the PHP pattern that used $this->context->customer->id.
 *
 * Bugfix in passing: the `role` field is now persisted (the column exists
 * in cs_smartteam but PHP ignored it).
 */
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
