

import { useClientDb } from '~/server/utils/db'
import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event) as { source?: string; email?: string }
  const source = (body?.source || 'lead').trim()

  const db = useClientDb(event)

  
  let email = ''
  if (source === 'lead') {
    const row = await db.get<any>(
      `SELECT email FROM cs_main.cs_smartlead WHERE id_ac_smartlead = ?`,
      [id],
    )
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Lead introuvable' })
    email = String(row.email || '')
  } else if (source === 'customer-noorder') {
    const row = await db.get<any>(
      `SELECT email FROM cs_main.ps_customer WHERE id_customer = ?`,
      [id],
    )
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Client introuvable' })
    email = String(row.email || '')
  } else if (source === 'contact') {
    const row = await db.get<any>(
      `SELECT email FROM cs_main.cs_headlesscontact_message WHERE id_message = ?`,
      [id],
    )
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Message introuvable' })
    email = String(row.email || '')
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Source invalide' })
  }
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email vide' })

  const result = await verifyEmailViaSmtp(email)
  const verifiedAt = new Date()
  let persisted = false

  try {
    if (source === 'lead') {
      const { affectedRows } = await db.run(
        `UPDATE cs_main.cs_smartlead
            SET email_verified_status = ?, email_verified_at = NOW(),
                date_upd = CURRENT_TIMESTAMP
          WHERE id_ac_smartlead = ?`,
        [result.status, id],
      )
      persisted = Boolean(affectedRows)
    } else if (source === 'customer-noorder') {
      
      
      const upd = await db.run(
        `UPDATE cs_main.cs_customer_extra
            SET email_verified_status = ?, email_verified_at = NOW(),
                date_upd = CURRENT_TIMESTAMP
          WHERE id_customer = ?`,
        [result.status, id],
      )
      if (upd.affectedRows) {
        persisted = true
      } else {
        await db.run(
          `INSERT INTO cs_main.cs_customer_extra
              (id_customer, email_verified_status, email_verified_at, date_add, date_upd)
            VALUES (?, ?, NOW(), NOW(), NOW())`,
          [id, result.status],
        )
        persisted = true
      }
    } else if (source === 'contact') {
      const { affectedRows } = await db.run(
        `UPDATE cs_main.cs_headlesscontact_message
            SET email_verified_status = ?, email_verified_at = NOW(),
                date_upd = NOW()
          WHERE id_message = ?`,
        [result.status, id],
      )
      persisted = Boolean(affectedRows)
    }
  } catch (err: any) {
    
    
    console.warn('[bo/leads/email-verify] persist skipped:', err?.message)
  }

  return {
    ok: true,
    id,
    email,
    source,
    persisted,
    status:  result.status,
    code:    result.code ?? null,
    detail:  result.detail ?? null,
    mxHost:  result.mxHost ?? null,
    verifiedAt: verifiedAt.toISOString(),
  }
})
