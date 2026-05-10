/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * GET /api/bo/pim/variants — list of variant groups
 * (ps_attribute_group) with counts of attributes and products using them.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      g.id_attribute_group  AS id,
      g.is_color_group      AS isColorGroup,
      g.group_type          AS groupType,
      g.position,
      COALESCE(gl.name, CONCAT('Groupe #', g.id_attribute_group))    AS name,
      COALESCE(gl.public_name, '')                                   AS publicName,
      (SELECT COUNT(*) FROM ps_attribute a WHERE a.id_attribute_group = g.id_attribute_group) AS attributesCount,
      (SELECT COUNT(DISTINCT pac.id_product_attribute)
         FROM ps_product_attribute_combination pac
         JOIN ps_attribute a2 ON a2.id_attribute = pac.id_attribute
         WHERE a2.id_attribute_group = g.id_attribute_group)         AS combinationsCount
    FROM ps_attribute_group g
    LEFT JOIN ps_attribute_group_lang gl ON gl.id_attribute_group = g.id_attribute_group AND gl.id_lang = ?
    ORDER BY g.position ASC, g.id_attribute_group ASC
  `, [langId])

  return { variants: rows, langId, total: rows.length }
})
