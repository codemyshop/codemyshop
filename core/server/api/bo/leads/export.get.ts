

import { listSmartLeadsForExport } from '~/enterprise/base/smartlead/server/utils/smartlead'

export default defineEventHandler(async (event) => {
  const rows = await listSmartLeadsForExport({ event })

  const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Société', 'SIRET', 'Type', 'Statut', 'Source', 'Note', 'Créé le']

  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  const lines: string[] = []
  lines.push(headers.join(';'))
  for (const r of rows) {
    lines.push([
      r.id,
      esc(r.firstname),
      esc(r.lastname),
      esc(r.email),
      esc(r.phone),
      esc(r.company),
      esc(r.siret),
      esc(r.type),
      esc(r.status),
      esc(r.leadSource),
      esc(r.note),
      r.dateAdd ? new Date(r.dateAdd).toISOString().slice(0, 10) : '',
    ].join(';'))
  }

  const csv = '﻿' + lines.join('\r\n')

  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
