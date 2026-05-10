/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listConstitutionByLayer } from '~/internal/hub/server/utils/hub'

/**
 * GET /api/synedre/charte
 * Platform charter — non-negotiable top layer of constitutional governance
 * with 3 layers of the framework (e-Seal claim 1.b,
 * DSO2026012576).
 *
 * Source unique : cs_constitution WHERE layer='charte'.
 * Applies to ALL agents in the marketplace (present and future),
 * including those of third-party clients. Modifiable only by the operator
 * of the platform.
 */
export default defineEventHandler(async () => {
  try {
    const rows = await listConstitutionByLayer('charte')
    const sections = rows.map((r) => ({
      id: r.id_section,
      sectionType: r.section_type,
      titreNum: r.titre_num,
      titreLabel: r.titre_label,
      articleNum: r.article_num,
      articleTitle: r.article_title,
      contentHtml: r.content_html,
      position: r.position,
    }))
    return { sections }
  } catch (err: any) {
    console.error('[API synedre/charte] DB error:', err.message)
    return { sections: [], error: 'DB unavailable' }
  }
})
