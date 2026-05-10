/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  clientVpsExists,
  createClientVps,
  listClientVpsForAdmin,
} from '~/internal/hub/server/utils/hub'

/**
 * GET  /api/clients  → lists all clients from the database via the facade
 * POST /api/clients  → registers a new client
 */
export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    const rows = await listClientVpsForAdmin(true)
    return rows.map((r: any) => ({
      ...r,
      config: r.config ? JSON.parse(r.config) : {},
    }))
  }

  if (method === 'POST') {
    const body = await readBody(event)
    if (!body.id || !body.name || !body.domain) {
      throw createError({ statusCode: 400, message: 'id, name et domain sont requis' })
    }

    if (await clientVpsExists(body.id)) {
      throw createError({ statusCode: 409, message: `Client "${body.id}" existe déjà` })
    }

    await createClientVps({
      clientId: body.id,
      name: body.id,
      label: body.name,
      domain: body.domain,
      ip: body.vps_ip || '',
      purpose: 'pending',
      mrr: body.mrr || 0,
      offer: body.offer || '',
      config: JSON.stringify(body.config || {}),
    })
    return { id: body.id, name: body.name, domain: body.domain, status: 'pending' }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
