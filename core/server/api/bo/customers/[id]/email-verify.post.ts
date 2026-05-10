/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

/**
 * POST /api/bo/customers/{id}/email-verify
 *
 * SMTP RCPT TO probe on the customer's email + persistence in
 * cs_customer_extra.email_verified_status / email_verified_at (UPSERT
 * — the extra record may not exist as long as no metadata has been
 * entered). Canonical email re-read server-side (client-side fraud prevention).
 *
 * Parallel logic to /api/bo/leads/{id}/email-verify with source=
 * 'customer-noorder', but dedicated URL for /hub/contacts (separation
 * of concerns).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const db = useClientDb(event)

  const row = await db.get<any>(
    `SELECT email FROM cs_main.ps_customer WHERE id_customer = ? AND deleted = 0`,
    [id],
  )
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Client introuvable' })
  const email = String(row.email || '')
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email vide' })

  const result = await verifyEmailViaSmtp(email)
  const verifiedAt = new Date()
  let persisted = false

  try {
    const upd = await db.run(
      `UPDATE cs_main.cs_customer_extra
          SET email_verified_status = ?, email_verified_at = NOW(), date_upd = NOW()
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
  } catch (err: any) {
    // Drift schéma (colonnes pas encore propagées) → on remonte le résultat
    // sans persister plutôt que de 500.
    console.warn('[bo/customers/email-verify] persist skipped:', err?.message)
  }

  return {
    ok: true,
    id,
    email,
    persisted,
    status:  result.status,
    code:    result.code ?? null,
    detail:  result.detail ?? null,
    mxHost:  result.mxHost ?? null,
    verifiedAt: verifiedAt.toISOString(),
  }
})
