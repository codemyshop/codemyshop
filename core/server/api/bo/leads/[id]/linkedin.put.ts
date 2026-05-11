

import { useClientDb } from '~/server/utils/db'
import { setCustomerLinkedinUrl } from '~/modules/customer-extra/server/utils/customer-extra'

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
