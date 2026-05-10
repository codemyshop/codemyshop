/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

/**
 * GET /api/client-config/[id]
 *
 * Returns the tenant config document (FLAT, multilang inline) from the
 * cs_client_config table of the current tenant via the ac_clientconfig facade.
 *
 * Before: psProxy to the ac_clientconfig module (failed in SSR because
 * the HTTP request to the module timed out during server rendering).
 * Now: direct Drizzle facade, works identically in SSR and CSR.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''

  if (!/^[a-z0-9-]+$/.test(id)) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }

  try {
    const configJson = await getClientConfigJson(id, { event })
    if (!configJson) {
      throw createError({ statusCode: 404, message: 'No config found' })
    }
    return JSON.parse(configJson)
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[client-config] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
