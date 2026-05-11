

import { useClientDb } from '~/server/utils/db'

interface ImportBody {
  rows: Record<string, any>[]
  mapping: {
    name?: string
    active?: string
    phone?: string
    phoneMobile?: string
    address1?: string
    postcode?: string
    city?: string
    description?: string
  }
  createMissing?: boolean
}

function toBool(v: any): 0 | 1 | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'oui', 'yes', 'y', 'actif', 'active'].includes(s)) return 1
  if (['0', 'false', 'non', 'no', 'n', 'inactif', 'inactive'].includes(s)) return 0
  return undefined
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)
  if (!body || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, message: 'Body invalide : rows manquant' })
  }
  const mapping = body.mapping || {}
  if (!mapping.name) {
    throw createError({ statusCode: 400, message: 'Mapping minimal requis : nom' })
  }

  const db = useClientDb(event)
  const stats = {
    total: body.rows.length,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>,
  }

  
  const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const pick = (field?: string) => (field && row[field] !== undefined ? row[field] : undefined)

    const nameRaw = pick(mapping.name)
    const name = nameRaw ? String(nameRaw).trim().slice(0, 64) : ''
    if (!name) {
      stats.skipped++
      stats.errors.push({ row: i + 1, reason: 'nom vide' })
      continue
    }

    const active = toBool(pick(mapping.active))
    const phoneRaw = pick(mapping.phone)
    const phoneMobileRaw = pick(mapping.phoneMobile)
    const address1Raw = pick(mapping.address1)
    const postcodeRaw = pick(mapping.postcode)
    const cityRaw = pick(mapping.city)
    const descriptionRaw = pick(mapping.description)

    const phone = phoneRaw !== undefined ? String(phoneRaw).trim().slice(0, 32) : undefined
    const phoneMobile = phoneMobileRaw !== undefined ? String(phoneMobileRaw).trim().slice(0, 32) : undefined
    const address1 = address1Raw !== undefined ? String(address1Raw).trim().slice(0, 128) : undefined
    const postcode = postcodeRaw !== undefined ? String(postcodeRaw).trim().slice(0, 12) : undefined
    const city = cityRaw !== undefined ? String(cityRaw).trim().slice(0, 64) : undefined
    const description = descriptionRaw !== undefined ? String(descriptionRaw) : undefined

    const hasContact = phone !== undefined || phoneMobile !== undefined
      || address1 !== undefined || postcode !== undefined || city !== undefined

    try {
      const existing = await db.get<any>(
        `SELECT id_supplier FROM ps_supplier WHERE name = ? LIMIT 1`,
        [name],
      )

      if (existing?.id_supplier) {
        const id = Number(existing.id_supplier)

        
        if (active !== undefined) {
          await db.run(
            `UPDATE ps_supplier SET active = ?, date_upd = NOW() WHERE id_supplier = ?`,
            [active, id],
          )
        }

        
        if (description !== undefined) {
          await db.run(
            `UPDATE ps_supplier_lang SET description = ? WHERE id_supplier = ? AND id_lang = 1`,
            [description, id],
          )
        }

        
        if (hasContact) {
          const addr = await db.get<any>(
            `SELECT id_address FROM ps_address WHERE id_supplier = ? AND deleted = 0 LIMIT 1`,
            [id],
          )
          if (addr) {
            
            const f: string[] = []
            const p: any[] = []
            if (phone !== undefined) { f.push('phone = ?'); p.push(phone) }
            if (phoneMobile !== undefined) { f.push('phone_mobile = ?'); p.push(phoneMobile) }
            if (address1 !== undefined) { f.push('address1 = ?'); p.push(address1 || '—') }
            if (postcode !== undefined) { f.push('postcode = ?'); p.push(postcode) }
            if (city !== undefined) { f.push('city = ?'); p.push(city || '—') }
            if (f.length) {
              f.push('date_upd = NOW()')
              await db.run(
                `UPDATE ps_address SET ${f.join(', ')} WHERE id_address = ?`,
                [...p, addr.id_address],
              )
            }
          } else {
            
            await db.run(
              `INSERT INTO ps_address
                (id_country, id_supplier, alias, lastname, firstname, address1, postcode, city,
                 phone, phone_mobile, date_add, date_upd, active, deleted)
               VALUES (?, ?, 'supplier', ?, 'Contact', ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
              [8, id, name.slice(0, 100), address1 || '—', postcode || '', city || '—', phone || '', phoneMobile || ''],
            )
          }
        }
        stats.updated++
      } else if (body.createMissing) {
        
        const ins = await db.run(
          `INSERT INTO ps_supplier (name, active, date_add, date_upd) VALUES (?, ?, NOW(), NOW())`,
          [name, active ?? 1],
        )
        const newId = Number(ins.insertId || 0)
        if (!newId) throw new Error('id_supplier introuvable après INSERT')

        for (const l of langs) {
          await db.run(
            `INSERT INTO ps_supplier_lang (id_supplier, id_lang, description, meta_title, meta_description)
             VALUES (?, ?, ?, '', '')`,
            [newId, Number(l.id_lang), description || ''],
          )
        }

        await db.run(
          `INSERT IGNORE INTO ps_supplier_shop (id_supplier, id_shop) VALUES (?, 1)`,
          [newId],
        )

        if (hasContact) {
          await db.run(
            `INSERT INTO ps_address
              (id_country, id_supplier, alias, lastname, firstname, address1, postcode, city,
               phone, phone_mobile, date_add, date_upd, active, deleted)
             VALUES (?, ?, 'supplier', ?, 'Contact', ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
            [8, newId, name.slice(0, 100), address1 || '—', postcode || '', city || '—', phone || '', phoneMobile || ''],
          )
        }
        stats.created++
      } else {
        stats.skipped++
      }
    } catch (err: any) {
      stats.errors.push({ row: i + 1, reason: err.message || String(err) })
    }
  }

  return { success: true, stats }
})
