/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listAvatarGeographicZones } from '~/server/utils/hub-avatars-db'

/** GET /api/hub/avatars/{id}/zones — geographic influence zones of an avatar. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id avatar requis' })
  }
  const items = await listAvatarGeographicZones(id)
  return { items }
})
