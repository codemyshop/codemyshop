

import PDFDocument from 'pdfkit'
import { resolveClientId } from '~/server/utils/db'
import { getGiftcardByPdfToken } from '~/server/utils/giftcard'

export default defineEventHandler(async (event) => {
  const code = decodeURIComponent(getRouterParam(event, 'code') || '')
  const { token } = getQuery(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'token requis' })

  const card = await getGiftcardByPdfToken(String(token))
  if (!card) throw createError({ statusCode: 404, statusMessage: 'Carte introuvable' })
  if (card.code.toLowerCase() !== code.toLowerCase()) {
    throw createError({ statusCode: 404, statusMessage: 'Carte introuvable' })
  }

  
  const clientId = resolveClientId(event)
  if (card.client_id !== clientId) {
    throw createError({ statusCode: 404, statusMessage: 'Carte introuvable' })
  }

  
  const doc = new PDFDocument({ size: 'A6', layout: 'landscape', margin: 24 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const amount = (card.amount_cents / 100).toLocaleString('fr-FR', {
    style: 'currency', currency: card.currency || 'EUR',
  })
  const expires = new Date(card.expires_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  doc
    .fontSize(11).fillColor('#888')
    .text('CARTE CADEAU', { align: 'center' })

  doc.moveDown(0.5)
  doc.fontSize(28).fillColor('#111').text(amount, { align: 'center' })

  doc.moveDown(0.8)
  doc.fontSize(10).fillColor('#666').text('Code à utiliser sur la boutique', { align: 'center' })
  doc.moveDown(0.3)
  doc.fontSize(20).fillColor('#000').font('Courier-Bold').text(card.code, { align: 'center' })
  doc.font('Helvetica')

  if (card.recipient_name || card.purchaser_name) {
    doc.moveDown(0.8)
    doc.fontSize(9).fillColor('#666')
    if (card.recipient_name) doc.text(`Pour : ${card.recipient_name}`, { align: 'center' })
    if (card.purchaser_name) doc.text(`De : ${card.purchaser_name}`, { align: 'center' })
  }

  if (card.personal_message) {
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor('#444').font('Helvetica-Oblique')
      .text(`« ${card.personal_message} »`, { align: 'center' })
    doc.font('Helvetica')
  }

  doc.moveDown(0.8)
  doc.fontSize(8).fillColor('#999').text(`Valable jusqu'au ${expires}`, { align: 'center' })

  doc.end()
  const pdf = await done

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="carte-cadeau-${card.code}.pdf"`)
  setHeader(event, 'Cache-Control', 'private, max-age=0, no-store')
  return pdf
})
