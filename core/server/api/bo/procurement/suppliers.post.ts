

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, any>>(event)
  const name = String(body?.name || '').trim()
  if (!name) throw createError({ statusCode: 422, statusMessage: 'Nom obligatoire' })
  if (name.length > 64) throw createError({ statusCode: 422, statusMessage: 'Nom trop long (64 car. max)' })

  const active = Number(body?.active) === 0 ? 0 : 1
  const description = String(body?.description || '').trim()
  const phone = String(body?.phone || '').trim().slice(0, 32)
  const phoneMobile = String(body?.phoneMobile || '').trim().slice(0, 32)
  const address1 = String(body?.address1 || '').trim().slice(0, 128)
  const postcode = String(body?.postcode || '').trim().slice(0, 12)
  const city = String(body?.city || '').trim().slice(0, 64)
  const idCountry = Number(body?.idCountry || 8) 

  const db = useClientDb(event)

  try {
    
    const existing = await db.get<any>(`SELECT id_supplier FROM ps_supplier WHERE name = ? LIMIT 1`, [name])
    if (existing) throw createError({ statusCode: 409, statusMessage: 'Un fournisseur avec ce nom existe déjà' })

    
    const ins = await db.run(
      `INSERT INTO ps_supplier (name, active, date_add, date_upd) VALUES (?, ?, NOW(), NOW())`,
      [name, active],
    )
    const newId = ins.insertId
    if (!newId) throw createError({ statusCode: 500, statusMessage: 'Échec création' })

    
    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(
        `INSERT INTO ps_supplier_lang (id_supplier, id_lang, description, meta_title, meta_description)
         VALUES (?, ?, ?, '', '')`,
        [newId, Number(l.id_lang), description],
      )
    }

    
    await db.run(`INSERT IGNORE INTO ps_supplier_shop (id_supplier, id_shop) VALUES (?, 1)`, [newId])

    
    if (phone || phoneMobile || address1 || city) {
      await db.run(
        `INSERT INTO ps_address
          (id_country, id_supplier, alias, lastname, firstname, address1, postcode, city,
           phone, phone_mobile, date_add, date_upd, active, deleted)
         VALUES (?, ?, 'supplier', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
        [idCountry, newId, name.slice(0, 100), 'Contact', address1 || '—', postcode, city || '—', phone, phoneMobile],
      )
    }

    return { ok: true, id: newId }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/suppliers POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB : ' + (err?.message || '') })
  }
})
