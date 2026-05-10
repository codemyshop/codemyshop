/**
 *
 * POST /api/blog/contact
 * Receives a message from the CTA form in blog articles.
 * → Create/upsert a lead + new project (direct Drizzle)
 * → Send a summary email via Resend
 */

import { sendAdminContactFormEmail } from '~/server/utils/order-emails'
import { crmCreateLeadProject } from '~/server/utils/crm-direct'
import { rateLimit } from '~/server/utils/redis'

interface BlogContactBody {
  email: string
  message?: string
  articleTitle?: string
  articleUrl?: string
}

export default defineEventHandler(async (event) => {
  // Rate limit anti-spam form contact (5 / 10 min par IP).
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`blog-contact:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de messages. Réessayez dans quelques minutes.',
      data: { code: 'RATE_LIMITED' },
    })
  }

  const body = await readBody<BlogContactBody>(event)

  // ── Validation ──────────────────────────────────────────────────────
  const email = body.email?.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email invalide', data: { code: 'INVALID_EMAIL' } })
  }

  const message = body.message?.trim() || ''
  const articleTitle = body.articleTitle?.trim() || ''
  const articleUrl = body.articleUrl?.trim() || ''

  // ── Créer le lead + projet via Drizzle direct ──────────────────────
  let leadId: number | null = null
  let projectId: number | null = null

  try {
    const r = await crmCreateLeadProject({
      email,
      message,
      articleTitle,
      articleUrl,
      leadSource: 'blog_article',
    }, { event })
    if (r.success) {
      leadId = r.leadId
      projectId = r.projectId
    } else {
      console.error('[blog/contact] CRM error:', r.error)
    }
  } catch (err: any) {
    console.error('[blog/contact] CRM unexpected error:', err?.message || err)
  }

  // ── Email récap admin (DB-first via cs_email_template.recipient_to) ─
  await sendAdminContactFormEmail({
    email,
    message,
    articleTitle,
    articleUrl,
    leadId,
    projectId,
  }).catch((err: any) => {
    console.error('[blog/contact] Email admin error:', err?.message || err)
  })

  return { success: true, leadId, projectId }
})
