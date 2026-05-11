

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'Slug invalide' })
  }

  const { clientId } = getQuery(event)
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    const row = await db.get<{
      id_cms: number
      meta_title: string
      meta_description: string
      content: string
      link_rewrite: string
    }>(
      `SELECT c.id_cms,
              COALESCE(cl.meta_title,       clf.meta_title, '')       AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description, '') AS meta_description,
              COALESCE(cl.content,          clf.content, '')          AS content,
              COALESCE(cl.link_rewrite,     clf.link_rewrite, '')     AS link_rewrite
         FROM ps_cms c
    LEFT JOIN ps_cms_lang cl  ON cl.id_cms  = c.id_cms AND cl.id_lang  = ? AND cl.id_shop = 1
    LEFT JOIN ps_cms_lang clf ON clf.id_cms = c.id_cms AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.active = 1
          AND (cl.link_rewrite = ? OR clf.link_rewrite = ?)
        LIMIT 1`,
      [idLang, slug, slug],
    )
    if (!row) throw createError({ statusCode: 404, message: 'Page CMS introuvable' })

    return {
      id: Number(row.id_cms),
      slug: String(row.link_rewrite || slug),
      title: String(row.meta_title || ''),
      content: String(row.content || ''),
      meta_description: String(row.meta_description || ''),
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      throw createError({ statusCode: 404, message: 'Page CMS introuvable' })
    }
    console.error('[catalogue/cms/by-slug] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement CMS' })
  }
})
