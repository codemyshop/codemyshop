/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listClientVpsForAdmin } from '~/internal/hub/server/utils/hub'
import { verifyToken } from '~/server/utils/session-crypto'

/**
 * GET /api/admin/sites — lists all clients (admin only)
 * Source of truth: cs_client_vps (DB) via ac_hub facade.
 */
export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const rows = await listClientVpsForAdmin(false)
  return rows.map((r: any) => ({
    ...r,
    config: r.config ? JSON.parse(r.config) : {},
  }))
})
