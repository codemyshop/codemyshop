/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/procurement/suppliers/export — CSV annuaire fournisseurs.
 *
 * Joint ps_supplier + ps_supplier_lang (id_lang=1) + ps_address (alias
 * supplier). Same fields as the admin sheet + master language description.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      s.id_supplier                     AS id,
      s.name,
      s.active,
      COALESCE(a.phone, '')             AS phone,
      COALESCE(a.phone_mobile, '')      AS phoneMobile,
      COALESCE(a.address1, '')          AS address1,
      COALESCE(a.postcode, '')          AS postcode,
      COALESCE(a.city, '')              AS city,
      COALESCE(sl.description, '')      AS description,
      s.date_add                        AS dateAdd
    FROM ps_supplier s
    LEFT JOIN ps_supplier_lang sl
      ON sl.id_supplier = s.id_supplier AND sl.id_lang = 1
    LEFT JOIN ps_address a
      ON a.id_supplier = s.id_supplier AND a.deleted = 0
    ORDER BY s.id_supplier ASC
  `)

  const headers = ['ID', 'Nom', 'Actif', 'Téléphone', 'Mobile', 'Adresse', 'CP', 'Ville', 'Description', 'Créé le']

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
      esc(r.name),
      Number(r.active) ? 1 : 0,
      esc(r.phone),
      esc(r.phoneMobile),
      esc(r.address1),
      esc(r.postcode),
      esc(r.city),
      esc(r.description),
      r.dateAdd ? new Date(r.dateAdd).toISOString().slice(0, 10) : '',
    ].join(';'))
  }

  const csv = '\ufeff' + lines.join('\r\n')

  const filename = `suppliers-export-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
