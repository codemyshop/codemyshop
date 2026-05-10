/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Lightweight IMAP4rev1 pure Node client (TLS) — no external library.
 * Sufficient for OVH ssl0.ovh.net:993 (LOGIN, SELECT, UID SEARCH/FETCH).
 *
 * Scope:
 *  - LOGIN
 *  - SELECT INBOX (lecture seule)
 * - UID SEARCH SINCE <date> (server-side filtering)
 *  - UID FETCH (BODY.PEEK[HEADER] BODY.PEEK[TEXT])
 *  - LOGOUT
 *
 * Parsing MIME minimal :
 * - RFC2047 header decoding (=?UTF-8?B?...?= and =?UTF-8?Q?...?=).
 *  - Extraction text/plain depuis multipart (boundary scan).
 * - Content-Transfer-Encoding decoding: base64 / quoted-printable / 8bit.
 *
 * For advanced features (DKIM, IDLE, attachments, threads), use
 * imapflow. But the MVP for this project = simple inbox reading, that's enough.
 */

import * as tls from 'node:tls'

export interface ImapOptions {
  host:     string
  port:     number
  user:     string
  pass:     string
  /** Combien de jours en arrière (UID SEARCH SINCE). Défaut 7. */
  sinceDays?: number
  /** IMAP folder. Default INBOX. */
  folder?:  string
  /** Total timeout (ms). Default 60000. */
  timeoutMs?: number
}

export interface ImapAttachment {
  filename:    string
  mimeType:    string
  sizeBytes:   number
  /** Decoded binary content. */
  content:     Buffer
}

export interface ImapMessage {
  uid:        number
  imapId:     string
  fromEmail:  string
  fromName:   string
  toRaw?:     string
  ccRaw?:     string
  subject:    string
  dateReceived: Date | null
  bodyText:   string
  bodyHtml:   string
  attachments: ImapAttachment[]
  raw?:       string
}

// ─── RFC2047 header decode ────────────────────────────────────────────────

function decodeQuotedPrintable(s: string): string {
  // Q-encoding for headers: '_' = space, =XX = byte hex
  const bytes: number[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '_') { bytes.push(0x20); i++ }
    else if (c === '=' && i + 2 < s.length) {
      const hex = s.slice(i + 1, i + 3)
      bytes.push(parseInt(hex, 16))
      i += 3
    } else {
      bytes.push(s.charCodeAt(i))
      i++
    }
  }
  return Buffer.from(bytes).toString('utf-8')
}

function decodeMimeHeader(raw: string): string {
  if (!raw) return ''
  // =?charset?encoding?text?=
  return raw.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m, charset, enc, text) => {
      try {
        if (enc.toUpperCase() === 'B') {
          return Buffer.from(text, 'base64').toString(String(charset).toLowerCase().includes('utf') ? 'utf-8' : 'latin1')
        }
        // Q encoding
        return decodeQuotedPrintable(text)
      } catch {
        return text
      }
    },
  ).replace(/\?=\s+=\?/g, '') // Joindre les fragments adjacents (déjà décodés)
}

function parseFromHeader(raw: string): { email: string; name: string } {
  const decoded = decodeMimeHeader(raw)
  // "Name" <email@domain> ou Name <email@domain> ou email@domain
  const m = decoded.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/)
  if (m) return { name: (m[1] || '').trim(), email: m[2].trim() }
  return { name: '', email: decoded.trim() }
}

function parseDateHeader(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

// ─── MIME body parse ──────────────────────────────────────────────────────

function decodeBodyPart(body: string, encoding: string, charset: string): string {
  const enc = (encoding || '').toLowerCase().trim()
  const cs = (charset || 'utf-8').toLowerCase().trim()
  try {
    if (enc === 'base64') {
      return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString(cs.includes('utf') ? 'utf-8' : 'latin1')
    }
    if (enc === 'quoted-printable') {
      // QP body : =XX hex, soft line breaks =\r\n
      const cleaned = body.replace(/=\r?\n/g, '')
      const bytes: number[] = []
      let i = 0
      while (i < cleaned.length) {
        const c = cleaned[i]
        if (c === '=' && i + 2 < cleaned.length) {
          const hex = cleaned.slice(i + 1, i + 3)
          if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
            bytes.push(parseInt(hex, 16))
            i += 3
            continue
          }
        }
        bytes.push(cleaned.charCodeAt(i))
        i++
      }
      return Buffer.from(bytes).toString(cs.includes('utf') ? 'utf-8' : 'latin1')
    }
  } catch {
    return body
  }
  return body
}

function extractContentType(headers: string): { type: string; charset: string; boundary: string; encoding: string; filename: string; disposition: string } {
  const ct = (headers.match(/^Content-Type:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1] || '').replace(/\r?\n[ \t]+/g, ' ')
  const cte = (headers.match(/^Content-Transfer-Encoding:\s*([^\r\n]+)/im)?.[1] || '').trim()
  const cd = (headers.match(/^Content-Disposition:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1] || '').replace(/\r?\n[ \t]+/g, ' ')
  const type = (ct.split(';')[0] || '').trim().toLowerCase()
  const charset = (ct.match(/charset\s*=\s*"?([^";\s]+)/i)?.[1] || 'utf-8').toLowerCase()
  const boundary = (ct.match(/boundary\s*=\s*"?([^";\s]+)/i)?.[1] || '')
  const filenameRaw = (cd.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]
                   || ct.match(/name\s*=\s*"?([^";]+)"?/i)?.[1]
                   || '')
  const filename = decodeMimeHeader(filenameRaw).trim()
  const disposition = ((cd.split(';')[0] || '').trim().toLowerCase())
  return { type, charset, boundary, encoding: cte, filename, disposition }
}

function decodeBodyToBuffer(body: string, encoding: string): Buffer {
  const enc = (encoding || '').toLowerCase().trim()
  if (enc === 'base64') {
    return Buffer.from(body.replace(/\s+/g, ''), 'base64')
  }
  if (enc === 'quoted-printable') {
    const cleaned = body.replace(/=\r?\n/g, '')
    const bytes: number[] = []
    let i = 0
    while (i < cleaned.length) {
      const c = cleaned[i]
      if (c === '=' && i + 2 < cleaned.length) {
        const hex = cleaned.slice(i + 1, i + 3)
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16))
          i += 3
          continue
        }
      }
      bytes.push(cleaned.charCodeAt(i))
      i++
    }
    return Buffer.from(bytes)
  }
  // 7bit / 8bit / binary : binaire latin1 brut
  return Buffer.from(body, 'binary')
}

/**
 * Parses a complete FETCH response (headers + body) into text/plain.
 * If multipart: looks for the first text/plain part; otherwise text/html
 * stripped of tags; otherwise the raw body.
 */
export function parseMessageBody(headers: string, body: string): string {
  const out = parseMessageParts(headers, body)
  if (out.text) return out.text.trim()
  if (out.html) return out.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return ''
}

/**
 * Full parse: returns text + html + attachments[]. Recursive on multipart.
 */
export function parseMessageParts(headers: string, body: string): { text: string; html: string; attachments: ImapAttachment[] } {
  const ct = extractContentType(headers)
  const result = { text: '', html: '', attachments: [] as ImapAttachment[] }

  if (ct.type.startsWith('multipart/') && ct.boundary) {
    const parts = body.split(`--${ct.boundary}`)
    for (const p of parts) {
      if (!p || p.trim() === '--' || p.trim() === '') continue
      const sep = p.indexOf('\r\n\r\n')
      if (sep < 0) continue
      const partHdr = p.slice(0, sep)
      const partBody = p.slice(sep + 4).replace(/\r?\n--\s*$/, '')
      const sub = extractContentType(partHdr)

      if (sub.type.startsWith('multipart/')) {
        const recursed = parseMessageParts(partHdr, partBody)
        if (!result.text && recursed.text) result.text = recursed.text
        if (!result.html && recursed.html) result.html = recursed.html
        result.attachments.push(...recursed.attachments)
        continue
      }

      // Pièce jointe : Content-Disposition: attachment OU filename présent
      // OU type non texte (image/*, application/*, etc.) hors text/* inline.
      const isAttachment =
        sub.disposition === 'attachment'
        || (sub.filename && sub.filename.length > 0)
        || (!sub.type.startsWith('text/') && !sub.type.startsWith('multipart/'))

      if (isAttachment && sub.filename) {
        const buf = decodeBodyToBuffer(partBody, sub.encoding)
        result.attachments.push({
          filename:  sub.filename,
          mimeType:  sub.type || 'application/octet-stream',
          sizeBytes: buf.length,
          content:   buf,
        })
        continue
      }

      const decoded = decodeBodyPart(partBody, sub.encoding, sub.charset)
      if (sub.type === 'text/plain' && !result.text) result.text = decoded
      else if (sub.type === 'text/html' && !result.html) result.html = decoded
    }
    return result
  }

  const decoded = decodeBodyPart(body, ct.encoding, ct.charset).trim()
  if (ct.type === 'text/html') result.html = decoded
  else result.text = decoded
  return result
}

// ─── Protocol IMAP ────────────────────────────────────────────────────────

interface ImapConn {
  socket:    tls.TLSSocket
  buffer:    string
  tag:       number
  pending:   Map<string, { resolve: (data: string) => void; reject: (err: Error) => void; chunks: string[] }>
}

function nextTag(conn: ImapConn): string {
  conn.tag++
  return `A${String(conn.tag).padStart(3, '0')}`
}

function sendCommand(conn: ImapConn, cmd: string, timeoutMs = 30000): Promise<string> {
  const tag = nextTag(conn)
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      conn.pending.delete(tag)
      reject(new Error(`IMAP timeout on: ${cmd.slice(0, 80)}`))
    }, timeoutMs)
    conn.pending.set(tag, {
      chunks: [],
      resolve: (data) => { clearTimeout(timer); resolve(data) },
      reject:  (err)  => { clearTimeout(timer); reject(err) },
    })
    conn.socket.write(`${tag} ${cmd}\r\n`)
  })
}

function processBuffer(conn: ImapConn) {
  while (true) {
    const nl = conn.buffer.indexOf('\r\n')
    if (nl < 0) return
    const line = conn.buffer.slice(0, nl)
    // Réponses littérales {N} : on doit lire N bytes en plus avant le \r\n suivant
    const litMatch = line.match(/\{(\d+)\}$/)
    if (litMatch) {
      const need = nl + 2 + Number(litMatch[1])
      if (conn.buffer.length < need + 2) return // attendre plus de data
      // On garde tout dans le buffer ; on consomme jusqu'à la fin du fragment littéral
      const block = conn.buffer.slice(0, need)
      conn.buffer = conn.buffer.slice(need)
      // Le tag se trouve en cherchant la prochaine ligne (continuation)
      // Pour simplifier, on accumule tous les fragments dans le pending courant
      // identifié par la dernière commande envoyée. Approche : on append au
      // pending qui matche le tag déjà émis le plus récent.
      const lastTag = `A${String(conn.tag).padStart(3, '0')}`
      const p = conn.pending.get(lastTag)
      if (p) p.chunks.push(block)
      continue
    }
    // Ligne non-littérale
    conn.buffer = conn.buffer.slice(nl + 2)
    // Tag de complétion ?
    const tagMatch = line.match(/^(A\d{3,})\s+(OK|NO|BAD)\s+(.*)$/)
    if (tagMatch) {
      const [, tag, status, msg] = tagMatch
      const p = conn.pending.get(tag)
      if (!p) continue
      conn.pending.delete(tag)
      if (status === 'OK') {
        p.resolve(p.chunks.join(''))
      } else {
        p.reject(new Error(`IMAP ${status}: ${msg}`))
      }
      continue
    }
    // Ligne untagged * : on l'append au pending courant
    const lastTag = `A${String(conn.tag).padStart(3, '0')}`
    const p = conn.pending.get(lastTag)
    if (p) p.chunks.push(line + '\r\n')
  }
}

async function connect(opts: ImapOptions): Promise<ImapConn> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host })
    const conn: ImapConn = { socket, buffer: '', tag: 0, pending: new Map() }
    let greeted = false
    const onTimeout = setTimeout(() => reject(new Error('IMAP connect timeout')), opts.timeoutMs || 30000)
    socket.on('data', (chunk: Buffer) => {
      conn.buffer += chunk.toString('binary') // binary pour préserver bytes avant decode
      if (!greeted) {
        // Première ligne = greeting "* OK ..."
        const nl = conn.buffer.indexOf('\r\n')
        if (nl >= 0 && conn.buffer.startsWith('* OK')) {
          conn.buffer = conn.buffer.slice(nl + 2)
          greeted = true
          clearTimeout(onTimeout)
          resolve(conn)
        }
        return
      }
      processBuffer(conn)
    })
    socket.on('error', (err) => { clearTimeout(onTimeout); reject(err) })
    socket.on('end',   () => {
      for (const [, p] of conn.pending) p.reject(new Error('IMAP connection closed'))
      conn.pending.clear()
    })
  })
}

function quoteDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`
}

/**
 * Fetches messages from IMAP, with no server-side persistent state:
 * filters on the SQL side via `imap_id` unique at INSERT time (each
 * already-known row is skipped by ON CONFLICT). The `SINCE` filter here serves
 * only to limit the quantity fetched.
 */
export async function fetchRecentMessages(opts: ImapOptions): Promise<ImapMessage[]> {
  const conn = await connect(opts)
  const messages: ImapMessage[] = []
  try {
    // IMAP exige les guillemets autour des arguments avec caractères spéciaux
    // mais on garde simple : login user/pass sans quotes — OVH accepte.
    const safePass = opts.pass.replace(/(["\\])/g, '\\$1')
    await sendCommand(conn, `LOGIN "${opts.user}" "${safePass}"`)
    await sendCommand(conn, `SELECT "${opts.folder || 'INBOX'}"`)

    const sinceDays = opts.sinceDays ?? 7
    const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000)
    const sinceStr = quoteDate(since)
    const searchResp = await sendCommand(conn, `UID SEARCH SINCE ${sinceStr}`)
    // Réponse : "* SEARCH 12 14 18 22\r\n"
    const searchLine = searchResp.split('\r\n').find((l) => l.startsWith('* SEARCH'))
    const uids = (searchLine || '').replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean).map(Number)

    for (const uid of uids) {
      try {
        const fetchResp = await sendCommand(
          conn,
          `UID FETCH ${uid} (BODY.PEEK[HEADER] BODY.PEEK[TEXT])`,
          60000,
        )
        // Parse FETCH response : on cherche les blocs littéraux successifs
        // (HEADER puis TEXT). On simplifie : on splitte par "BODY[" markers.
        const headerMatch = fetchResp.match(/BODY\[HEADER\][^{]*\{(\d+)\}\r\n([\s\S]+?)(?=\r\n[A-Z ]+BODY\[|\r\n\)\r\n|$)/)
        const textMatch   = fetchResp.match(/BODY\[TEXT\][^{]*\{(\d+)\}\r\n([\s\S]+?)(?=\r\n\)\r\n|$)/)
        if (!headerMatch) continue
        const headerLen = Number(headerMatch[1])
        const headerRaw = Buffer.from(headerMatch[2].slice(0, headerLen), 'binary').toString('utf-8')
        let textRaw = ''
        if (textMatch) {
          const textLen = Number(textMatch[1])
          textRaw = Buffer.from(textMatch[2].slice(0, textLen), 'binary').toString('utf-8')
        }
        const fromHdr     = headerRaw.match(/^From:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1]?.replace(/\r?\n[ \t]+/g, ' ') || ''
        const toHdr       = headerRaw.match(/^To:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1]?.replace(/\r?\n[ \t]+/g, ' ') || ''
        const ccHdr       = headerRaw.match(/^Cc:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1]?.replace(/\r?\n[ \t]+/g, ' ') || ''
        const subjectHdr  = headerRaw.match(/^Subject:\s*([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)/im)?.[1]?.replace(/\r?\n[ \t]+/g, ' ') || ''
        const dateHdr     = headerRaw.match(/^Date:\s*([^\r\n]+)/im)?.[1] || ''
        const messageId   = headerRaw.match(/^Message-ID:\s*<([^>]+)>/im)?.[1] || `uid-${uid}-${opts.user}`
        const { email: fromEmail, name: fromName } = parseFromHeader(fromHdr)
        const subject = decodeMimeHeader(subjectHdr)
        const dateReceived = parseDateHeader(dateHdr)
        const parts = parseMessageParts(headerRaw, textRaw)
        messages.push({
          uid,
          imapId: messageId,
          fromEmail,
          fromName,
          toRaw: decodeMimeHeader(toHdr),
          ccRaw: decodeMimeHeader(ccHdr),
          subject,
          dateReceived,
          bodyText: parts.text.trim(),
          bodyHtml: parts.html,
          attachments: parts.attachments,
        })
      } catch (err) {
        // Skip ce message si parse impossible, on continue
        console.warn(`[imap] skip uid=${uid}: ${(err as Error).message}`)
      }
    }
    await sendCommand(conn, 'LOGOUT').catch(() => {})
  } finally {
    try { conn.socket.end() } catch {}
  }
  return messages
}

/**
 * IMAP APPEND: pushes an RFC822 message into a folder (default Sent).
 *
 * OVH: the Sent folder has the name `INBOX.Sent Messages` (cf. incidents
 * feedback_invoicing_mailer_imap_ovh). Override via opts.folder if needed.
 *
 * Implementation: dedicated TLS connection, minimal parsing of IMAP responses
 * to handle the continuation `+ ...` that follows the APPEND command with
 * literal `{N}`. No connection reuse.
 */
export async function appendMessage(
  opts: ImapOptions & { folder: string },
  rfc822: Buffer,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host })
    let buffer = ''
    let state: 'greet' | 'login' | 'append' | 'literal' | 'logout' = 'greet'
    const timer = setTimeout(() => {
      try { socket.destroy() } catch {}
      reject(new Error('IMAP APPEND timeout'))
    }, opts.timeoutMs || 60_000)

    function fail(err: Error) {
      clearTimeout(timer)
      try { socket.destroy() } catch {}
      reject(err)
    }

    socket.on('error', fail)

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('binary')
      while (true) {
        const nl = buffer.indexOf('\r\n')
        if (nl < 0) return
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 2)

        if (state === 'greet') {
          if (!line.startsWith('* OK')) return fail(new Error(`IMAP greeting unexpected: ${line.slice(0, 80)}`))
          state = 'login'
          const safePass = opts.pass.replace(/(["\\])/g, '\\$1')
          socket.write(`A001 LOGIN "${opts.user}" "${safePass}"\r\n`)
          continue
        }

        if (state === 'login') {
          if (line.startsWith('A001 ')) {
            if (!/^A001\s+OK/.test(line)) return fail(new Error(`IMAP LOGIN failed: ${line}`))
            state = 'append'
            socket.write(`A002 APPEND "${opts.folder}" (\\Seen) {${rfc822.length}}\r\n`)
          }
          continue
        }

        if (state === 'append') {
          if (line.startsWith('+')) {
            // Serveur prêt pour le literal
            state = 'literal'
            socket.write(rfc822)
            socket.write('\r\n')
          } else if (line.startsWith('A002 ')) {
            // Refus avant continuation (NO/BAD)
            return fail(new Error(`IMAP APPEND rejected: ${line}`))
          }
          continue
        }

        if (state === 'literal') {
          if (line.startsWith('A002 ')) {
            if (!/^A002\s+OK/.test(line)) return fail(new Error(`IMAP APPEND failed: ${line}`))
            state = 'logout'
            socket.write('A003 LOGOUT\r\n')
          }
          continue
        }

        if (state === 'logout') {
          if (line.startsWith('A003 ')) {
            clearTimeout(timer)
            try { socket.end() } catch {}
            resolve()
            return
          }
        }
      }
    })

    socket.on('end', () => {
      if (state !== 'logout') {
        clearTimeout(timer)
        // Connexion fermée prématurément
        if (state === 'literal' || state === 'append') {
          // Si on a déjà reçu OK avant, on serait passé en logout
          reject(new Error('IMAP connection closed before APPEND completed'))
        }
      }
    })
  })
}
