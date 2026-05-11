

import MailComposer from 'nodemailer/lib/mail-composer'
import { sendEmail } from '~/server/utils/email'
import { appendMessage } from '~/server/utils/imap'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024 

interface IncomingAttachment {
  filename:      string
  mimeType?:     string
  contentBase64: string
}

interface ParsedAttachment {
  filename:    string
  mimeType:    string
  content:     Buffer
}

function deriveImapHost(smtpHost: string): string {
  if (!smtpHost) return ''
  if (smtpHost.startsWith('smtp.')) return 'imap.' + smtpHost.slice(5)
  return smtpHost
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    to:           string | string[]
    subject:      string
    body:         string
    replyTo?:     string
    asHtml?:      boolean
    attachments?: IncomingAttachment[]
    
    draftId?:     number
  }>(event)

  if (!body?.to || !body?.subject || !body?.body) {
    throw createError({ statusCode: 400, statusMessage: 'Champs to/subject/body requis.' })
  }
  const recipients = Array.isArray(body.to) ? body.to : [body.to]
  if (recipients.length === 0 || recipients.some(r => !r.includes('@'))) {
    throw createError({ statusCode: 400, statusMessage: 'Adresse email invalide.' })
  }

  
  const attachments: ParsedAttachment[] = []
  let totalBytes = 0
  for (const a of (body.attachments || [])) {
    if (!a.filename || !a.contentBase64) continue
    const buf = Buffer.from(a.contentBase64, 'base64')
    totalBytes += buf.length
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'Pièces jointes : limite 25 MB total.' })
    }
    attachments.push({
      filename: a.filename.slice(0, 500),
      mimeType: (a.mimeType || 'application/octet-stream').slice(0, 255),
      content:  buf,
    })
  }

  const html = body.asHtml
    ? body.body
    : `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(body.body)}</div>`

  const result = await sendEmail({
    to:      recipients,
    subject: body.subject,
    html,
    replyTo: body.replyTo,
    attachments: attachments.length ? attachments.map(a => ({
      filename:    a.filename,
      content:     a.content,
      contentType: a.mimeType,
    })) : undefined,
  })

  if (!result.ok) {
    throw createError({ statusCode: 502, statusMessage: result.error || 'Envoi SMTP échoué.' })
  }

  const account = process.env.SMTP_USER || process.env.SMTP_FROM
  const fromHeader = process.env.EMAIL_FROM || account || ''

  
  let appendError: string | null = null
  if (account && process.env.SMTP_PASS) {
    try {
      const composer = new MailComposer({
        from:    fromHeader,
        to:      recipients,
        subject: body.subject,
        html,
        replyTo: body.replyTo,
        attachments: attachments.length ? attachments.map(a => ({
          filename:    a.filename,
          content:     a.content,
          contentType: a.mimeType,
        })) : undefined,
      })
      const rfc822: Buffer = await new Promise((resolve, reject) =>
        composer.compile().build((err, msg) => err ? reject(err) : resolve(msg))
      )
      const host = process.env.IMAP_HOST || deriveImapHost(process.env.SMTP_HOST || '')
      const port = Number(process.env.IMAP_PORT || 993)
      const folder = process.env.IMAP_SENT_FOLDER || 'INBOX.Sent Messages'
      if (host) {
        await appendMessage(
          { host, port, user: account, pass: process.env.SMTP_PASS, folder, timeoutMs: 30_000 },
          rfc822,
        )
      }
    } catch (err: any) {
      appendError = err?.message || 'IMAP APPEND failed'
      console.warn('[email-send] IMAP APPEND skipped:', appendError)
    }
  }

  
  if (account) {
    try {
      const sql = getPgClient()
      const messageId = result.id || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const upsert = await sql<Array<{ id_email_message: number }>>`
        INSERT INTO ${sql(PG_SCHEMA)}.cs_email_message
          (account_user, folder, message_id, from_email, from_name,
           to_emails, subject, date_received, body_text, body_html,
           has_attachments, is_read, date_add, date_upd)
        VALUES
          (${account}, 'sent', ${messageId},
           ${account}, ${fromHeader},
           ${recipients.join(', ')},
           ${(body.subject || '').slice(0, 998)},
           NOW(),
           ${(body.asHtml ? '' : body.body).slice(0, 200_000)},
           ${(body.asHtml ? body.body : '').slice(0, 500_000)},
           ${attachments.length > 0 ? 1 : 0}, 1, NOW(), NOW())
        ON CONFLICT (account_user, message_id) DO NOTHING
        RETURNING id_email_message
      `
      if (upsert.length > 0) {
        const idMsg = upsert[0].id_email_message
        for (const att of attachments) {
          await sql`
            INSERT INTO ${sql(PG_SCHEMA)}.cs_email_attachment
              (id_email_message, filename, mime_type, size_bytes, content, date_add)
            VALUES
              (${idMsg}, ${att.filename}, ${att.mimeType}, ${att.content.length},
               ${att.content}, NOW())
          `
        }
      }
    } catch (err: any) {
      console.warn('[email-send] DB persist failed:', err?.message)
    }
  }

  
  if (body.draftId && account) {
    try {
      const sql = getPgClient()
      await sql`
        DELETE FROM ${sql(PG_SCHEMA)}.cs_email_message
        WHERE id_email_message = ${body.draftId}
          AND account_user = ${account}
          AND folder = 'draft'
      `
    } catch (err: any) {
      console.warn('[email-send] draft delete failed:', err?.message)
    }
  }

  return { ok: true, id: result.id, imap_append_error: appendError }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
