/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { setAvatarProductTargets } from '~/server/utils/hub-avatars-db'

/**
 * PUT /api/hub/avatars/{id}/products
 * Body : { items: [{ idProduct: number, position: number, reason?: string }] }
 * Replace-all: the received list replaces the old one (DELETE then INSERT).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id avatar requis' })
  }
  const body = await readBody<{ items?: Array<{ idProduct: number; position: number; reason?: string }> }>(event)
  const items = Array.isArray(body?.items) ? body!.items : []
  const result = await setAvatarProductTargets(id, items.map((it) => ({
    idProduct: Number(it?.idProduct),
    position: Math.max(1, Math.min(10, Math.trunc(Number(it?.position) || 1))),
    reason: typeof it?.reason === 'string' ? it.reason.slice(0, 4000) : '',
  })))
  return result
})
