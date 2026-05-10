/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

/**
 * POST /api/bo/leads/{id}/email-verify — SMTP RCPT TO probe on the email of a
 * lead/customer-noorder/contact + persistence of the status on the source table side.
 *
 * Body { source, email }. The target table depends on the source:
 *   - lead              → cs_smartlead.email_verified_status (PK = id_ac_smartlead)
 *   - customer-noorder  → cs_customer_extra.email_verified_status (PK = id_customer,
 * UPSERT because the extra record may not exist yet)
 *   - contact           → cs_headlesscontact_message.email_verified_status (PK = id_message)
 *
 * For each source, we re-read the canonical email server-side (anti-cheat
 * client-side). Returns the raw details for the modal.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event) as { source?: string; email?: string }
  const source = (body?.source || 'lead').trim()

  const db = useClientDb(event)

  // Email canonique côté serveur, par source.
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
      // UPSERT : la fiche customer_extra peut ne pas exister encore (ex:
      // boutique sans enrichissement INSEE qui aurait déjà créé le row).
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
    // Drift schéma (colonnes pas encore propagées au tenant) → on remonte
    // le résultat sans persistance plutôt que de 500.
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
