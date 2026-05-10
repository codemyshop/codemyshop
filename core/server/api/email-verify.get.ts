/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

/**
 * GET /api/email-verify?email=foo@bar.com
 *
 * Light public wrapper over verifyEmailViaSmtp(). SMTP RCPT TO probe without
 * actual sending, used by public-facing forms (/contact, /devis,
 * /rdv) to verify that a professional email is properly received by its MX.
 *
 * We return neither the SMTP code nor the raw detail (anti-fingerprinting
 * MX that could be used for enumeration by attackers). Just the status
 * operational + the resolved MX (already public DNS).
 *
 * Statuts possibles :
 * - ok               : 250 RCPT TO → address accepted
 * - rejected         : 550/551/553/554 → mailbox does not exist
 *   - unknown          : 4xx / greylisting / serveur prudent → laisser passer
 * - mx_missing       : domain without MX → block
 * - connect_failed   : outbound port 25 blocked / timeout → allow
 * - invalid_input    : invalid email format → block
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const email = String(q.email ?? '').trim()
  if (!email) return { status: 'invalid_input' as const }
  const r = await verifyEmailViaSmtp(email)
  return { status: r.status, mxHost: r.mxHost ?? null }
})
