/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listOpenSlots } from '~/enterprise/base/appointment/server/utils/appointment'

/**
 * GET /api/appointment/slots → { success, slots: [{ id_availability, date_start, duration_min, notes }] }
 *
 * Future unbooked slots (60 days by default). Public — no auth.
 */
export default defineEventHandler(async (event) => {
  try {
    const slots = await listOpenSlots({ event })
    return { success: true, slots }
  }
  catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur DB inconnue'
    console.error('[appointment/slots] SELECT failed:', msg)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporairement indisponible',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
})
