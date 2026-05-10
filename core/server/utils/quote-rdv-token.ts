/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * HMAC token to prefill /rdv from the quote acknowledgment email.
 *
 * Dedicated scope (`quote-rdv:<id>`) — separate from the PDF token (`quote-pdf:<id>`) for
 * compartmentalizing privileges: a leaked appointment link does not grant access to the PDF
 * salesperson, and vice versa.
 *
 * No token expiration: the quote acknowledgment and associated appointment booking
 * can be accessed weeks later. The payload exposed via
 * /api/rdv/prefill is limited to information already entered by the prospect themselves.
 */
import { createHmac } from 'node:crypto'

function secret(): string {
  return process.env.NUXT_SECRET || process.env.QUOTE_PDF_SECRET || 'dev-fallback-not-for-prod'
}

export function signQuoteRdvToken(idQuoteRequest: number): string {
  // Encodage hex (64 chars, alphabet 0-9 a-f) plutôt que base64url. Évite
  // les `_` et `-` qui peuvent casser dans certains clients mail (linkify
  // qui coupe sur underscore, word-break mobile, anti-phishing qui réécrit
  // les liens "suspects"). 64 chars vs 43 en b64url : on échange 21 chars
  // contre une URL 100% safe sur tout client.
  return createHmac('sha256', secret())
    .update(`quote-rdv:${idQuoteRequest}`)
    .digest('hex')
}

export function verifyQuoteRdvToken(idQuoteRequest: number, token: string): boolean {
  if (!token) return false
  return token === signQuoteRdvToken(idQuoteRequest)
}
