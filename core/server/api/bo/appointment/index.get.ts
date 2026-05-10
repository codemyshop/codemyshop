/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  listAdminAppointments,
  listAdminAvailability,
} from '~/enterprise/base/appointment/server/utils/appointment'

/**
 * GET /api/bo/appointment → { success, slots: AdminAvailability[], appointments: AdminAppointment[] }
 *
 * Admin view /hub/rdv: lists open slots (upcoming from J-1 → +∞) + appointments
 * recent (from J-30 → +∞). Auth = middleware /hub.
 */
export default defineEventHandler(async (event) => {
  const [slots, appointments] = await Promise.all([
    listAdminAvailability({ event }),
    listAdminAppointments({ event }),
  ])
  return { success: true, slots, appointments }
})
