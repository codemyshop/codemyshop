

import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

const INDEXING_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
const INDEXNOW_URL = 'https://api.indexnow.org/indexnow'

interface IndexingResult {
  google: { success: boolean; error?: string }
  indexnow: { success: boolean; error?: string }
}

export async function notifyUrlUpdated(url: string): Promise<IndexingResult> {
  const result: IndexingResult = {
    google: { success: false },
    indexnow: { success: false },
  }

  
  try {
    const token = await getGoogleAccessToken()
    if (token) {
      const res = await fetch(INDEXING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          type: 'URL_UPDATED',
        }),
      })
      if (res.ok) {
        result.google.success = true
        console.log(`[indexing] Google notified: ${url}`)
      } else {
        const errText = await res.text()
        result.google.error = `${res.status}: ${errText}`
        console.warn(`[indexing] Google error: ${result.google.error}`)
      }
    } else {
      result.google.error = 'No service account configured'
    }
  } catch (err: any) {
    result.google.error = err?.message || String(err)
    console.warn(`[indexing] Google exception: ${result.google.error}`)
  }

  
  try {
    const apiKey = process.env.INDEXNOW_API_KEY
    if (apiKey) {
      const host = new URL(url).host
      const res = await fetch(INDEXNOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          key: apiKey,
          keyLocation: `https://${host}/${apiKey}.txt`,
          urlList: [url],
        }),
      })
      if (res.ok || res.status === 202) {
        result.indexnow.success = true
        console.log(`[indexing] IndexNow notified: ${url}`)
      } else {
        result.indexnow.error = `${res.status}`
      }
    } else {
      result.indexnow.error = 'INDEXNOW_API_KEY not configured'
    }
  } catch (err: any) {
    result.indexnow.error = err?.message || String(err)
  }

  return result
}

export async function notifyUrlsBatch(urls: string[]): Promise<{ total: number; google: number; indexnow: number }> {
  let googleOk = 0
  let indexnowOk = 0

  for (const url of urls) {
    const r = await notifyUrlUpdated(url)
    if (r.google.success) googleOk++
    if (r.indexnow.success) indexnowOk++
    
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return { total: urls.length, google: googleOk, indexnow: indexnowOk }
}

async function getGoogleAccessToken(): Promise<string | null> {
  const saPath = process.env.GSC_SERVICE_ACCOUNT_PATH || ''
  const fullPath = resolve(saPath)

  if (!saPath || !existsSync(fullPath)) return null

  try {
    const sa = JSON.parse(readFileSync(fullPath, 'utf8'))
    const now = Math.floor(Date.now() / 1000)

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url')

    const crypto = await import('node:crypto')
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(`${header}.${payload}`)
    const signature = sign.sign(sa.private_key, 'base64url')

    const jwt = `${header}.${payload}.${signature}`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    if (tokenRes.ok) {
      const data = await tokenRes.json() as { access_token: string }
      return data.access_token
    }
  } catch (err: any) {
    console.warn('[indexing] Auth error:', err?.message)
  }

  return null
}
