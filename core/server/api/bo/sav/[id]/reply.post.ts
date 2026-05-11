

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
