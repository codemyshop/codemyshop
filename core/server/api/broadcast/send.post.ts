/**
 *
 * POST /api/broadcast/send
 * Body : { to, subject, body, cta, channel }
 * Actually sends email via Resend.
 *
 * SECURITY.md R4: input validation.
 * SECURITY.md R1: Resend key from .env.
 *
 * Anti-spam: goes through the queue (1 send/min via cron email:queue-process)
 * to avoid MTA reputation ban in case of large broadcast.
 */

import { sendEmailViaQueue } from '~/server/utils/email-queue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    to:       string
    subject:  string
    body:     string
    cta?:     string
    channel:  string
  }>(event)

  if (!body.to?.trim() || !body.subject?.trim()) {
    throw createError({ statusCode: 400, message: 'to et subject requis' })
  }

  // Construire le HTML de l'email
  const html = buildEmailHtml({
    subject: body.subject,
    body:    body.body,
    cta:     body.cta,
  })

  const result = await sendEmailViaQueue({
    to:      body.to.trim(),
    subject: body.subject.trim(),
    html,
  })

  return result
})

function buildEmailHtml(params: { subject: string; body: string; cta?: string }): string {
  const bodyHtml = params.body
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">${p}</p>`)
    .join('')

  const ctaHtml = params.cta
    ? `<div style="text-align: center; margin: 32px 0;">
        <a href="#" style="display: inline-block; padding: 12px 32px; background: #4F46E5; color: white; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">${params.cta}</a>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="margin: 0 0 24px; font-size: 22px; font-weight: 700; color: #111827;">${params.subject}</h1>
      ${bodyHtml}
      ${ctaHtml}
    </div>
    <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
      Envoyé via CodeMyShop &mdash; codemyshop.com
    </p>
  </div>
</body>
</html>`
}
