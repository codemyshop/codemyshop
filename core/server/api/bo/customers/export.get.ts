

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      c.id_customer              AS id,
      COALESCE(c.firstname, '')  AS firstname,
      COALESCE(c.lastname, '')   AS lastname,
      COALESCE(c.email, '')      AS email,
      COALESCE(c.company, '')    AS company,
      COALESCE(c.siret, '')      AS siret,
      COALESCE(c.website, '')    AS website,
      c.active,
      c.newsletter,
      c.optin,
      c.date_add                 AS dateAdd
    FROM ps_customer c
    WHERE c.deleted = 0
    ORDER BY c.id_customer ASC
  `)

  const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Société', 'SIRET', 'Site web', 'Actif', 'Newsletter', 'Optin', 'Créé le']

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
      esc(r.company),
      esc(r.siret),
      esc(r.website),
      Number(r.active) ? 1 : 0,
      Number(r.newsletter) ? 1 : 0,
      Number(r.optin) ? 1 : 0,
      r.dateAdd ? new Date(r.dateAdd).toISOString().slice(0, 10) : '',
    ].join(';'))
  }

  const csv = '\ufeff' + lines.join('\r\n')

  const filename = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
