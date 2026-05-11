

import { sendEmailViaQueue } from '~/server/utils/email-queue'
import { crmCreateLeadProject } from '~/server/utils/crm-direct'

interface QualifyBody {
  company: string
  email: string
  website?: string
  revenue: string
  needs?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<QualifyBody>(event)

  
  if (!body.company?.trim() || !body.email?.trim() || !body.revenue) {
    throw createError({ statusCode: 400, message: 'Champs obligatoires : company, email, revenue' })
  }

  const company = body.company.trim()
  const email = body.email.trim()
  const website = body.website?.trim() || ''
  const revenue = body.revenue
  const needs = body.needs?.trim() || ''

  
  let leadId: number | null = null
  let projectId: number | null = null

  try {
    const r = await crmCreateLeadProject({
      email,
      firstname: company,
      companyName: company,
      annualRevenue: revenue,
      leadSource: 'website_codemyshop',
      projectTitleOverride: `CodeMyShop Premium — ${company}`,
      message: needs || `CA: ${revenue}. Site: ${website || 'non renseigné'}`,
    }, { event })
    if (r.success) {
      leadId = r.leadId
      projectId = r.projectId
    } else {
      console.error('[qualify] CRM error:', r.error)
    }
  } catch (err: any) {
    console.error('[qualify] CRM unexpected error:', err?.message || err)
  }

  
  const adminHtml = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0F0F1A; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 20px; color: #fff; margin-bottom: 24px;">🎯 Nouveau lead CodeMyShop Premium</h1>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;">Entreprise</td><td style="padding: 8px 0; color: #fff; font-weight: 600;">${company}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">Email</td><td style="padding: 8px 0; color: #fff;">${email}</td></tr>
        <tr><td style="padding: 8px 0; color: #94a3b8;">CA annuel</td><td style="padding: 8px 0; color: #10B981; font-weight: 600;">${revenue}</td></tr>
        ${website ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Site actuel</td><td style="padding: 8px 0;"><a href="${website}" style="color: #7C3AED;">${website}</a></td></tr>` : ''}
        ${needs ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Besoins</td><td style="padding: 8px 0; color: #e2e8f0;">${needs}</td></tr>` : ''}
      </table>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 24px 0;">
      <p style="font-size: 12px; color: #64748b;">
        Lead #${leadId ?? 'N/A'} | Projet #${projectId ?? 'N/A'} | ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
      </p>
    </div>
  `

  await sendEmailViaQueue({
    to: 'contact@codemyshop.com',
    subject: `🎯 Lead CMS Premium — ${company} (${revenue})`,
    html: adminHtml,
  })

  
  const prospectHtml = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0F0F1A; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 20px; color: #fff; margin-bottom: 16px;">Votre demande a bien été enregistrée</h1>
      <p style="color: #94a3b8; line-height: 1.8;">
        Bonjour,<br><br>
        Merci pour votre intérêt pour CodeMyShop. CodeMyShop vous contactera dans les 24 heures
        pour votre audit d'architecture personnalisé.<br><br>
        En attendant, vous pouvez consulter notre approche sur
        <a href="https://codemyshop.com/souverainete-numerique" style="color: #7C3AED;">la souveraineté numérique</a>.
      </p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 24px 0;">
      <p style="font-size: 12px; color: #64748b;">
        CodeMyShop — Infrastructure e-commerce souveraine<br>
        CodeMyShop | contact@codemyshop.com
      </p>
    </div>
  `

  await sendEmailViaQueue({
    to: email,
    subject: 'CodeMyShop — Votre audit d\'architecture est programmé',
    html: prospectHtml,
    replyTo: 'contact@codemyshop.com',
  })

  return {
    success: true,
    leadId,
    projectId,
  }
})
