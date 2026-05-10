/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

const ALLOWED_STATUSES = ['open', 'closed', 'pending1', 'pending2'] as const

/**
 * PUT /api/bo/sav/:id/status — changes the status of a support ticket.
 *
 * Sprint 16 — direct DB write (no client notification or
 * Mail::Send, it's only an internal state change on the
 * support team side). Email sending is reserved for reply.post.ts.
 *
 * Body : { status: 'open' | 'closed' | 'pending1' | 'pending2' }
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const threadId = Number(id)
  if (!Number.isFinite(threadId) || threadId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const body = await readBody<{ status?: string }>(event)
  const status = String(body?.status || '')
  if (!ALLOWED_STATUSES.includes(status as any)) {
    throw createError({ statusCode: 422, message: `Statut invalide : ${status}` })
  }

  const db = useClientDb(event)

  const exists = await db.get<any>(`SELECT id_customer_thread FROM ps_customer_thread WHERE id_customer_thread = ?`, [threadId])
  if (!exists) throw createError({ statusCode: 404, message: 'Ticket introuvable' })

  await db.run(
    `UPDATE ps_customer_thread SET status = ?, date_upd = NOW() WHERE id_customer_thread = ?`,
    [status, threadId]
  )

  return { success: true, id: threadId, status }
})
