

import dns from 'node:dns/promises'
import net from 'node:net'

export type EmailVerifyStatus =
  | 'ok'              
  | 'rejected'        
  | 'unknown'         
  | 'mx_missing'      
  | 'connect_failed'  
  | 'invalid_input'   

export interface EmailVerifyResult {
  status:   EmailVerifyStatus
  code?:    number       
  detail?:  string       
  mxHost?:  string       
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

  
  let mxHost: string | null = null
  try {
    const mxList = await dns.resolveMx(domain)
    if (mxList?.length) {
      mxList.sort((a, b) => a.priority - b.priority)
      mxHost = mxList[0].exchange
    }
  } catch {  }
  if (!mxHost) {
    try {
      const a = await dns.resolve4(domain)
      if (a?.length) mxHost = domain
    } catch {  }
  }
  if (!mxHost) return { status: 'mx_missing' }

  
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
      try { socket.write('QUIT\r\n') } catch {  }
      try { socket.destroy() } catch {  }
      resolve(r)
    }

    socket.setTimeout(TIMEOUT_MS)
    socket.setEncoding('utf8')

    const send = (cmd: string) => {
      try { socket.write(cmd + '\r\n') } catch {  }
    }

    socket.on('connect', () => {
      
    })

    socket.on('data', (chunk) => {
      buffer += String(chunk)
      
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
        if (!isFinal) continue 

        
        if (step === 0) {
          if (code !== 220) return finish({ status: 'connect_failed', code, detail: line, mxHost: mxHost! })
          step = 1
          send(`EHLO ${HELO_DOMAIN}`)
        } else if (step === 1) {
          if (code !== 250) {
            
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
        
        finish({ status: 'unknown', code: lastCode, detail: lastDetail || 'connection closed', mxHost: mxHost! })
      }
    })
  })
}
