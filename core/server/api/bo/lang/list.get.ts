/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import type { HubLang, HubLangListResponse } from '~/types/hub/lang'

/**
 * GET /api/bo/lang/list — list of active languages for the current tenant.
 *
 * Tenant resolution: automatic via `useClientDb(event)` (host → clientId → DB).
 * - ac-hub        → prestashop (ac_mariadb)
 * - example-shop-v2    → ps_example-shop (VPS distant)
 *
 * The Hub UI (`useHubLang`) calls this endpoint on mount and caches for
 * 5 min. The `<HubLangSelector>` is only displayed if `langs.length > 1`.
 */
export default defineEventHandler(async (event): Promise<HubLangListResponse> => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT id_lang, iso_code, name, active
      FROM ps_lang
     WHERE active = 1
     ORDER BY id_lang ASC
  `)

  const langs: HubLang[] = rows.map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code || '').toLowerCase(),
    name: String(r.name || ''),
    is_default: Number(r.id_lang) === 1,
    active: !!r.active,
  }))

  return { langs, default_id: 1 }
})
