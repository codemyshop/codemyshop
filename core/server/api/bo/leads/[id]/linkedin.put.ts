/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { setCustomerLinkedinUrl } from '~/modules/customer-extra/server/utils/customer-extra'

/**
 * PUT /api/bo/leads/{id}/linkedin
 *
 * Saves the verified LinkedIn URL of a lead, across all sources.
 * Body : { url: string, source?: 'lead' | 'customer-noorder' | 'contact' }
 *
 * Routing by source:
 *   - lead             → cs_smartlead.profil_linkedIn
 * - customer-noorder → cs_customer_extra.linkedin_url (UPSERT — the row
 * may not exist as long as no metadata is entered)
 *   - contact          → cs_headlesscontact_message.linkedin_url
 *
 * `source` is optional for backward-compatibility; absent → assume 'lead'.
 *
 * Accepted URL: empty (clear) or starting with https?://….linkedin.com/.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event) as { url?: string; source?: string }
  const raw = typeof body?.url === 'string' ? body.url.trim() : ''
  const source = (body?.source === 'customer-noorder' || body?.source === 'contact')
    ? body.source
    : 'lead'

  let url = ''
  if (raw) {
    if (!/^https?:\/\//i.test(raw) || !/linkedin\.com\//i.test(raw)) {
      throw createError({ statusCode: 400, statusMessage: 'URL LinkedIn invalide' })
    }
    url = raw.slice(0, 255)
  }

  const db = useClientDb(event)
  try {
    if (source === 'customer-noorder') {
      await setCustomerLinkedinUrl(id, url || null, { event })
      return { ok: true, id, source, url }
    }

    if (source === 'contact') {
      const { affectedRows } = await db.run(
        `UPDATE cs_main.cs_headlesscontact_message
            SET linkedin_url = ?, date_upd = CURRENT_TIMESTAMP
          WHERE id_message = ?`,
        [url || null, id],
      )
      if (!affectedRows) {
        throw createError({ statusCode: 404, statusMessage: 'Message contact introuvable' })
      }
      return { ok: true, id, source, url }
    }

    // source === 'lead'
    const { affectedRows } = await db.run(
      `UPDATE cs_main.cs_smartlead
          SET "profil_linkedIn" = ?, date_upd = CURRENT_TIMESTAMP
        WHERE id_ac_smartlead = ?`,
      [url, id],
    )
    if (!affectedRows) {
      throw createError({ statusCode: 404, statusMessage: 'Lead introuvable' })
    }
    return { ok: true, id, source, url }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[bo/leads/linkedin] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }
})
