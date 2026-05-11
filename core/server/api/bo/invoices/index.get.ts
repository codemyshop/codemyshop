

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
