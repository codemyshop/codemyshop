

import { createHmac } from 'node:crypto'

function secret(): string {
  return process.env.NUXT_SECRET || process.env.QUOTE_PDF_SECRET || 'dev-fallback-not-for-prod'
}

export function signQuoteRdvToken(idQuoteRequest: number): string {
  
  
  
  
  
  return createHmac('sha256', secret())
    .update(`quote-rdv:${idQuoteRequest}`)
    .digest('hex')
}

export function verifyQuoteRdvToken(idQuoteRequest: number, token: string): boolean {
  if (!token) return false
  return token === signQuoteRdvToken(idQuoteRequest)
}
