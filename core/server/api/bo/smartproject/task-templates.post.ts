/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/task-templates
 * Remplace ac_smartproject/ajaxaddtasktemplate (upsert, chantier #38 Phase B1.1).
 *
 * Body : { id_template?, title, default_description?, default_status?,
 *          days_to_deadline?, next_step? }
 *
 * id_owner is resolved server-side from the Hub session (employeeId), aligned
 * with the PHP pattern that used $this->context->customer->id.
 */
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
