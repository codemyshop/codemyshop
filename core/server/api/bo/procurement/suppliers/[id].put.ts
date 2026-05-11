

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)

  try {
    const existing = await db.get<any>(`SELECT id_supplier FROM ps_supplier WHERE id_supplier = ? LIMIT 1`, [id])
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Fournisseur introuvable' })

    
    const updates: string[] = []
    const params: any[] = []
    if (typeof body.name === 'string' && body.name.trim()) {
      if (body.name.length > 64) throw createError({ statusCode: 422, statusMessage: 'Nom trop long' })
      updates.push('name = ?'); params.push(body.name.trim())
    }
    if (body.active !== undefined) {
      updates.push('active = ?'); params.push(Number(body.active) ? 1 : 0)
    }
    if (updates.length) {
      updates.push('date_upd = NOW()')
      await db.run(`UPDATE ps_supplier SET ${updates.join(', ')} WHERE id_supplier = ?`, [...params, id])
    }

    
    if (typeof body.description === 'string') {
      await db.run(
        `UPDATE ps_supplier_lang SET description = ? WHERE id_supplier = ? AND id_lang = 1`,
        [body.description, id],
      )
    }

    
    const hasContact = body.phone !== undefined || body.phoneMobile !== undefined
      || body.address1 !== undefined || body.postcode !== undefined
      || body.city !== undefined || body.idCountry !== undefined
    if (hasContact) {
      const addr = await db.get<any>(
        `SELECT id_address FROM ps_address WHERE id_supplier = ? AND deleted = 0 LIMIT 1`, [id],
      )
      const name = (body.name || existing.name || 'Contact').toString().slice(0, 100)
      const phone = String(body.phone ?? '').slice(0, 32)
      const phoneMobile = String(body.phoneMobile ?? '').slice(0, 32)
      const address1 = String(body.address1 ?? '').slice(0, 128)
      const postcode = String(body.postcode ?? '').slice(0, 12)
      const city = String(body.city ?? '').slice(0, 64) || '—'
      const idCountry = Number(body.idCountry || 8)

      if (addr) {
        await db.run(
          `UPDATE ps_address
           SET id_country = ?, phone = ?, phone_mobile = ?, address1 = ?, postcode = ?, city = ?, date_upd = NOW()
           WHERE id_address = ?`,
          [idCountry, phone, phoneMobile, address1 || '—', postcode, city, addr.id_address],
        )
      } else {
        await db.run(
          `INSERT INTO ps_address
            (id_country, id_supplier, alias, lastname, firstname, address1, postcode, city,
             phone, phone_mobile, date_add, date_upd, active, deleted)
           VALUES (?, ?, 'supplier', ?, 'Contact', ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
          [idCountry, id, name, address1 || '—', postcode, city, phone, phoneMobile],
        )
      }
    }

    return { ok: true, id }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/suppliers/:id PUT] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB : ' + (err?.message || '') })
  }
})
