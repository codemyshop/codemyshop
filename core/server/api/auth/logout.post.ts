/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

export default defineEventHandler((event) => {
  deleteCookie(event, 'hub_session', { path: '/' })
  return { success: true }
})
