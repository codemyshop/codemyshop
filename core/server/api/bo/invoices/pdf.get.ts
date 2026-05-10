/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import PDFDocument from 'pdfkit'
import { PassThrough } from 'stream'

/**
 * GET /api/bo/invoices/pdf?id=1809 — generates an invoice PDF from the DB.
 */
export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as { id?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const db = useClientDb(event)

  // Données facture
  const inv = await db.get<any>(`
    SELECT oi.*, o.reference, o.payment, o.date_add AS order_date,
           o.id_customer, o.id_address_delivery, o.id_address_invoice
    FROM ps_order_invoice oi
    JOIN ps_orders o ON o.id_order = oi.id_order
    WHERE oi.id_order_invoice = ?
  `, [Number(id)])
  if (!inv) throw createError({ statusCode: 404, message: 'Facture introuvable' })

  const customer = await db.get<any>(`SELECT firstname, lastname, email, company, siret FROM ps_customer WHERE id_customer = ?`, [inv.id_customer])
  const items = await db.query<any>(`
    SELECT product_name AS name, product_reference AS ref, product_quantity AS qty,
           ROUND(unit_price_tax_excl, 2) AS priceHT, ROUND(unit_price_tax_incl, 2) AS priceTTC,
           ROUND(total_price_tax_excl, 2) AS totalHT, ROUND(total_price_tax_incl, 2) AS totalTTC,
           ROUND(original_product_price, 2) AS priceHTBeforeDiscount,
           ROUND(reduction_percent, 2) AS reductionPercent,
           ROUND(reduction_amount, 2) AS reductionAmount
    FROM ps_order_detail WHERE id_order = ?
  `, [inv.id_order])
  const addr = await db.get<any>(`
    SELECT a.firstname, a.lastname, a.company, a.address1, a.address2, a.postcode, a.city, a.phone,
           cl.name AS country
    FROM ps_address a LEFT JOIN ps_country_lang cl ON cl.id_country = a.id_country AND cl.id_lang = 1
    WHERE a.id_address = ?
  `, [inv.id_address_invoice])

  // Shop info
  const shop = await db.get<any>(`SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_NAME'`) ?? { value: 'Boutique' }
  const shopAddr = await db.get<any>(`SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_ADDR1'`) ?? { value: '' }
  const shopCity = await db.get<any>(`SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_CITY'`) ?? { value: '' }
  const shopZip = await db.get<any>(`SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_CODE'`) ?? { value: '' }

  // Génération PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Facture ${inv.number || inv.id_order_invoice}`, Author: shop.value } })
  const stream = new PassThrough()
  doc.pipe(stream)

  const eur = (n: any) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

  // En-tête
  doc.fontSize(18).font('Helvetica-Bold').text(shop.value, 50, 50)
  doc.fontSize(8).font('Helvetica').fillColor('#666')
  doc.text([shopAddr.value, `${shopZip.value} ${shopCity.value}`].filter(Boolean).join(' — '), 50, 72)

  // Titre facture
  doc.moveDown(2)
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(`FACTURE N° ${inv.number || inv.id_order_invoice}`, { align: 'left' })
  doc.fontSize(9).font('Helvetica').fillColor('#444')
  doc.text(`Commande : ${inv.reference} du ${fmtDate(inv.order_date)}`)
  doc.text(`Date facture : ${fmtDate(inv.date_add)}`)
  doc.text(`Paiement : ${inv.payment}`)

  // Client
  doc.moveDown(1)
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Facturer à :')
  doc.fontSize(9).font('Helvetica').fillColor('#333')
  if (addr) {
    if (addr.company) doc.text(addr.company)
    doc.text(`${addr.firstname} ${addr.lastname}`)
    doc.text(addr.address1)
    if (addr.address2) doc.text(addr.address2)
    doc.text(`${addr.postcode} ${addr.city}`)
    doc.text(addr.country || '')
    if (addr.phone) doc.text(`Tél : ${addr.phone}`)
  }
  if (customer?.email) doc.text(`Email : ${customer.email}`)
  if (customer?.siret) doc.text(`SIRET : ${customer.siret}`)

  // Tableau produits
  const tableTop = doc.y + 20
  const col = { name: 50, ref: 280, qty: 350, price: 390, total: 470 }

  // Header
  doc.rect(50, tableTop, 510, 18).fill('#f3f4f6')
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
  doc.text('Produit', col.name + 4, tableTop + 5)
  doc.text('Réf.', col.ref, tableTop + 5)
  doc.text('Qté', col.qty, tableTop + 5)
  doc.text('Prix HT', col.price, tableTop + 5)
  doc.text('Total TTC', col.total, tableTop + 5)

  let y = tableTop + 22
  doc.font('Helvetica').fontSize(8).fillColor('#111')

  for (const item of items) {
    if (y > 720) { doc.addPage(); y = 50 }
    const name = String(item.name || '').substring(0, 45)
    doc.text(name, col.name + 4, y, { width: 225 })
    doc.text(item.ref || '', col.ref, y, { width: 65 })
    doc.text(String(item.qty), col.qty, y)
    doc.text(eur(item.priceHT), col.price, y)
    doc.text(eur(item.totalTTC), col.total, y)
    y += 11
    // Promo : prix avant remise (barré) + label "-X%" en rouge sous la ligne.
    const before = Number(item.priceHTBeforeDiscount || 0)
    const after = Number(item.priceHT || 0)
    if (before > 0 && before > after + 0.001) {
      const reductionPct = Number(item.reductionPercent || 0)
      const reductionAmt = Number(item.reductionAmount || 0)
      const label = reductionPct > 0
        ? `-${Math.round(reductionPct * 100)}%`
        : (reductionAmt > 0 ? `-${eur(reductionAmt)}` : `-${eur(before - after)}`)
      doc.fontSize(7).fillColor('#dc2626')
      doc.text(eur(before), col.price, y, { strike: true })
      doc.text(label, col.total, y)
      doc.fontSize(8).fillColor('#111')
      y += 10
    }
    y += 4
  }

  // Totaux
  y += 10
  doc.rect(370, y, 190, 1).fill('#d1d5db')
  y += 8
  doc.fontSize(9).font('Helvetica').fillColor('#374151')
  doc.text('Total produits HT', 370, y); doc.text(eur(inv.total_products), 480, y, { align: 'right', width: 80 })
  y += 14
  doc.text('Livraison TTC', 370, y); doc.text(eur(inv.total_shipping_tax_incl), 480, y, { align: 'right', width: 80 })
  if (Number(inv.total_discount_tax_incl) > 0) {
    y += 14
    doc.text('Remises', 370, y); doc.text('-' + eur(inv.total_discount_tax_incl), 480, y, { align: 'right', width: 80 })
  }
  y += 18
  doc.rect(370, y - 4, 190, 1).fill('#374151')
  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('Total TTC', 370, y); doc.text(eur(inv.total_paid_tax_incl), 480, y, { align: 'right', width: 80 })

  doc.end()

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="facture-${inv.number || inv.id_order_invoice}.pdf"`,
  })
  return sendStream(event, stream)
})
