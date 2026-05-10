/**
 *
 * Service d'envoi d'emails — routage SMTP / Resend.
 *
 * Doctrine 2026-05-07 :
 *   - Tenants (Example Shop, SMOKE…) : SMTP direct via nodemailer (SMTP_HOST set
 * in .env). Domain = the tenant's, credentials = the tenant's
 * (OVH in most cases). No Resend dependency.
 * - Core (codemyshop.com / codemyshop.fr): Resend API if
 * RESEND_API_KEY is defined AND SMTP_HOST is absent.
 *
 * Selector: `SMTP_HOST` env present → SMTP transport, else Resend.
 *
 * Usage :
 *   const result = await sendEmail({ to, subject, html })
 *   if (!result.ok) console.error(result.error)
 */

import nodemailer, { type Transporter } from 'nodemailer'

export interface SendEmailParams {
  to:       string | string[]
  subject:  string
  html:     string
  from?:    string
  replyTo?: string
  /** Pièces jointes — content peut être Buffer (encodé base64 auto pour Resend) ou string base64. */
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

/**
 * Sends an email via SMTP (if SMTP_HOST defined) or Resend (default fallback).
 *
 * Garde-fou preprod (incidents 2026-04-20 — feedback_dev_smtp_our_credentials) :
 * if `EMAIL_OVERRIDE_TO` is defined, ALL `to` are replaced by this
 * address and the subject is prefixed `[PREPROD → original]`. Avoids any
 * unintended sending to a real client from the test environment.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // DB-First : si cs_email_config.from_email est renseigné, il prime
  // sur EMAIL_FROM env. Le caller peut toujours forcer via params.from.
  const dbFrom = await getDbFrom().catch(() => null)
  const from   = params.from ?? dbFrom ?? getDefaultFrom()

  // Override preprod
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

// ── Sélecteur transport ──────────────────────────────────────────────────────

type Transport = 'smtp' | 'resend' | 'stub'

function pickTransport(): Transport {
  // Priorité 1 : SMTP si SMTP_HOST + SMTP_USER + SMTP_PASS — c'est le cas
  // sur les tenants (Example Shop, SMOKE…) qui héritent de leur propre serveur.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return 'smtp'
  }
  // Priorité 2 : Resend pour AC core (codemyshop.com, codemyshop.fr)
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  return 'stub'
}

// ── Transport SMTP (nodemailer) ──────────────────────────────────────────────

let smtpTransporter: Transporter | null = null

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter

  const host = process.env.SMTP_HOST!
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER!
  const pass = process.env.SMTP_PASS!
  // Port 465 = SSL implicite ; 587/25 = STARTTLS ; sinon respecter SMTP_SECURE.
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

// ── Transport Resend (HTTP API) ──────────────────────────────────────────────

async function sendViaResend(
  args: InternalSendArgs,
  override: string | undefined,
  originalTo: string,
  originalSubject: string,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!
  // Resend accepte attachments: [{ filename, content (base64 string), content_type }].
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

// ── From résolution ──────────────────────────────────────────────────────────

function getDefaultFrom(): string {
  // Fallback final si ni params.from ni DB.from_email ni EMAIL_FROM.
  return process.env.EMAIL_FROM ?? 'CodeMyShop <onboarding@resend.dev>'
}

/**
 * Reads from_email from cs_email_config (DB-First). Returns null if the
 * row doesn't exist — lets the EMAIL_FROM env fallback apply.
 */
async function getDbFrom(): Promise<string | null> {
  const { loadEmailConfig } = await import('./email-config')
  const cfg = await loadEmailConfig()
  return cfg.from_email && cfg.from_email.trim() ? cfg.from_email.trim() : null
}
