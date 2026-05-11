

import nodemailer, { type Transporter } from 'nodemailer'

export interface SendEmailParams {
  to:       string | string[]
  subject:  string
  html:     string
  from?:    string
  replyTo?: string
  
  attachments?: Array<{
    filename:    string
    content:     Buffer | string
    contentType?: string
  }>
}

export interface SendEmailResult {
  ok:    boolean
  id?:   string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  
  
  const dbFrom = await getDbFrom().catch(() => null)
  const from   = params.from ?? dbFrom ?? getDefaultFrom()

  
  const override = process.env.EMAIL_OVERRIDE_TO?.trim()
  const originalTo = Array.isArray(params.to) ? params.to.join(', ') : params.to
  const finalTo: string[] = override
    ? [override]
    : (Array.isArray(params.to) ? params.to : [params.to])
  const finalSubject = override
    ? `[PREPROD → ${originalTo}] ${params.subject}`
    : params.subject

  const transport = pickTransport()

  if (transport === 'stub') {
    console.log(`[EMAIL STUB] To: ${finalTo.join(', ')} | Subject: ${finalSubject}`)
    console.log(`[EMAIL STUB] Body: ${params.html.slice(0, 200)}...`)
    return { ok: true, id: 'stub-' + Date.now() }
  }

  if (transport === 'smtp') {
    return sendViaSmtp({ from, to: finalTo, subject: finalSubject, html: params.html, replyTo: params.replyTo, attachments: params.attachments }, override, originalTo, params.subject)
  }

  return sendViaResend({ from, to: finalTo, subject: finalSubject, html: params.html, replyTo: params.replyTo, attachments: params.attachments }, override, originalTo, params.subject)
}

type Transport = 'smtp' | 'resend' | 'stub'

function pickTransport(): Transport {
  
  
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return 'smtp'
  }
  
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  return 'stub'
}

let smtpTransporter: Transporter | null = null

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter

  const host = process.env.SMTP_HOST!
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER!
  const pass = process.env.SMTP_PASS!
  
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1'
    : port === 465

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  return smtpTransporter
}

interface InternalSendArgs {
  from:    string
  to:      string[]
  subject: string
  html:    string
  replyTo?: string
  attachments?: SendEmailParams['attachments']
}

async function sendViaSmtp(
  args: InternalSendArgs,
  override: string | undefined,
  originalTo: string,
  originalSubject: string,
): Promise<SendEmailResult> {
  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: args.from,
      to:   args.to.join(', '),
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
      attachments: args.attachments?.map(a => ({
        filename: a.filename,
        content:  a.content,
        contentType: a.contentType,
      })),
    })

    if (override) {
      console.log(`[email/smtp] OVERRIDE preprod : ${originalTo} → ${override} (subject: ${originalSubject})`)
    }
    return { ok: true, id: info.messageId }
  } catch (err: any) {
    const errorMsg = err?.message || 'Erreur SMTP'
    console.error('[email/smtp] Send failed:', errorMsg)
    return { ok: false, error: errorMsg }
  }
}

async function sendViaResend(
  args: InternalSendArgs,
  override: string | undefined,
  originalTo: string,
  originalSubject: string,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!
  
  const resendAttachments = args.attachments?.map((a) => ({
    filename:     a.filename,
    content:      Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
    content_type: a.contentType || 'application/octet-stream',
  }))

  try {
    const res = await $fetch<{ id: string }>('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        from:     args.from,
        to:       args.to,
        subject:  args.subject,
        html:     args.html,
        reply_to: args.replyTo,
        ...(resendAttachments?.length ? { attachments: resendAttachments } : {}),
      },
    })

    if (override) {
      console.log(`[email/resend] OVERRIDE preprod : ${originalTo} → ${override} (subject: ${originalSubject})`)
    }
    return { ok: true, id: res.id }
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'Erreur Resend'
    console.error('[email/resend] Send failed:', errorMsg)
    return { ok: false, error: errorMsg }
  }
}

function getDefaultFrom(): string {
  
  return process.env.EMAIL_FROM ?? 'CodeMyShop <onboarding@resend.dev>'
}

async function getDbFrom(): Promise<string | null> {
  const { loadEmailConfig } = await import('./email-config')
  const cfg = await loadEmailConfig()
  return cfg.from_email && cfg.from_email.trim() ? cfg.from_email.trim() : null
}
