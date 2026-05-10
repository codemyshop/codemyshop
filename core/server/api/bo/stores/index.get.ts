/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/stores — lists physical stores (`ps_store`) with
 * complete address, geolocation, hours, and ratings.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      s.id_store        AS id,
      s.active,
      s.city,
      s.postcode,
      s.latitude,
      s.longitude,
      s.phone,
      s.email,
      cl.name           AS country,
      sl.name,
      sl.address1,
      sl.address2,
      sl.hours,
      sl.note
    FROM ps_store s
    LEFT JOIN ps_store_lang sl ON sl.id_store = s.id_store AND sl.id_lang = 1
    LEFT JOIN ps_country_lang cl ON cl.id_country = s.id_country AND cl.id_lang = 1
    ORDER BY sl.name ASC
  `)

  return { ok: true, stores: rows }
})
