

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestStatusForCategory } from '~/enterprise/ai/category-covergen/server/utils/category-covergen'

function slugifyForFilename(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category'
}

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const { id_category } = getQuery(event) as { id_category: string }
  const idCategory = Number(id_category)
  if (!idCategory) {
    throw createError({ statusCode: 422, message: 'id_category requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const row = await getLatestStatusForCategory(tenant, idCategory, { event })
    if (!row) return { found: false, status: null }

    const slug = slugifyForFilename(row.link_rewrite || `cat-${idCategory}`)
    const bust = row.date_upd ? `?v=${new Date(row.date_upd).getTime()}` : ''

    return {
      found: true,
      id_covergen: row.id_covergen,
      status: row.status,
      error_msg: row.error_msg,
      date_upd: row.date_upd,
      cover_url: `/img/c/${idCategory}-${slug}-1200.webp${bust}`,
      thumb_url: `/img/c/${idCategory}-${slug}-400.webp${bust}`,
    }
  } catch (err: any) {
    console.error('[categories/cover-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
