/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/projects/:id/email
 * Remplace ac_smartproject/ajaxsendbyimapemail (chantier #38 Phase B1.3-bis).
 *
 * Body : { subject, body, signature?, to? }
 *
 * Bugfix vs PHP :
 * - PHP required `Tools::getValue('to')` but the Nuxt caller didn't send
 * `to` → email rejected. The new endpoint derives `to` automatically
 * from the cs_smartlead contact of the project.
 *  - Suppression de l'appel IMAP API externe (config NULL en prod) — Resend
 * manages its own traceability on the provider side. EMAIL_OVERRIDE_TO remains active.
 * - Removal of Mail::Send PrestaShop (local SwiftMailer templates) —
 * we move to Resend, compliant with the core email doctrine.
 *
 * id_owner resolved via the session.
 */
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
