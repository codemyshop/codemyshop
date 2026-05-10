/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/invoices — paginated invoice list with filters.
 * Source : cs_invoice + cs_invoice_client (module ac_invoice).
 * Read through the Drizzle facade.
 *
 * Query:
 *   page, perPage
 * search    : invoice number, subject, company, SIRET
 * month     : 'YYYY-MM' — filters on issue_date
 * paidMonth : 'YYYY-MM' — filters on paid_at (URSSAF collection month)
 *   status    : draft|sent|paid|overdue|cancelled
 */
import {
  listInvoicesWithClient,
  type InvoiceFilters,
  type InvoiceStatus,
} from '~/internal/invoicing/server/utils/invoice'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))

  const filters: InvoiceFilters = {
    search: (q.search || '').trim() || undefined,
    month: (q.month || '').trim() || undefined,
    paidMonth: (q.paidMonth || '').trim() || undefined,
    status: ((q.status || '').trim() as InvoiceStatus) || undefined,
  }

  try {
    const { invoices, total } = await listInvoicesWithClient(filters, page, perPage, { event })
    return { invoices, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/invoices] DB error:', err?.message)
    return { invoices: [], total: 0, page, perPage, totalPages: 0 }
  }
})
