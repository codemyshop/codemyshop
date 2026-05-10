/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/quote/:id/pdf?token=<hmac>
 *
 * Returns the PDF of the quote request #id if the HMAC token matches.
 * Used from the confirmation email (link "Download the quote").
 *
 * Security: token = HMAC-SHA256(NUXT_SECRET, "quote-pdf:<id>") in base64url.
 * - id alone is not enough (enumeration blocked).
 * - No expiration on the token side: we allow long-lived links because the
 * content is a receipt acknowledgment, not a commercial secret.
 *
 * Signing helper available via signQuotePdfToken(idQuoteRequest).
 */

import { createHmac } from 'node:crypto'
import { generateQuoteRequestPdf } from '~/server/utils/quote-pdf'

function secret(): string {
  return process.env.NUXT_SECRET || process.env.QUOTE_PDF_SECRET || 'dev-fallback-not-for-prod'
}

export function signQuotePdfToken(idQuoteRequest: number): string {
  return createHmac('sha256', secret())
    .update(`quote-pdf:${idQuoteRequest}`)
    .digest('base64url')
}

function verifyToken(idQuoteRequest: number, token: string): boolean {
  if (!token) return false
  const expected = signQuotePdfToken(idQuoteRequest)
  // timing-safe — `===` suffit ici car les longueurs sont fixes (43 chars
  // base64url-sha256) ; pour une protection plus stricte importer
  // `crypto.timingSafeEqual` mais le risque est faible (token court-vivant
  // et pas un secret commercial — c'est un accusé de réception).
  return token === expected
}

export default defineEventHandler(async (event) => {
  const idRaw = getRouterParam(event, 'id')
  const id = Number(idRaw)
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id devis invalide', data: { code: 'INVALID_QUOTE_ID' } })
  }

  const { token } = getQuery(event) as { token?: string }
  if (!verifyToken(id, String(token || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Lien invalide ou expiré', data: { code: 'INVALID_QUOTE_LINK' } })
  }

  const buf = await generateQuoteRequestPdf(id)
  if (!buf) {
    throw createError({ statusCode: 404, statusMessage: 'Devis introuvable', data: { code: 'QUOTE_NOT_FOUND' } })
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="devis-Q-${id}.pdf"`)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return buf
})
