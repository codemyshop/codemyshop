/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listConstitutionByLayer } from '~/internal/hub/server/utils/hub'

/**
 * GET /api/synedre/constitution
 * Framework constitution from the DB (real-time). Single source: cs_constitution.
 *
 * Filter by layer: 'operateur' (platform constitution) by default.
 * See the 3-layer constitutional governance of the framework (requirement 1.b):
 * layer='charte'    → top layer, non-negotiable (page /framework/charte)
 * layer='operateur' → Platform constitution (this page /framework/constitution)
 *   layer='client'    → V2 (constitution custom par client)
 */
export default defineEventHandler(async () => {
  try {
    const rows = await listConstitutionByLayer('operateur')
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
    console.error('[API synedre/constitution] DB error:', err.message)
    return { sections: [], error: 'DB unavailable' }
  }
})
