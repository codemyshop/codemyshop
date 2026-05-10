/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET   /api/clients/:id  → client details
 * PATCH /api/clients/:id  → update (status, etc.)
 * DELETE /api/clients/:id → deletion (deactivation)
 *
 * Source of truth: cs_client_vps (DB) via ac_hub facade.
 */

import {
  deactivateClientVps,
  getClientVpsById,
  updateClientVps,
  type ClientVpsUpdateSet,
} from '~/internal/hub/server/utils/hub'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id     = getRouterParam(event, 'id') || ''

  if (method === 'GET') {
    const client = await getClientVpsById(id)
    if (!client) throw createError({ statusCode: 404, message: `Client "${id}" introuvable` })
    return { ...client, config: client.config ? JSON.parse(client.config) : {} }
  }

  if (method === 'PATCH') {
    const body = await readBody(event)
    const allowedFields: Record<string, string> = {
      name: 'label', domain: 'domain', vps_ip: 'ip', mrr: 'mrr',
      offer: 'offer', status: 'purpose', active: 'active', config: 'config',
    }
    const sets: ClientVpsUpdateSet[] = []
    for (const [key, col] of Object.entries(allowedFields)) {
      if (body[key] !== undefined) {
        sets.push({
          kind: 'value',
          column: col,
          value: key === 'config' ? JSON.stringify(body[key]) : body[key],
        })
      }
    }
    if (sets.length === 0) throw createError({ statusCode: 400, message: 'Aucun champ à mettre à jour' })

    const affected = await updateClientVps(id, sets)
    if (affected === 0) throw createError({ statusCode: 404, message: `Client "${id}" introuvable` })
    return { id, updated: Object.keys(body).filter(k => k in allowedFields) }
  }

  if (method === 'DELETE') {
    const affected = await deactivateClientVps(id)
    if (affected === 0) throw createError({ statusCode: 404, message: `Client "${id}" introuvable` })
    return { deleted: id }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
