/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/crm/newsletter/[id]/unsubscribe — manual back-office unsubscribe.
 * Body optionnel : { reason } (motif court, ex: "demande client par email").
 */

import { resolveClientId } from '~/server/utils/db'
import { unsubscribeById } from '~/server/utils/newsletter-subscriber'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const id = Number(idStr)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id invalide' })
  }
  const body = await readBody<{ reason?: string }>(event).catch(() => ({}))
  const reason = body?.reason ? String(body.reason).slice(0, 64) : undefined

  const clientId = resolveClientId(event)
  const ok = await unsubscribeById(clientId, id, reason)
  if (!ok) {
    throw createError({ statusCode: 404, statusMessage: 'Inscription introuvable ou déjà désabonnée' })
  }
  return { ok: true }
})
