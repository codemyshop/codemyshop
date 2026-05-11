

import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export interface PsWebserviceOptions {
  apiUrl: string                    
  resource: string                  
  query?: Record<string, string>
  apiKey: string                    
  hostHeader: string                
  method?: 'GET' | 'POST'
  timeoutMs?: number
}

export async function psWebservice<T = any>(opts: PsWebserviceOptions): Promise<T> {
  
  const base = opts.apiUrl.replace(/\/+$/, '')
  const apiBase = base.endsWith('/api') ? base : `${base}/api`
  const url = new URL(`${apiBase}/${opts.resource}`)

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v)
  }

  const isHttps = url.protocol === 'https:'
  const reqFn = isHttps ? httpsRequest : httpRequest
  const method = opts.method ?? 'GET'
  const timeoutMs = opts.timeoutMs ?? 8000

  return new Promise<T>((resolve, reject) => {
    const req = reqFn({
      host: url.hostname,
      port: Number(url.port) || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      timeout: timeoutMs,
      headers: {
        Host: opts.hostHeader,
        Authorization: `Basic ${Buffer.from(`${opts.apiKey}:`).toString('base64')}`,
        Accept: 'application/json',
      },
    }, (res) => {
      let raw = ''
      res.on('data', (c) => { raw += c })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`PS WS ${opts.resource} HTTP ${res.statusCode}`))
        }
        try {
          resolve(JSON.parse(raw))
        } catch {
          reject(new Error(`PS WS ${opts.resource} invalid JSON`))
        }
      })
    })
    req.on('timeout', () => { req.destroy(new Error(`PS WS ${opts.resource} timeout ${timeoutMs}ms`)) })
    req.on('error', reject)
    req.end()
  })
}
