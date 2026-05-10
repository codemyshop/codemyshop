/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Pure Node SMTP mini-client (TLS) — no external library.
 * Sufficient for OVH ssl0.ovh.net:465 (auth LOGIN, MAIL FROM, RCPT TO, DATA).
 * For advanced features (DKIM signature, heavy binary attachments),
 * switch to nodemailer.
 */
import * as tls from 'node:tls'

interface SmtpOptions {
  host: string
  port: number
  user: string
  pass: string
  from: string
  to: string
  bcc?: string
  subject: string
  html: string
  text: string
}

function b64(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64')
}

export async function sendSmtpMail(opts: SmtpOptions): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const recipients = [opts.to, opts.bcc].filter(Boolean) as string[]
    const boundary = `=_${Math.random().toString(36).slice(2)}`
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${opts.from.split('@')[1] || 'localhost'}>`
    const dateHdr = new Date().toUTCString()

    const headers = [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      ...(opts.bcc ? [`Bcc: ${opts.bcc}`] : []),
      `Subject: =?UTF-8?B?${b64(opts.subject)}?=`,
      `Date: ${dateHdr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].join('\r\n')

    const body = [
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(opts.text),
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(opts.html),
      `--${boundary}--`,
      ``,
    ].join('\r\n')

    const dataPayload = `${headers}\r\n\r\n${body}\r\n.\r\n`
    const socket = tls.connect({ host: opts.host, port: opts.port, rejectUnauthorized: true }, () => {})
    socket.setEncoding('utf-8')
    socket.setTimeout(30_000)

    let buffer = ''
    let stage = 'greeting'
    let resolved = false
    const finish = (ok: boolean, err?: string) => {
      if (resolved) return
      resolved = true
      try { socket.end() } catch {}
      resolve(ok ? { ok: true } : { ok: false, error: err })
    }

    const send = (line: string) => socket.write(line + '\r\n')

    socket.on('data', (chunk: string) => {
      buffer += chunk
      // Handle multi-line responses : last line has space after code (not dash)
      while (buffer.includes('\r\n')) {
        const lineEnd = buffer.indexOf('\r\n')
        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + 2)
        const code = line.slice(0, 3)
        const isFinal = line.charAt(3) === ' '
        if (!isFinal) continue
        if (code.startsWith('5') || code.startsWith('4')) {
          finish(false, `SMTP ${code} at ${stage}: ${line}`)
          return
        }
        switch (stage) {
          case 'greeting':
            send(`EHLO ${opts.host}`)
            stage = 'ehlo'
            break
          case 'ehlo':
            send(`AUTH LOGIN`)
            stage = 'auth_user'
            break
          case 'auth_user':
            send(b64(opts.user))
            stage = 'auth_pass'
            break
          case 'auth_pass':
            send(b64(opts.pass))
            stage = 'authed'
            break
          case 'authed':
            send(`MAIL FROM:<${opts.from}>`)
            stage = 'mail_from'
            break
          case 'mail_from': {
            const next = recipients.shift()
            if (!next) { finish(false, 'No recipients'); return }
            send(`RCPT TO:<${next}>`)
            stage = recipients.length > 0 ? 'rcpt_more' : 'rcpt_last'
            break
          }
          case 'rcpt_more': {
            const next = recipients.shift()
            if (!next) {
              send(`DATA`)
              stage = 'data_init'
            } else {
              send(`RCPT TO:<${next}>`)
              stage = recipients.length > 0 ? 'rcpt_more' : 'rcpt_last'
            }
            break
          }
          case 'rcpt_last':
            send(`DATA`)
            stage = 'data_init'
            break
          case 'data_init':
            socket.write(dataPayload)
            stage = 'data_sent'
            break
          case 'data_sent':
            send(`QUIT`)
            stage = 'quit'
            break
          case 'quit':
            finish(true)
            break
        }
      }
    })

    socket.on('error', (err) => finish(false, `socket: ${err.message}`))
    socket.on('timeout', () => finish(false, 'socket timeout'))
    socket.on('close', () => { if (!resolved) finish(false, 'socket closed unexpectedly') })
  })
}
