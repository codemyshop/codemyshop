

import PDFDocument from 'pdfkit'

export interface ContractData {
  company: string
  contactName?: string
  email: string
  revenue: string
  needs: string
  setupPrice: string
  mrrPrice: string
  date: string
  projectId?: number
}

export function generateContract(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const violet = '#7C3AED'
    const dark = '#1a1a2e'
    const gray = '#64748b'
    const black = '#1e293b'

    
    doc.rect(0, 0, doc.page.width, 80).fill(dark)
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('CodeMyShop', 60, 28)
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text('Infrastructure e-commerce souveraine', 60, 54)
    doc.fillColor(violet).fontSize(9)
      .text('CONTRAT DE PRESTATION', doc.page.width - 250, 35, { width: 190, align: 'right' })
    doc.fillColor(gray).fontSize(8)
      .text(`Réf. CMS-${data.date.replace(/-/g, '')}-${data.projectId ?? '001'}`, doc.page.width - 250, 50, { width: 190, align: 'right' })

    let y = 110

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('ENTRE LES SOUSSIGNÉS', 60, y)
    y += 24

    doc.fillColor(black).fontSize(9).font('Helvetica-Bold')
      .text('Le Prestataire :', 60, y)
    doc.font('Helvetica').fillColor(gray)
      .text('CodeMyShop — Entrepreneur individuel', 160, y)
    y += 14
    doc.text('SIRET 51090359400057 — Metz, France', 160, y)
    y += 14
    doc.text('Marque CodeMyShop — EUIPO n° 019334553', 160, y)
    y += 22

    doc.fillColor(black).font('Helvetica-Bold')
      .text('Le Client :', 60, y)
    doc.font('Helvetica').fillColor(gray)
      .text(data.company, 160, y)
    y += 14
    doc.text(`Contact : ${data.contactName || data.email}`, 160, y)
    y += 14
    doc.text(`Email : ${data.email}`, 160, y)
    y += 14
    if (data.revenue) {
      doc.text(`CA annuel déclaré : ${data.revenue}`, 160, y)
      y += 14
    }

    y += 16
    doc.moveTo(60, y).lineTo(doc.page.width - 60, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    y += 20

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('ARTICLE 1 — OBJET', 60, y)
    y += 18
    doc.fillColor(black).fontSize(9).font('Helvetica').lineGap(4)
      .text(
        'Le Prestataire s\'engage à fournir au Client une infrastructure e-commerce sur mesure comprenant :',
        60, y, { width: doc.page.width - 120 },
      )
    y += 30

    const services = [
      'Architecture headless (PrestaShop + Nuxt 3) sur mesure',
      'VPS dédié hébergé en France (OVH) — administration incluse',
      'Suite IA complète (contenus SEO, fiches produits, publication automatisée)',
      'Analytics Matomo self-hosted (First-Party Data)',
      'Hub marketing (Broadcast, CRM, Nurturing)',
      'Accompagnement stratégique continu par l\'architecte',
      'Zéro commission sur les ventes',
    ]

    for (const s of services) {
      doc.fillColor(violet).fontSize(8).text('●', 70, y)
      doc.fillColor(black).fontSize(9).font('Helvetica').text(s, 85, y, { width: doc.page.width - 150 })
      y += 16
    }

    if (data.needs) {
      y += 8
      doc.fillColor(gray).fontSize(8).font('Helvetica-Oblique')
        .text(`Besoins spécifiques exprimés : ${data.needs}`, 60, y, { width: doc.page.width - 120 })
      y += 20
    }

    y += 10
    doc.moveTo(60, y).lineTo(doc.page.width - 60, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    y += 20

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('ARTICLE 2 — INVESTISSEMENT', 60, y)
    y += 22

    
    doc.fillColor(black).fontSize(10).font('Helvetica-Bold')
      .text('Frais de mise en service (setup)', 60, y)
    doc.fillColor(violet).text(`${data.setupPrice} € HT`, doc.page.width - 200, y, { width: 140, align: 'right' })
    y += 18
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text('TVA non applicable — article 293 B du CGI', 60, y)
    y += 16
    doc.text('Échéancier : 30% à la signature — 40% à mi-parcours — 30% à la livraison', 60, y)
    y += 16
    doc.text('Règlement par virement bancaire sous 15 jours', 60, y)
    y += 22

    
    doc.fillColor(black).fontSize(10).font('Helvetica-Bold')
      .text('Abonnement infrastructure mensuel', 60, y)
    doc.fillColor(violet).text(`${data.mrrPrice} € HT /mois`, doc.page.width - 200, y, { width: 140, align: 'right' })
    y += 18
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text('Prélèvement automatique via Stripe. Premier prélèvement à la mise en production.', 60, y)
    y += 16
    doc.text('Résiliable à tout moment avec un préavis de 30 jours.', 60, y)

    y += 30
    doc.moveTo(60, y).lineTo(doc.page.width - 60, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    y += 20

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('ARTICLE 3 — PROPRIÉTÉ & SOUVERAINETÉ', 60, y)
    y += 18
    doc.fillColor(black).fontSize(9).font('Helvetica').lineGap(4)
      .text(
        'Le Client est propriétaire de son code source personnalisé, de ses données et de son serveur. ' +
        'Le socle CodeMyShop reste sous licence non exclusive du Prestataire. ' +
        'Toutes les données sont hébergées en France (OVH), soumises au droit français et européen. ' +
        'Aucune donnée ne transite par des infrastructures soumises au CLOUD Act.',
        60, y, { width: doc.page.width - 120 },
      )
    y += 55

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('ARTICLE 4 — DURÉE & RÉSILIATION', 60, y)
    y += 18
    doc.fillColor(black).fontSize(9).font('Helvetica').lineGap(4)
      .text(
        'Délai de mise en production : 4 à 8 semaines. ' +
        'L\'abonnement est résiliable à tout moment avec 30 jours de préavis. ' +
        'En cas de résiliation, le Client conserve l\'intégralité de son code, ses données et son serveur.',
        60, y, { width: doc.page.width - 120 },
      )
    y += 50

    
    doc.fillColor(gray).fontSize(7).font('Helvetica')
      .text(
        'Les présentes sont complétées par les Conditions Générales de Vente disponibles sur https://codemyshop.com/conditions-generales-de-vente ' +
        'et la Politique de Confidentialité sur https://codemyshop.com/politique-confidentialite. ' +
        'Droit applicable : droit français. Tribunaux compétents : Metz.',
        60, y, { width: doc.page.width - 120 },
      )

    y += 40
    doc.moveTo(60, y).lineTo(doc.page.width - 60, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    y += 30

    
    doc.fillColor(violet).fontSize(11).font('Helvetica-Bold')
      .text('SIGNATURES', 60, y)
    y += 24

    const colW = (doc.page.width - 120) / 2

    
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold')
      .text('Le Prestataire', 60, y)
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text('CodeMyShop', 60, y + 16)
    doc.text(`Fait à Metz, le ${data.date}`, 60, y + 30)
    doc.text('Signature :', 60, y + 50)

    
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold')
      .text('Le Client', 60 + colW, y)
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text(data.company, 60 + colW, y + 16)
    doc.text(`Fait à ____________, le ${data.date}`, 60 + colW, y + 30)
    doc.text('Signature + mention "Lu et approuvé" :', 60 + colW, y + 50)

    
    doc.fillColor(gray).fontSize(6).font('Helvetica')
      .text(
        'CodeMyShop — Marque d\'CodeMyShop — SIRET 51090359400057 — EUIPO 019334553 — contact@codemyshop.com',
        60, doc.page.height - 40, { width: doc.page.width - 120, align: 'center' },
      )

    doc.end()
  })
}
