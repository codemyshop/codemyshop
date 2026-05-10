/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/prefooter-sections
 * Returns pre-footer sections from cs_prefooter_section JOIN _lang.
 * Typed config: limit_items (INT) — no more payload_json (architecture debt #158
 * resolved 2026-04-19).
 */

import { listSectionsWithLang } from '~/modules/prefooter-section/server/utils/prefooter-section'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeAll = query.all === '1' || query.all === 'true'
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  try {
    const rows = await listSectionsWithLang(idLang, includeAll, { event })
    const sections = rows.map((r) => ({
      id: r.id_section,
      position: r.position,
      type: r.type,
      title: r.title,
      subtitle: r.subtitle,
      limitItems: r.limit_items,
      active: r.active === 1,
    }))
    return { sections }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { sections: [] }
    }
    console.error('[prefooter-sections] Erreur DB :', err?.message)
    return { sections: [] }
  }
})
