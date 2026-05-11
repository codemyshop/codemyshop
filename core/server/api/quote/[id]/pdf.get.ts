

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
