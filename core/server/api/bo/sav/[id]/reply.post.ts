/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/sav/:id/reply — replies to a support ticket.
 *
 * Phase 9b.4e (option C-hard): Direct Drizzle + Resend, no more psProxy
 * to ac_savapi/reply. The tenant mail config (PS_SHOP_EMAIL/PS_SHOP_NAME)
 * est lue depuis ps_configuration via util sav-reply.
 *
 * Pipeline :
 *   1. lookup ps_customer_thread + ps_customer (firstname/lastname/email)
 *   2. INSERT ps_customer_message (id_employee=1, private=0, read=1)
 *   3. UPDATE ps_customer_thread.status
 *   4. sendEmail() via Resend (override preprod via EMAIL_OVERRIDE_TO)
 *
 * Body : { message: string, status?: 'open' | 'closed' | 'pending1' | 'pending2' }
 */

import { savReply, type SavStatus } from '~/server/utils/sav-reply'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const threadId = Number(id)
  if (!Number.isFinite(threadId) || threadId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const body = await readBody<{ message?: string; status?: string }>(event)
  const message = String(body?.message || '').trim()
  if (!message) throw createError({ statusCode: 422, message: 'message requis' })

  const r = await savReply({
    idThread: threadId,
    message,
    status: body?.status as SavStatus | undefined,
  }, event)

  if (!r.success) {
    throw createError({
      statusCode: r.statusCode || 500,
      message: r.error || 'Échec envoi SAV',
    })
  }

  return {
    success: true,
    id_message: r.idMessage,
    id_thread: r.idThread,
    status: r.status,
    mail_sent: r.mailSent,
    to: r.to,
  }
})
