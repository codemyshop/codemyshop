

import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { clientIdToEnvKey } from '~/server/utils/ps-tenant'

interface PsProxyTenantOptions {
  module: string
  controller: string
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}

export async function psProxyForTenant<T = Record<string, unknown>>(
  tenantId: string,
  opts: PsProxyTenantOptions,
): Promise<T> {
  const envKey = clientIdToEnvKey(tenantId)
  const env = process.env

  let baseUrlStr = env[`PS_URL_${envKey}`] || ''
  const apiKey = env[`PS_API_KEY_${envKey}`] || ''
  let hostHeader = env[`PS_HOST_${envKey}`] || ''

  
  if (!baseUrlStr) baseUrlStr = env.PS_BASE_URL || ''
  if (!hostHeader && baseUrlStr) {
    try { hostHeader = new URL(baseUrlStr).host } catch {  }
  }

  if (!baseUrlStr) {
    throw new Error(`[PsProxyService] No PS_URL configured for tenant '${tenantId}' (env key: PS_URL_${envKey})`)
  }

  
  baseUrlStr = baseUrlStr.replace(/\/api\/?$/, '')

  const url = new URL(`${baseUrlStr}/module/${opts.module}/${opts.controller}`)
  const method = opts.method ?? 'POST'

  
  const bodyData = { ...opts.body }
  if (bodyData.token === '__TENANT_API_KEY__') {
    bodyData.token = apiKey
  }

  
  
  const payload = Object.entries(bodyData)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ''))}`)
    .join('&')
  const isHttps = url.protocol === 'https:'

  return new Promise<T>((resolve, reject) => {
    const reqFn = isHttps ? httpsRequest : httpRequest
    const req = reqFn({
      host: url.hostname,
      port: Number(url.port) || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Host': hostHeader || url.host,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(Buffer.byteLength(payload)),
      },
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => { raw += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch {
          reject(new Error(`PS response invalide (${res.statusCode}): ${raw.substring(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}
