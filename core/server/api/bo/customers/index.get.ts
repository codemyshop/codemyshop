/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/customers — paginated CRM contacts list.
 *
 * Lead/customer segmentation (as of 2026-05-01):
 * - segment=customer → contacts with ≥ 1 validated order
 * - segment=lead   → contacts with NO orders (prospects /
 * accounts created but not converted)
 * - segment=all    → all (legacy / global view)
 *
 * Optimization: a single aggregated LEFT JOIN on ps_orders replaces the
 * two correlated subqueries per row from the previous version.
 * Segment filter applied to the aggregate, COUNT(*) recalculated via the
 * same CTE for consistency with pagination.
 *
 * Search: firstname + lastname + email + company + literal id.
 *
 * Server-side sorting (sort/dir) — whitelisted columns: id, firstname,
 * lastname, email, company, dateAdd, nbOrders, totalSpent. The
 * aggregated columns (nbOrders/totalSpent) sort on the expression
 * COALESCE to remain consistent with the display.
 *
 * Filtres par colonne (port leads UX 2026-05-05) :
 * - fName            : LIKE on firstname OR lastname
 * - fEmail           : LIKE on email
 *   - fEmailVerified   : 'ok'|'rejected'|'unknown'|'none' (none = NULL)
 * - fCompany         : LIKE on company
 *   - fActivite        : exact match cx.activity_code
 * - fOrdersMin       : nb_orders >= N (COUNT subquery)
 *   - fActive          : '1' | '0' (statut Actif/Inactif)
 *
 * Query : ?page=1&perPage=100&search=…&segment=client|lead|all
 *         &sort=…&dir=asc|desc
 *         &fName=…&fEmail=…&fEmailVerified=…&fCompany=…&fActivite=…
 *         &fOrdersMin=…&fActive=…
 */
const SORT_COLUMNS: Record<string, string> = {
  id:         'c.id_customer',
  firstname:  'c.firstname',
  lastname:   'c.lastname',
  email:      'c.email',
  company:    'c.company',
  dateAdd:    'c.date_add',
  nbOrders:   'COALESCE(os.nb_orders, 0)',
  totalSpent: 'COALESCE(os.total_spent, 0)',
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || q.limit || 100)))
  const search = (q.search || '').trim()
  const segment = (q.segment === 'lead' || q.segment === 'client' || q.segment === 'all') ? q.segment : 'all'

  // Tri serveur — whitelist + direction validée
  const sortKey = SORT_COLUMNS[q.sort || ''] ? q.sort : 'id'
  const sortCol = SORT_COLUMNS[sortKey] || SORT_COLUMNS.id
  const sortDir = (q.dir || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  // Filtres par colonne
  const fName          = (q.fName     || '').trim()
  const fEmail         = (q.fEmail    || '').trim()
  const fEmailVerified = ['ok', 'rejected', 'unknown', 'none'].includes(q.fEmailVerified) ? q.fEmailVerified : ''
  const fCompany       = (q.fCompany  || '').trim()
  const fActivite      = (q.fActivite || '').trim()
  const fOrdersMin     = Number(q.fOrdersMin || 0)
  const fActive        = q.fActive === '1' ? '1' : (q.fActive === '0' ? '0' : '')

  const db = useClientDb(event)

  try {
    const conditions: string[] = ['c.deleted = 0']
    const params: any[] = []

    if (search) {
      conditions.push(`(c.firstname ILIKE ? OR c.lastname ILIKE ? OR c.email ILIKE ? OR c.company ILIKE ? OR CAST(c.id_customer AS TEXT) ILIKE ?)`)
      const s = `%${search}%`
      params.push(s, s, s, s, s)
    }

    if (segment === 'client') {
      conditions.push(`EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_customer = c.id_customer AND o.valid = 1)`)
    } else if (segment === 'lead') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_customer = c.id_customer AND o.valid = 1)`)
    }

    if (fName) {
      conditions.push(`(c.firstname LIKE ? OR c.lastname LIKE ?)`)
      const s = `%${fName}%`
      params.push(s, s)
    }
    if (fEmail) {
      conditions.push(`c.email LIKE ?`)
      params.push(`%${fEmail}%`)
    }
    if (fEmailVerified) {
      if (fEmailVerified === 'none') {
        conditions.push(`(cx.email_verified_status IS NULL)`)
      } else {
        conditions.push(`(cx.email_verified_status = ?)`)
        params.push(fEmailVerified)
      }
    }
    if (fCompany) {
      conditions.push(`c.company LIKE ?`)
      params.push(`%${fCompany}%`)
    }
    if (fActivite) {
      // EXISTS pour ne pas casser le COUNT/main quand cx absent
      conditions.push(`EXISTS (SELECT 1 FROM cs_customer_extra cx2 WHERE cx2.id_customer = c.id_customer AND cx2.activity_code = ?)`)
      params.push(fActivite)
    }
    if (fActive === '1' || fActive === '0') {
      conditions.push(`c.active = ?`)
      params.push(Number(fActive))
    }
    if (fOrdersMin > 0) {
      conditions.push(`(SELECT COUNT(*) FROM ps_orders o2 WHERE o2.id_customer = c.id_customer AND o2.valid = 1) >= ?`)
      params.push(fOrdersMin)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await db.get<any>(`SELECT COUNT(*) AS total FROM ps_customer c ${where}`, params)
    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    const customers = await db.query<any>(`
      SELECT
        c.id_customer AS id,
        c.firstname, c.lastname, c.email, c.company, c.siret,
        c.active, c.newsletter, c.optin,
        c.id_default_group AS defaultGroupId,
        c.outstanding_allow_amount AS outstandingAmount,
        c.date_add AS dateAdd,
        cx.activity_code AS activityCode,
        cx.email_verified_status AS emailVerifiedStatus,
        cx.email_verified_at     AS emailVerifiedAt,
        cx.linkedin_url          AS linkedinUrl,
        COALESCE(os.nb_orders, 0) AS nbOrders,
        COALESCE(ROUND(os.total_spent, 2), 0) AS totalSpent
      FROM ps_customer c
      LEFT JOIN cs_customer_extra cx ON cx.id_customer = c.id_customer
      LEFT JOIN (
        SELECT id_customer,
               COUNT(id_order) AS nb_orders,
               SUM(total_paid_tax_incl) AS total_spent
          FROM ps_orders
         WHERE valid = 1
         GROUP BY id_customer
      ) os ON os.id_customer = c.id_customer
      ${where}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `, [...params, perPage, offset])

    return { customers, total, page, perPage, segment, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/customers] DB error:', err?.message)
    return { customers: [], total: 0, page, perPage, segment, totalPages: 0 }
  }
})
