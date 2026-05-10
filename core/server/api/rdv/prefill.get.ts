/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/rdv/prefill?id=<idQuoteRequest>&t=<hmac>
 *
 * Pre-fills /rdv from the quote confirmation email. Signed URL
 * (HMAC quote-rdv:<id>) to avoid exposing prospect contact details in
 * clear GET parameters — the old format `?prospectName=…&prospectEmail=…&…`
 * is fragile (email clients that truncate, `&` encoding misinterpreted by
 * some parsers, max URL length limits in webmail) and violates the principle
 * (zero user-visible content hardcoded in URL).
 *
 * The server reads cs_quote_request from the DB (source of truth) and returns the
 * payload needed for form pre-filling. If the HMAC is invalid or
 * the quote is not found, it falls back to 403 / 404 — the /rdv page ignores
 * it silently and offers an empty form.
 */
import { eq } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { quoteRequest } from '~/server/db/schema-pg/quote-request'
import { verifyQuoteRdvToken } from '~/server/utils/quote-rdv-token'

export default defineEventHandler(async (event) => {
  const { id: idRaw, t: token } = getQuery(event) as { id?: string; t?: string }
  const id = Number(idRaw)
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id devis invalide', data: { code: 'INVALID_QUOTE_ID' } })
  }
  if (!verifyQuoteRdvToken(id, String(token || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Lien invalide', data: { code: 'INVALID_QUOTE_LINK' } })
  }

  const rows = await usePocPg()
    .select({
      firstname: quoteRequest.firstname,
      lastname:  quoteRequest.lastname,
      email:     quoteRequest.email,
      phone:     quoteRequest.phone,
      siret:     quoteRequest.siret,
    })
    .from(quoteRequest)
    .where(eq(quoteRequest.idQuoteRequest, id))
    .limit(1)

  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Devis introuvable', data: { code: 'QUOTE_NOT_FOUND' } })
  }

  const fullName = `${row.firstname || ''} ${row.lastname || ''}`.trim()
  return {
    success:        true,
    quoteRef:       `Q-${id}`,
    prospectName:   fullName,
    prospectEmail:  row.email  || '',
    prospectPhone:  row.phone  || '',
    prospectSiret:  row.siret  || '',
  }
})
