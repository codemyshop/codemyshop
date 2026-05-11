

import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { getTenantPsConfig } from '~/server/utils/ps-tenant'

const ALLOWED_MODULES = new Set([
  'ac_smartlead',
  'ac_smartproject',
])

export default defineEventHandler(async (event) => {
  const { module, controller, body: clientBody } = await readBody(event) as {
    module: string
    controller: string
    body?: Record<string, unknown>
  }

  if (!module || !controller) {
    throw createError({ statusCode: 400, message: 'module et controller requis' })
  }

  if (!ALLOWED_MODULES.has(module)) {
    throw createError({ statusCode: 403, message: `Module '${module}' non autorisé` })
  }

  
  const tenant = getTenantPsConfig(event)
  let baseUrl = (tenant.apiUrl || '').replace(/\/api\/?$/, '')
  const hostHeader = tenant.hostHeader

  if (!baseUrl) {
    const config = useRuntimeConfig()
    baseUrl = config.psBaseUrl as string
  }

  
  const apiKey = tenant.apiKey || ''
  const payload: Record<string, string> = { token: apiKey }
  if (clientBody) {
    for (const [k, v] of Object.entries(clientBody)) {
      if (v !== null && v !== undefined) payload[k] = String(v)
    }
  }

  
  const encoded = Object.entries(payload)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const url = new URL(`${baseUrl}/module/${module}/${controller}`)
  const isHttps = url.protocol === 'https:'

  return new Promise((resolve, reject) => {
    const reqFn = isHttps ? httpsRequest : httpRequest
    const req = reqFn({
      host: url.hostname,
      port: Number(url.port) || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Host': hostHeader || url.host,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(Buffer.byteLength(encoded)),
      },
    }, (res) => {
      let raw = ''
      res.on('data', (chunk: string) => { raw += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw))
        } catch {
          reject(new Error(`PS invalide (${res.statusCode}): ${raw.substring(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.write(encoded)
    req.end()
  })
})
