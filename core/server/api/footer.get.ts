

import { resolveClientId } from '~/server/utils/db'
import { loadSiloSlugMapForLang, localizeSiloHref } from '~/server/utils/localize-silo-href'
import { listLinksWithLang } from '~/modules/footer/server/utils/footer'

export default defineEventHandler(async (event) => {
  try {
    const { resolveIdLang } = await import('~/server/utils/lang')
    const idLang = await resolveIdLang(event)
    const clientId = resolveClientId(event)

    const slugMap = idLang !== 1 ? await loadSiloSlugMapForLang(idLang) : new Map<string, string>()

    const query = getQuery(event)
    const withIds = query.ids === '1'

    const rows = await listLinksWithLang(clientId, idLang, { event })

    const columnsMap = new Map<number, { title: string; links: any[] }>()
    for (const r of rows) {
      const pos = r.column_position
      if (!columnsMap.has(pos)) {
        columnsMap.set(pos, { title: r.column_title || '', links: [] })
      }
      const link: any = {
        label: r.link_label || '',
        href: slugMap.size > 0 ? (localizeSiloHref(r.link_href, slugMap) || r.link_href) : r.link_href,
        badge: r.link_badge || undefined,
        external: r.link_external === 1,
      }
      if (withIds) {
        link.id = r.id_footer
        link.column_position = r.column_position
        link.link_position = r.link_position
      }
      columnsMap.get(pos)!.links.push(link)
    }

    return { columns: [...columnsMap.values()] }
  } catch (err: any) {
    console.error('[API footer] DB error:', err.message)
    return { columns: [], error: 'DB unavailable' }
  }
})
