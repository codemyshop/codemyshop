/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { cancelQueuedEmail } from '~/server/utils/email-queue'

/**
 * DELETE /api/bo/email-queue/:id — cancel a pending email.
 * 404 if already sent / in progress / cancelled.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const cancelled = await cancelQueuedEmail(id)
  if (!cancelled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Email introuvable ou non annulable (déjà envoyé / en cours / annulé)',
    })
  }
  return { ok: true }
})
