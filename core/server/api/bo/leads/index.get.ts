/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { countLeadsUnion, listLeadsUnion } from '~/enterprise/base/smartlead/server/utils/smartlead'

/**
 * GET /api/bo/leads — leads (smartlead) + paginated contact messages.
 * Query : ?page=1&perPage=30&search=…&source=lead|contact
 * Filtres par colonne (style BO PrestaShop) : fName, fProfession, fCompany,
 * fActivite, fCity, fWebsite, fEmail, fPhone, fCaMin, fSourceCol,
 * fEmailVerified (ok|rejected|unknown|none).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim() || undefined
  const source = (q.source === 'lead' || q.source === 'contact') ? q.source : ''
  const sort = (q.sort || '').trim() || undefined
  const dir = q.dir === 'asc' ? 'asc' : q.dir === 'desc' ? 'desc' : undefined

  const colFilters = {
    fName:        (q.fName || '').trim() || undefined,
    fProfession:  (q.fProfession || '').trim() || undefined,
    fCompany:     (q.fCompany || '').trim() || undefined,
    fActivite:    (q.fActivite || '').trim() || undefined,
    fCity:        (q.fCity || '').trim() || undefined,
    fWebsite:     (q.fWebsite || '').trim() || undefined,
    fEmail:       (q.fEmail || '').trim() || undefined,
    fPhone:       (q.fPhone || '').trim() || undefined,
    fCaMin:       q.fCaMin ? Number(q.fCaMin) : undefined,
    fSourceCol:   (q.fSourceCol || '').trim() || undefined,
    fEmailVerified: (q.fEmailVerified || '').trim() || undefined,
  } as Record<string, any>

  try {
    const total = await countLeadsUnion({ search, source, ...colFilters }, { event })
    const offset = (page - 1) * perPage
    const leads = await listLeadsUnion(
      { search, source, sort, dir, perPage, offset, ...colFilters },
      { event },
    )
    return { leads, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/leads] DB error:', err?.message)
    return { leads: [], total: 0, page, perPage, totalPages: 0 }
  }
})
