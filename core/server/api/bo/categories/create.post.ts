/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

/** POST /api/bo/categories/create — creates a PrestaShop category. */
export default defineEventHandler(async (event) => {
  const { name, parentId, active } = await readBody<{ name: string; parentId?: number; active?: boolean }>(event)
  if (!name?.trim()) throw createError({ statusCode: 400, message: 'Nom requis' })
  const d = usePocPg()
  const parentIdResolved = parentId || 2
  const activeFlag = active !== false ? 1 : 0
  const trimmed = name.trim()
  const slug = trimmed.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const parentResult: any = await d.execute(sql`
    SELECT id_category, level_depth FROM cs_main.ps_category WHERE id_category = ${parentIdResolved}
  `)
  const parent = ((parentResult as any) as any[])[0]
  const depth = (parent?.level_depth ?? 1) + 1

  const maxPosResult: any = await d.execute(sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS "pos" FROM cs_main.ps_category WHERE id_parent = ${parentIdResolved}
  `)
  const pos = Number(((maxPosResult as any) as any[])[0]?.pos || 0)

  // PG : RETURNING id_category (≠ MySQL insertId / LAST_INSERT_ID).
  // explicit redirect_type: the DEFAULT cs_main is broken ('''301''' = 5 chars on VARCHAR(3)).
  const insertResult: any = await d.execute(sql`
    INSERT INTO cs_main.ps_category (id_parent, id_shop_default, level_depth, active, date_add, date_upd, position, redirect_type)
    VALUES (${parentIdResolved}, 1, ${depth}, ${activeFlag}, NOW(), NOW(), ${pos}, '301')
    RETURNING id_category
  `)
  const catId = Number(((insertResult as any) as any[])[0]?.id_category ?? 0)

  await d.execute(sql`
    INSERT INTO cs_main.ps_category_lang (id_category, id_lang, id_shop, name, description, link_rewrite, meta_title, meta_description)
    VALUES (${catId}, 1, 1, ${trimmed}, '', ${slug}, ${trimmed}, '')
  `)

  await d.execute(sql`INSERT INTO cs_main.ps_category_shop (id_category, id_shop) VALUES (${catId}, 1)`)

  return { success: true, id: catId }
})
