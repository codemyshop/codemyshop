/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/shipping/methods?clientId=...&addressId=...&totalHT=...&weight=...
 * List of active carriers with prices resolved for the context.
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getCarriersFromDb } from '~/server/utils/orders-db'
import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const { clientId, addressId, totalHT, weight } = getQuery(event) as {
    clientId?: string; addressId?: string; totalHT?: string; weight?: string
  }
  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const idLang = await resolveIdLang(event)
  return getCarriersFromDb(idLang, {
    addressId: addressId ? Number(addressId) : undefined,
    totalHT: totalHT ? Number(totalHT) : undefined,
    weight: weight ? Number(weight) : undefined,
  }, ctx)
})
