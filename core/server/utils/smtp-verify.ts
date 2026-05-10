/**
 *
 * Email address validation via SMTP handshake (RCPT TO without sending).
 *
 * Pipeline :
 * 1. MX lookup of the domain (DNS)
 * 2. TCP connection to port 25 on the priority MX (timeout 8s)
 *  3. EHLO → MAIL FROM:<verifier> → RCPT TO:<email cible> → QUIT
 * 4. Classification of the return code (250 = ok, 550 = rejected, etc.)
 *
 * Coverage ~75% in practice: Gmail/Outlook often accept RCPT TO,
 * OVH/IONOS/Proton as well. Serious servers that do greylisting or
 * filter anonymous probes return `unknown`. Any network failure (port
 * 25 outbound blocked on the VPS side, MX down) → `connect_failed` or `mx_missing`.
 *
 * No real sending — we emit `QUIT` before any DATA. GDPR-compliant.
 */

import dns from 'node:dns/promises'
import net from 'node:net'

export type EmailVerifyStatus =
  | 'ok'              // RCPT TO 250 — l'adresse existe
  | 'rejected'        // RCPT TO 550/551/553 — l'adresse n'existe pas
  | 'unknown'         // 4xx ou 252 (greylist / serveur prudent)
  | 'mx_missing'      // domaine sans MX
  | 'connect_failed'  // port 25 bloqué / MX injoignable / timeout
  | 'invalid_input'   // email mal formé en entrée

export interface EmailVerifyResult {
  status:   EmailVerifyStatus
  code?:    number       // dernier code SMTP observé
  detail?:  string       // ligne de réponse brute (utile en debug)
  mxHost?:  string       // serveur MX utilisé
}

const TIMEOUT_MS = 8000
const HELO_DOMAIN = 'codemyshop.com'
const MAIL_FROM   = 'verify@codemyshop.com'

export async function verifyEmailViaSmtp(rawEmail: string): Promise<EmailVerifyResult> {
  const email = (rawEmail || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    return { status: 'invalid_input' }
  }
  const domain = email.split('@')[1]

  // 1. MX lookup (fallback sur A si aucun MX)
  let mxHost: string | null = null
  try {
    const mxList = await dns.resolveMx(domain)
    if (mxList?.length) {
      mxList.sort((a, b) => a.priority - b.priority)
      mxHost = mxList[0].exchange
    }
  } catch { /* pas de MX */ }
  if (!mxHost) {
    try {
      const a = await dns.resolve4(domain)
      if (a?.length) mxHost = domain
    } catch { /* rien */ }
  }
  if (!mxHost) return { status: 'mx_missing' }

  // 2/3/4. handshake SMTP
  return await new Promise<EmailVerifyResult>((resolve) => {
    const socket = net.createConnection({ host: mxHost!, port: 25 })
    let buffer = ''
    let step = 0
    let lastCode = 0
    let lastDetail = ''
    let resolved = false

    const finish = (r: EmailVerifyResult) => {
      if (resolved) return
      resolved = true
      try { socket.write('QUIT\r\n') } catch { /* ignore */ }
      try { socket.destroy() } catch { /* ignore */ }
      resolve(r)
    }

    socket.setTimeout(TIMEOUT_MS)
    socket.setEncoding('utf8')

    const send = (cmd: string) => {
      try { socket.write(cmd + '\r\n') } catch { /* socket may be dead */ }
    }

    socket.on('connect', () => {
      // server sends a 220 banner before we speak
    })

    socket.on('data', (chunk) => {
      buffer += String(chunk)
      // SMTP: each response ends with "\r\n", multi-line via "XYZ-..."
      while (true) {
        const idx = buffer.indexOf('\r\n')
        if (idx === -1) break
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const m = line.match(/^(\d{3})([\s-])(.*)$/)
        if (!m) continue
        const code = Number(m[1])
        const isFinal = m[2] === ' '
        lastCode = code
        lastDetail = line
        if (!isFinal) continue // wait for the final line of a multi-line response

        // FSM : 0=banner 1=after EHLO 2=after MAIL FROM 3=after RCPT TO
        if (step === 0) {
          if (code !== 220) return finish({ status: 'connect_failed', code, detail: line, mxHost: mxHost! })
          step = 1
          send(`EHLO ${HELO_DOMAIN}`)
        } else if (step === 1) {
          if (code !== 250) {
            // attempts HELO if EHLO is refused
            step = 1.5 as any
            send(`HELO ${HELO_DOMAIN}`)
            continue
          }
          step = 2
          send(`MAIL FROM:<${MAIL_FROM}>`)
        } else if ((step as any) === 1.5) {
          if (code !== 250) return finish({ status: 'unknown', code, detail: line, mxHost: mxHost! })
          step = 2
          send(`MAIL FROM:<${MAIL_FROM}>`)
        } else if (step === 2) {
          if (code !== 250) return finish({ status: 'unknown', code, detail: line, mxHost: mxHost! })
          step = 3
          send(`RCPT TO:<${email}>`)
        } else if (step === 3) {
          if (code === 250 || code === 251) {
            return finish({ status: 'ok', code, detail: line, mxHost: mxHost! })
          }
          if (code === 550 || code === 551 || code === 553 || code === 554) {
            return finish({ status: 'rejected', code, detail: line, mxHost: mxHost! })
          }
          // 4xx, 252, autres → ambigu (greylist, anti-probe)
          return finish({ status: 'unknown', code, detail: line, mxHost: mxHost! })
        }
      }
    })

    socket.on('timeout', () => {
      finish({ status: 'connect_failed', code: lastCode, detail: lastDetail || 'timeout', mxHost: mxHost! })
    })
    socket.on('error', (err) => {
      finish({ status: 'connect_failed', code: lastCode, detail: lastDetail || (err as Error).message, mxHost: mxHost! })
    })
    socket.on('close', () => {
      if (!resolved) {
        // server closed without us concluding: ambiguous status
        finish({ status: 'unknown', code: lastCode, detail: lastDetail || 'connection closed', mxHost: mxHost! })
      }
    })
  })
}
