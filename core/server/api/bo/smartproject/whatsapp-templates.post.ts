/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/smartproject/whatsapp-templates
 * Remplace ac_smartproject/ajaxsavewatemplate (upsert, chantier #38 Phase B1.4).
 *
 * Body : { id?, title, type?, message_body? }
 *
 * id_owner is resolved server-side from the Hub session (employeeId).
 * id_lang frozen at 1 (FR) — see whatsapp-templates.get.ts.
 *
 * Bugfix in passing: id_owner is now persisted at creation
 * (PHP ignored the column, which remained NULL).
 */
import { upsertWaTemplate } from '~/enterprise/base/smartproject/server/utils/smartproject'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body || !body.title || !String(body.title).trim()) {
    return { success: false, error: 'Le titre est requis.' }
  }
  const session = getSession(event)
  const idOwner = Number(body.id_owner ?? session?.employeeId ?? 0)

  const id = await upsertWaTemplate(
    {
      id: Number(body.id) || 0,
      id_owner: idOwner,
      title: String(body.title),
      type: String(body.type ?? 'autre'),
      message_body: String(body.message_body ?? ''),
    },
    { event },
  )
  return { success: true, id }
})
