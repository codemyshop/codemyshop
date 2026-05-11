

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const groups = await db.query<any>(`
    SELECT
      ag.id_attribute_group AS id,
      agl.name,
      agl.public_name AS publicName,
      ag.is_color_group AS isColorGroup,
      ag.group_type AS groupType,
      ag.position
    FROM ps_attribute_group ag
    LEFT JOIN ps_attribute_group_lang agl
      ON agl.id_attribute_group = ag.id_attribute_group AND agl.id_lang = 1
    ORDER BY ag.position, agl.name
  `)

  if (!groups.length) return { groups: [] }

  const values = await db.query<any>(`
    SELECT
      a.id_attribute AS id,
      a.id_attribute_group AS groupId,
      al.name,
      a.color,
      a.position
    FROM ps_attribute a
    LEFT JOIN ps_attribute_lang al
      ON al.id_attribute = a.id_attribute AND al.id_lang = 1
    ORDER BY a.id_attribute_group, a.position, al.name
  `)

  const valuesByGroup = new Map<number, any[]>()
  for (const v of values) {
    if (!valuesByGroup.has(v.groupId)) valuesByGroup.set(v.groupId, [])
    valuesByGroup.get(v.groupId)!.push({
      id: v.id,
      name: v.name,
      color: v.color || null,
      position: v.position,
    })
  }

  return {
    groups: groups.map((g: any) => ({
      id: g.id,
      name: g.name || g.publicName || `Groupe ${g.id}`,
      publicName: g.publicName || g.name,
      isColorGroup: !!g.isColorGroup,
      groupType: g.groupType,
      position: g.position,
      values: valuesByGroup.get(g.id) || [],
    })),
  }
})
