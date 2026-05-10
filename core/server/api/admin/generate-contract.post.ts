/**
 *
 * POST /api/admin/generate-contract
 * Generates a contract PDF and sends it via email to the prospect.
 *
 * Body : { company, email, contactName?, revenue, needs?, setupPrice?, mrrPrice? }
 * → Generates the PDF via contract-pdf.ts
 * → Sends to the prospect and copies the owner via Resend
 */

import { generateContract } from '~/server/utils/contract-pdf'
import { sendEmail } from '~/server/utils/email'

interface ContractBody {
  company: string
  email: string
  contactName?: string
  revenue: string
  needs?: string
  setupPrice?: string
  mrrPrice?: string
  projectId?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContractBody>(event)

  if (!body.company?.trim() || !body.email?.trim()) {
    throw createError({ statusCode: 400, message: 'Champs obligatoires : company, email' })
  }

  const today = new Date().toISOString().slice(0, 10)

  // ── Générer le PDF ────────────────────────────────────────────────────
  const pdfBuffer = await generateContract({
    company: body.company.trim(),
    contactName: body.contactName?.trim(),
    email: body.email.trim(),
    revenue: body.revenue || '',
    needs: body.needs || '',
    setupPrice: body.setupPrice || '15 000',
    mrrPrice: body.mrrPrice || '800',
    date: today,
    projectId: body.projectId,
  })

  const pdfBase64 = pdfBuffer.toString('base64')
  const filename = `contrat-codemyshop-${body.company.trim().toLowerCase().replace(/\s+/g, '-')}-${today}.pdf`

  // ── Envoyer au prospect ───────────────────────────────────────────────
  const prospectHtml = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0F0F1A; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 20px; color: #fff; margin-bottom: 16px;">Votre contrat CodeMyShop</h1>
      <p style="color: #94a3b8; line-height: 1.8;">
        Bonjour,<br><br>
        Suite à notre échange, vous trouverez ci-joint votre contrat de prestation CodeMyShop Premium.<br><br>
        Merci de le retourner signé par email à <a href="mailto:contact@codemyshop.com" style="color: #7C3AED;">contact@codemyshop.com</a>
        avec la mention <strong style="color: #fff;">"Lu et approuvé"</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 24px 0;">
      <p style="font-size: 12px; color: #64748b;">
        CodeMyShop — Infrastructure e-commerce souveraine<br>
        CodeMyShop | SIRET 51090359400057
      </p>
    </div>
  `

  // Envoi via le helper centralisé sendEmail
  const contactEmail = process.env.CONTACT_EMAIL || ''
  const brandName = useRuntimeConfig().public.brandName as string || 'Boutique'

  try {
    await sendEmail({
      to: body.email.trim(),
      subject: `Contrat ${brandName} Premium — ${body.company.trim()}`,
      html: prospectHtml,
      replyTo: contactEmail,
      cc: contactEmail || undefined,
      attachments: [{ filename, content: pdfBase64, type: 'application/pdf' }],
    })
  } catch (err: any) {
    console.error('[contract] Email send failed:', err?.data?.message || err?.message)
    // On retourne quand même le PDF pour téléchargement manuel
  }

  // ── Retourner le PDF pour téléchargement direct ───────────────────────
  return {
    success: true,
    filename,
    pdf: pdfBase64,
    message: `Contrat envoyé à ${body.email}`,
  }
})
