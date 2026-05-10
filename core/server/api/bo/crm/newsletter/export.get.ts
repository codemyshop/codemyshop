/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/crm/newsletter/export.csv — CSV export of the tenant's opt-ins.
 * Filterable via ?status=… (default: confirmed + pending).
 *
 * Output: CSV UTF-8 BOM (Excel-compatible). Contains the columns
 * GDPR audit (consent_at, ip, user_agent, source) as proof of
 * consent collection.
 */

import { resolveClientId } from '~/server/utils/db'
import { listSubscribers, type SubscriberStatus } from '~/server/utils/newsletter-subscriber'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  // Échappe " et entoure si besoin (quote si , ; " \n)
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const clientId = resolveClientId(event)
  const status = (q.status ? String(q.status) : 'all') as SubscriberStatus | 'all'

  const { rows } = await listSubscribers({
    clientId,
    status,
    limit: 500,
    offset: 0,
  })

  const headers = [
    'id', 'email', 'status', 'locale', 'source', 'source_url',
    'ip', 'user_agent', 'consent_at', 'confirmed_at',
    'unsubscribed_at', 'bounce_reason', 'date_add',
  ]
  const lines = [headers.join(';')]
  for (const r of rows) {
    lines.push([
      r.id_subscriber, r.email, r.status, r.locale ?? '', r.source, r.source_url ?? '',
      r.ip ?? '', r.user_agent ?? '', r.consent_at, r.confirmed_at ?? '',
      r.unsubscribed_at ?? '', r.bounce_reason ?? '', r.date_add,
    ].map(csvCell).join(';'))
  }
  const csv = '﻿' + lines.join('\r\n') + '\r\n'

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="newsletter-${clientId}-${new Date().toISOString().slice(0, 10)}.csv"`)
  return csv
})
