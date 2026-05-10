/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/smartproject/contacts/search?q=...
 * Remplace ac_smartproject/ajaxsearchcontactproject (chantier #38 Phase B1.5).
 *
 * Bugfix vs PHP: the PHP version was broken — it required `ajax=1&action=searchContact`
 * but Nuxt only sent `q=...` → fallback `die(json_encode([]))` systematic.
 * The consumer `searchContacts()` read `data.contacts` (always undefined). The
 * contacts dropdown was inoperative. We align on `{success, contacts}`.
 */
import { searchSmartleadContacts } from '~/enterprise/base/smartproject/server/utils/smartproject'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  const contacts = await searchSmartleadContacts(q, { event })
  return { success: true, contacts }
})
