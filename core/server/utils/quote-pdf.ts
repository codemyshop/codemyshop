

import PDFDocument from 'pdfkit'
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

interface QuoteRow {
  id_quote_request: number
  firstname:        string
  lastname:         string
  email:            string
  phone:            string | null
  company:          string
  siret:            string | null
  activite:         string | null
  message:          string | null
  total_items:      number
  date_add:         Date
  
  legal_name:       string | null
  naf_code:         string | null
  naf_label:        string | null
  postal_code:      string | null
  city_insee:       string | null
  address_insee:    string | null
  staff_size:       string | null
}
interface QuoteItemRow {
  id_product: number
  name:       string
  reference:  string | null
  quantity:   number
  price?:     number   
}

const fmtPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export async function generateQuoteRequestPdf(idQuoteRequest: number): Promise<Buffer | null> {
  const d = usePocPg()

  const quoteRows = await d.execute(sql`
    SELECT id_quote_request, firstname, lastname, email, phone, company, siret,
           activite, message, total_items, date_add,
           legal_name, naf_code, naf_label, postal_code, city_insee, address_insee, staff_size
      FROM cs_main.cs_quote_request
     WHERE id_quote_request = ${idQuoteRequest}
     LIMIT 1
  `) as unknown as QuoteRow[]
  const quote = quoteRows[0]
  if (!quote) return null

  const itemRows = await d.execute(sql`
    SELECT i.id_product, i.name, i.reference, i.quantity,
           p.price AS price
      FROM cs_main.cs_quote_request_item i
      LEFT JOIN cs_main.ps_product p ON p.id_product = i.id_product
     WHERE i.id_quote_request = ${idQuoteRequest}
     ORDER BY i.id_quote_request_item ASC
  `) as unknown as QuoteItemRow[]
  let totalHt = 0
  for (const it of itemRows) {
    const u = Number(it.price) || 0
    totalHt += u * it.quantity
  }

  const shopRows = await d.execute(sql`
    SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1
  `) as unknown as { value: string }[]
  const shopName = shopRows[0]?.value || 'Example Shop'

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const green = '#65a30d'   
    const dark  = '#1e293b'
    const gray  = '#64748b'
    const light = '#e2e8f0'

    
    doc.rect(0, 0, doc.page.width, 70).fill(green)
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text(shopName, 50, 24)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
      .text('Demande de devis B2B', 50, 50)
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
      .text(`Q-${quote.id_quote_request}`, doc.page.width - 150, 30, { width: 100, align: 'right' })
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
      .text(new Date(quote.date_add).toLocaleDateString('fr-FR'), doc.page.width - 150, 50, { width: 100, align: 'right' })

    let y = 100

    
    doc.fillColor(green).fontSize(11).font('Helvetica-Bold')
      .text('CLIENT', 50, y)
    y += 18
    
    const displayCompany = quote.legal_name || quote.company
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold')
      .text(`${quote.firstname} ${quote.lastname}`, 50, y)
    y += 14
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(displayCompany, 50, y)
    y += 12
    if (quote.siret) {
      doc.text(`SIRET : ${quote.siret}`, 50, y)
      y += 12
    }
    
    if (quote.address_insee || quote.postal_code || quote.city_insee) {
      const addr = [quote.address_insee, [quote.postal_code, quote.city_insee].filter(Boolean).join(' ')]
        .filter(Boolean).join(', ')
      doc.text(`Adresse : ${addr}`, 50, y)
      y += 12
    }
    
    if (quote.naf_code || quote.naf_label) {
      const napLine = [quote.naf_code, quote.naf_label].filter(Boolean).join(' — ')
      doc.text(`Activité INSEE : ${napLine}`, 50, y)
      y += 12
    } else if (quote.activite) {
      doc.text(`Activité : ${quote.activite}`, 50, y)
      y += 12
    }
    if (quote.staff_size) {
      doc.text(`Effectif : ${quote.staff_size}`, 50, y)
      y += 12
    }
    doc.text(`Email : ${quote.email}`, 50, y)
    y += 12
    if (quote.phone) {
      doc.text(`Téléphone : ${quote.phone}`, 50, y)
      y += 12
    }

    y += 12
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 20

    
    doc.fillColor(green).fontSize(11).font('Helvetica-Bold')
      .text(`PRODUITS DEMANDÉS (${quote.total_items} unité${quote.total_items > 1 ? 's' : ''})`, 50, y)
    y += 18

    
    const colProd = 50, colRef = 270, colQty = 360, colPu = 410, colSub = 480
    doc.fillColor(gray).fontSize(8).font('Helvetica-Bold')
      .text('PRODUIT', colProd, y)
      .text('RÉF.', colRef, y)
      .text('QTÉ', colQty, y, { width: 30, align: 'right' })
      .text('PU HT', colPu, y, { width: 50, align: 'right' })
      .text('S.-TOTAL HT', colSub, y, { width: 70, align: 'right' })
    y += 14
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 8

    doc.fontSize(9).font('Helvetica').fillColor(dark)
    for (const it of itemRows) {
      if (y > doc.page.height - 100) {
        doc.addPage()
        y = 50
      }
      const unit = Number(it.price) || 0
      const subtotal = unit * it.quantity
      doc.fillColor(dark).text(it.name.slice(0, 50), colProd, y, { width: 215 })
      doc.fillColor(gray).text(it.reference || '—', colRef, y, { width: 85 })
      doc.fillColor(dark).text(String(it.quantity), colQty, y, { width: 30, align: 'right' })
      doc.fillColor(gray).text(unit > 0 ? fmtPrice(unit) : '—', colPu, y, { width: 50, align: 'right' })
      doc.fillColor(dark).font('Helvetica-Bold').text(subtotal > 0 ? fmtPrice(subtotal) : '—', colSub, y, { width: 70, align: 'right' })
      doc.font('Helvetica')
      y += 16
    }

    y += 8
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(light).lineWidth(0.5).stroke()
    y += 14

    
    doc.fillColor(dark).fontSize(11).font('Helvetica-Bold')
      .text('TOTAL HT', colPu - 60, y, { width: 110, align: 'right' })
      .fillColor(green)
      .text(totalHt > 0 ? fmtPrice(totalHt) : 'Sur devis', colSub, y, { width: 70, align: 'right' })
    y += 22

    doc.fillColor(gray).fontSize(8).font('Helvetica-Oblique')
      .text(
        'Tarif catalogue HT — sujet à négociation commerciale selon volumes et récurrence. La TVA s\'applique selon votre situation fiscale.',
        50, y, { width: doc.page.width - 100, align: 'left' },
      )
    y += 24

    
    doc.fillColor(green).fontSize(11).font('Helvetica-Bold')
      .text('PROPOSITION TARIFAIRE PERSONNALISÉE', 50, y)
    y += 18
    doc.fillColor(dark).fontSize(10).font('Helvetica')
      .text(
        'Notre équipe revient vers vous sous 24-48h ouvrées avec une proposition tarifaire ajustée selon vos volumes et conditions de paiement.',
        50, y, { width: doc.page.width - 100, align: 'left' },
      )
    y += 36

    if (quote.message) {
      doc.fillColor(green).fontSize(11).font('Helvetica-Bold')
        .text('VOTRE MESSAGE', 50, y)
      y += 16
      doc.fillColor(gray).fontSize(9).font('Helvetica')
        .text(quote.message, 50, y, { width: doc.page.width - 100, align: 'left' })
    }

    
    const footerY = doc.page.height - 40
    doc.fontSize(7).fillColor(gray).font('Helvetica')
      .text(
        `${shopName} — Document généré automatiquement le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        50, footerY, { width: doc.page.width - 100, align: 'center' },
      )

    doc.end()
  })
}
