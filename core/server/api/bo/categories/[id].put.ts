

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { replaceFaqsForParent, upsertFaqTranslations } from '~/modules/faq/server/utils/faq'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) throw createError({ statusCode: 400, message: 'id invalide' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<{
    name?: string
    parentId?: number
    active?: boolean
    h1?: string
    summary?: string
    description?: string
    slug?: string
    metaTitle?: string
    metaDescription?: string
    groupIds?: number[]
    faqs?: Array<{ id?: number; position: number; active: boolean; question: string; answer: string }>
    linkedPostIds?: number[]
  }>(event)

  if (!body?.name?.trim()) throw createError({ statusCode: 400, message: 'Nom requis' })

  const d = usePocPg()

  const currentResult: any = await d.execute(sql`
    SELECT id_parent, level_depth FROM cs_main.ps_category WHERE id_category = ${id}
  `)
  const current = ((currentResult as any) as any[])[0]
  if (!current) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  const slug = (body.slug?.trim() || body.name.trim())
    .toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  
  if (isMaster) {
    let depth = current.level_depth
    const newParent = body.parentId ?? current.id_parent
    if (newParent !== current.id_parent) {
      if (newParent === id) throw createError({ statusCode: 400, message: 'Une catégorie ne peut pas être son propre parent' })
      const parentResult: any = await d.execute(sql`
        SELECT level_depth FROM cs_main.ps_category WHERE id_category = ${newParent}
      `)
      const parent = ((parentResult as any) as any[])[0]
      if (!parent) throw createError({ statusCode: 400, message: 'Catégorie parent introuvable' })
      depth = (parent.level_depth ?? 1) + 1
    }

    await d.execute(sql`
      UPDATE cs_main.ps_category
      SET id_parent = ${newParent}, level_depth = ${depth}, active = ${body.active === false ? 0 : 1}, date_upd = NOW()
      WHERE id_category = ${id}
    `)
  }

  
  
  
  
  
  
  
  
  await d.execute(sql`
    INSERT INTO cs_main.ps_category_lang
      (id_category, id_lang, id_shop, name, description, additional_description,
       link_rewrite, meta_title, meta_description)
    VALUES (${id}, ${langId}, 1, ${body.name.trim()}, ${body.summary ?? ''}, ${body.description ?? ''},
            ${slug}, ${body.metaTitle ?? body.name.trim()}, ${body.metaDescription ?? ''})
    ON CONFLICT (id_category, id_shop, id_lang) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      additional_description = EXCLUDED.additional_description,
      link_rewrite = EXCLUDED.link_rewrite,
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description
  `)

  
  if (body.h1 !== undefined) {
    const { upsertCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
    await upsertCategoryH1(Number(id), langId, String(body.h1 || ''), { ensureParent: isMaster }, { event })
  }

  if (isMaster && Array.isArray(body.groupIds)) {
    const clean = Array.from(new Set(body.groupIds.map((n) => Number(n)).filter((n) => n > 0)))
    await d.execute(sql`DELETE FROM cs_main.ps_category_group WHERE id_category = ${id}`)
    for (const gid of clean) {
      await d.execute(sql`INSERT INTO cs_main.ps_category_group (id_category, id_group) VALUES (${id}, ${gid})`)
    }
  }

  
  
  if (Array.isArray(body.faqs)) {
    try {
      if (isMaster) {
        await replaceFaqsForParent('category', id, 1, body.faqs.map((f, i) => ({
          position: i,
          active: f.active !== false,
          question: String(f.question || ''),
          answer: String(f.answer || ''),
        })), { event })
      } else {
        await upsertFaqTranslations('category', id, langId, body.faqs.map((f) => ({
          id: Number(f.id),
          question: String(f.question || ''),
          answer: String(f.answer || ''),
        })), { event })
      }
    } catch (err: any) {
      
      if (
        err?.code !== '42P01' &&
        err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146
      ) throw err
    }
  }

  if (isMaster && Array.isArray(body.linkedPostIds)) {
    const { replaceCategoryLinksFromCategory } = await import('~/modules/category-cms/server/utils/category-cms')
    await replaceCategoryLinksFromCategory(Number(id), body.linkedPostIds, { event })
  }

  return { success: true, id, slug, langId, isMaster }
})
