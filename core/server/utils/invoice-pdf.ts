

import PDFDocument from 'pdfkit'
import type { OrderData } from '~/server/connectors/base'

export function generateInvoicePdf(order: OrderData, shopName: string, accentColor = '#4F46E5'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const dark = '#1e293b'
    const gray = '#64748b'
    const accent = accentColor

    const formatPrice = (n: number) =>
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    const formatDate = (d: string) =>
      d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

    
    doc.fontSize(20).fillColor(dark).text(shopName, 50, 50)
    doc.fontSize(10).fillColor(gray).text('Facture', 50, 75)

    
    const rightX = 350
    doc.fontSize(10).fillColor(dark)
    if (order.invoiceNumber) {
      doc.text(`Facture n° ${order.invoiceNumber}`, rightX, 50, { width: 200, align: 'right' })
    }
    doc.fontSize(9).fillColor(gray)
    doc.text(`Commande #${order.reference}`, rightX, 67, { width: 200, align: 'right' })
    doc.text(`Date : ${formatDate(order.invoiceDate || order.dateAdd)}`, rightX, 82, { width: 200, align: 'right' })

    
    doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e2e8f0').lineWidth(1).stroke()

    
    let y = 125

    if (order.addressInvoice || order.addressDelivery) {
      const addr = order.addressInvoice || order.addressDelivery!
      doc.fontSize(9).fillColor(gray).text('Adresse de facturation', 50, y)
      y += 14
      doc.fontSize(10).fillColor(dark)
      if (addr.company) { doc.text(addr.company, 50, y); y += 13 }
      doc.text(`${addr.firstname} ${addr.lastname}`, 50, y); y += 13
      doc.text(addr.address1, 50, y); y += 13
      if (addr.address2) { doc.text(addr.address2, 50, y); y += 13 }
      doc.text(`${addr.postcode} ${addr.city}`, 50, y); y += 13
      if (addr.phone) { doc.text(addr.phone, 50, y); y += 13 }
    }

    if (order.addressDelivery && order.addressInvoice) {
      let dy = 125
      const addr = order.addressDelivery
      doc.fontSize(9).fillColor(gray).text('Adresse de livraison', 300, dy)
      dy += 14
      doc.fontSize(10).fillColor(dark)
      if (addr.company) { doc.text(addr.company, 300, dy); dy += 13 }
      doc.text(`${addr.firstname} ${addr.lastname}`, 300, dy); dy += 13
      doc.text(addr.address1, 300, dy); dy += 13
      if (addr.address2) { doc.text(addr.address2, 300, dy); dy += 13 }
      doc.text(`${addr.postcode} ${addr.city}`, 300, dy); dy += 13
    }

    y = Math.max(y, 200) + 20

    
    doc.rect(50, y, 495, 22).fill('#f8fafc')
    doc.fontSize(8).fillColor(gray)
    doc.text('Produit', 55, y + 6, { width: 230 })
    doc.text('Réf.', 290, y + 6, { width: 60 })
    doc.text('Qté', 355, y + 6, { width: 40, align: 'center' })
    doc.text('P.U. TTC', 400, y + 6, { width: 65, align: 'right' })
    doc.text('Total TTC', 470, y + 6, { width: 70, align: 'right' })
    y += 26

    
    doc.fontSize(9).fillColor(dark)
    for (const item of order.items) {
      if (y > 720) {
        doc.addPage()
        y = 50
      }
      doc.text(item.name, 55, y, { width: 230 })
      doc.fillColor(gray).text(item.reference, 290, y, { width: 60 })
      doc.fillColor(dark).text(String(item.quantity), 355, y, { width: 40, align: 'center' })
      
      
      doc.text(formatPrice(item.priceTTC), 400, y, { width: 65, align: 'right' })
      doc.text(formatPrice(item.priceTTC * item.quantity), 470, y, { width: 70, align: 'right' })
      y += 14
      const hasPromo = item.priceHTBeforeDiscount && item.priceHTBeforeDiscount > 0
      if (hasPromo || item.reductionLabel) {
        doc.fontSize(7)
        if (hasPromo) {
          doc.fillColor('#dc2626').text(formatPrice(item.priceHTBeforeDiscount!) + ' HT', 400, y, {
            width: 65, align: 'right', strike: true,
          })
        }
        if (item.reductionLabel) {
          doc.fillColor('#dc2626').text(item.reductionLabel, 470, y, { width: 70, align: 'right' })
        }
        doc.fontSize(9).fillColor(dark)
        y += 12
      }
      y += 4
    }

    
    y += 8
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
    y += 12

    
    doc.fontSize(9).fillColor(gray)
    doc.text('Sous-total HT', 350, y, { width: 115 })
    doc.fillColor(dark).text(formatPrice(order.totalProducts), 470, y, { width: 70, align: 'right' })
    y += 16
    doc.fillColor(gray).text('Livraison TTC', 350, y, { width: 115 })
    doc.fillColor(dark).text(formatPrice(order.totalShipping), 470, y, { width: 70, align: 'right' })
    y += 20
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
    y += 10
    doc.fontSize(12).fillColor(accent).text('Total TTC', 350, y, { width: 115 })
    doc.text(formatPrice(order.totalPaidTTC), 470, y, { width: 70, align: 'right' })
    y += 20
    doc.fontSize(9).fillColor(gray)
    doc.text(`Paiement : ${order.payment}`, 350, y)

    
    doc.fontSize(7).fillColor(gray)
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${shopName}`,
      50, 780, { width: 495, align: 'center' },
    )

    doc.end()
  })
}
