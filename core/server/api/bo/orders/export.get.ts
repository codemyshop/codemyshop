

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const d = usePocPg()

  const orders: any[] = await d.execute(sql`
    SELECT o.id_order, o.reference, o.date_add, o.id_customer, o.payment,
           o.total_paid_tax_excl, o.total_paid_tax_incl, o.total_shipping_tax_incl,
           COALESCE(osl.name, '') AS state_name,
           (SELECT COUNT(*) FROM cs_main.ps_order_detail WHERE id_order = o.id_order) AS items_count
      FROM cs_main.ps_orders o
 LEFT JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = 1
     ORDER BY o.id_order DESC
     LIMIT 500
  `) as any[]

  const headers = ['Référence', 'Date', 'Client ID', 'Statut', 'Paiement', 'Total HT', 'Total TTC', 'Livraison', 'Articles']
  const rows = orders.map((o: any) => [
    o.reference || '',
    o.date_add || '',
    o.id_customer || '',
    o.state_name || '',
    o.payment || '',
    o.total_paid_tax_excl || '0',
    o.total_paid_tax_incl || '0',
    o.total_shipping_tax_incl || '0',
    o.items_count || 0,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [headers.join(','), ...rows].join('\n')

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="commandes-${clientId || 'export'}-${new Date().toISOString().slice(0, 10)}.csv"`,
  })
  return csv
})
