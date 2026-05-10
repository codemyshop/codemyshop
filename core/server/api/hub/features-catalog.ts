/**
 *
 * GET /api/hub/features-catalog?clientId=example-shop — catalog + activation state per tenant
 * Source of truth: local ac_marketplace PS module for the tenant
 * (fallback to direct DB if the module's HTTP API doesn't respond).
 */

import { resolveClientId } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event)
  const id = (clientId as string) || resolveClientId(event)

  return await readCatalog(id)
})
