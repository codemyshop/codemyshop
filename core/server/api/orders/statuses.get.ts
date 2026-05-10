/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders/statuses?clientId=...
 * List of available order statuses.
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getOrderStatesFromDb } from '~/server/utils/orders-db'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getOrderStatesFromDb(ctx)
})
