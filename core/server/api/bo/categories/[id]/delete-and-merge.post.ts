

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) {
    throw createError({ statusCode: 400, message: 'id catégorie invalide' })
  }
  const body = await readBody<{ target_category_id?: number; hard_delete?: boolean }>(event)
  const targetId = body?.target_category_id ? Number(body.target_category_id) : 0
  const hardDelete = !!body?.hard_delete

  const d = usePocPg()

  const catResult: any = await d.execute(sql`SELECT id_category FROM cs_main.ps_category WHERE id_category = ${id}`)
  const cat = ((catResult as any) as any[])[0]
  if (!cat) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  if (hardDelete) {
    const childrenResult: any = await d.execute(sql`
      SELECT COUNT(*) AS "n" FROM cs_main.ps_category WHERE id_parent = ${id} AND active = 1
    `)
    const childrenN = Number(((childrenResult as any) as any[])[0]?.n || 0)
    if (childrenN > 0) {
      throw createError({
        statusCode: 400,
        message: `Cette catégorie a ${childrenN} sous-catégorie(s) active(s). Désactivez-les ou changez leur parent avant la suppression définitive.`,
      })
    }
  }

  
  
  
  let migratedCount = 0
  if (targetId > 0 && targetId !== id) {
    const targetResult: any = await d.execute(sql`SELECT id_category FROM cs_main.ps_category WHERE id_category = ${targetId}`)
    const target = ((targetResult as any) as any[])[0]
    if (!target) throw createError({ statusCode: 400, message: 'Catégorie cible introuvable' })

    const insertRes: any = await d.execute(sql`
      INSERT INTO cs_main.ps_category_product (id_category, id_product, position)
      SELECT ${targetId}, cp.id_product, cp.position
        FROM cs_main.ps_category_product cp
       WHERE cp.id_category = ${id}
      ON CONFLICT (id_category, id_product) DO NOTHING
      RETURNING id_product
    `)
    migratedCount = Number((((insertRes as any) as any[]) ?? []).length)
  }

  
  
  const removedRes: any = await d.execute(sql`
    DELETE FROM cs_main.ps_category_product WHERE id_category = ${id}
    RETURNING id_product
  `)
  const removedAffected = Number((((removedRes as any) as any[]) ?? []).length)

  
  if (hardDelete) {
    await d.execute(sql`DELETE FROM cs_main.ps_category_lang WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category_shop WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category_group WHERE id_category = ${id}`)
    await d.execute(sql`DELETE FROM cs_main.ps_category WHERE id_category = ${id}`)
  } else {
    await d.execute(sql`UPDATE cs_main.ps_category SET active = 0 WHERE id_category = ${id}`)
    await d.execute(sql`UPDATE cs_main.ps_category_shop SET active = 0 WHERE id_category = ${id}`)
  }

  return {
    ok: true,
    id_category: id,
    target_category_id: targetId || null,
    migrated_products: migratedCount,
    removed_associations: removedAffected,
    deleted: hardDelete,
  }
})
