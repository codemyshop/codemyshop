/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

export default defineEventHandler((event) => {
  deleteCookie(event, 'ac_session', { path: '/' })
  // Cleanup of legacy cookie ac_logged_in (no longer set since 2026-05-05).
  // Keep deletion record for ~30d (maximum lifetime of the old cookie) then droppable.
  deleteCookie(event, 'ac_logged_in', { path: '/' })
  return { success: true }
})
