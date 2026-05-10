/**
 * HTTP proxy to a PrestaShop front controller.
 * Forces the Host header for Docker (else 302).
 *
 * Multi-tenant: if an H3Event is passed as the 2nd parameter, the tenant is resolved
 * via getTenantPsConfig (env PS_URL_<KEY>/PS_HOST_<KEY>). Without an event, fallback
 * to runtimeConfig.psBaseUrl/psHost (legacy hub compatibility).
 *
 */
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { getTenantPsConfig } from './ps-tenant'

interface PsProxyOptions {
  module?: string
  controller: string
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  headers?: Record<string, string>
  query?: Record<string, string>
}

export async function psProxy<T = Record<string, unknown>>(opts: PsProxyOptions, event?: any): Promise<T> {
  let baseUrlStr = ''
  let effectiveHost = ''

  if (event) {
    const tenant = getTenantPsConfig(event)
    // psProxy tape /module/<mod>/<controller> donc base = racine PS sans /api
    baseUrlStr = (tenant.apiUrl || '').replace(/\/api\/?$/, '')
    effectiveHost = tenant.hostHeader
  }

  if (!baseUrlStr) {
    const config = useRuntimeConfig()
    baseUrlStr = config.psBaseUrl as string
    if (!effectiveHost) effectiveHost = (config.psHost as string) || ''
  }

  const mod = opts.module ?? 'ac_academy'
  // Forme query-string `?fc=module&module=X&controller=Y` plutôt que pretty
  // URL `/module/X/Y` : pas de dépendance sur Apache mod_rewrite + .htaccess
  // (cf doctrine 2026-04-22 + incidents Example Shop v2 sans .htaccess → 404 sur
  // tous les psProxy). Cohérent avec sync-modules-tenant.sh.
  const baseUrl = new URL(`${baseUrlStr}/index.php`)
  baseUrl.searchParams.set('fc', 'module')
  baseUrl.searchParams.set('module', mod)
  baseUrl.searchParams.set('controller', opts.controller)

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      baseUrl.searchParams.set(k, v)
    }
  }

  if (!effectiveHost) effectiveHost = baseUrl.host

  const method = opts.method ?? 'POST'
  const payload = opts.body ? JSON.stringify(opts.body) : ''
  const isHttps = baseUrl.protocol === 'https:'

  return new Promise<T>((resolve, reject) => {
    const reqHeaders: Record<string, string> = {
      'Host': effectiveHost,
      'X-Forwarded-Proto': 'https',
      ...(opts.headers ?? {}),
    }

    if (method === 'POST' && payload) {
      reqHeaders['Content-Type'] = 'application/json'
      reqHeaders['Content-Length'] = String(Buffer.byteLength(payload))
    }

    const reqFn = isHttps ? httpsRequest : httpRequest
    const req = reqFn({
      host: baseUrl.hostname,
      port: Number(baseUrl.port) || (isHttps ? 443 : 80),
      path: baseUrl.pathname + baseUrl.search,
      method,
      headers: reqHeaders,
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => { raw += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw))
        } catch {
          reject(new Error(`Réponse PS invalide: ${raw.substring(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    if (method === 'POST' && payload) req.write(payload)
    req.end()
  })
}

/** Pièce de multipart — un champ texte OU un fichier. */
export interface MultipartPart {
  name: string
  /** If defined, the part is a file. Otherwise it's a text field. */
  filename?: string
  contentType?: string
  /** Buffer (fichier) ou string (champ texte). */
  data: Buffer | string
}

/**
 * Variant of psProxy for multipart/form-data. Builds the body
 * manually (undici_no_host_override incidents — we remain on
 * node:http to force the Host header in Docker network).
 *
 * Usage :
 *   await psProxyMultipart({
 *     module: 'ac_attachmentapi',
 *     controller: 'upload',
 *     parts: [
 *       { name: 'id_product', data: '42' },
 *       { name: 'file', filename: 'ft.pdf', contentType: 'application/pdf', data: buffer },
 *     ],
 *   }, event)
 */
export async function psProxyMultipart<T = Record<string, unknown>>(
  opts: { module?: string; controller: string; parts: MultipartPart[]; query?: Record<string, string> },
  event?: any,
): Promise<T> {
  let baseUrlStr = ''
  let effectiveHost = ''

  if (event) {
    const tenant = getTenantPsConfig(event)
    baseUrlStr = (tenant.apiUrl || '').replace(/\/api\/?$/, '')
    effectiveHost = tenant.hostHeader
  }
  if (!baseUrlStr) {
    const config = useRuntimeConfig()
    baseUrlStr = config.psBaseUrl as string
    if (!effectiveHost) effectiveHost = (config.psHost as string) || ''
  }

  const mod = opts.module ?? 'ac_academy'
  const baseUrl = new URL(`${baseUrlStr}/index.php`)
  baseUrl.searchParams.set('fc', 'module')
  baseUrl.searchParams.set('module', mod)
  baseUrl.searchParams.set('controller', opts.controller)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) baseUrl.searchParams.set(k, v)
  }
  if (!effectiveHost) effectiveHost = baseUrl.host

  // Boundary aléatoire — ASCII, safe pour les parsers PHP.
  const boundary = '----AcHubBoundary' + Math.random().toString(16).slice(2) + Date.now().toString(16)

  const chunks: Buffer[] = []
  const CRLF = '\r\n'

  for (const part of opts.parts) {
    chunks.push(Buffer.from(`--${boundary}${CRLF}`, 'ascii'))
    if (part.filename !== undefined) {
      // Fichier
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"${CRLF}`,
        'ascii',
      ))
      chunks.push(Buffer.from(
        `Content-Type: ${part.contentType || 'application/octet-stream'}${CRLF}${CRLF}`,
        'ascii',
      ))
      chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data))
      chunks.push(Buffer.from(CRLF, 'ascii'))
    } else {
      // Champ texte — en-têtes UTF-8 (PHP sanitize via Tools::getValue).
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"${CRLF}${CRLF}`,
        'ascii',
      ))
      chunks.push(Buffer.from(typeof part.data === 'string' ? part.data : part.data.toString('utf8'), 'utf8'))
      chunks.push(Buffer.from(CRLF, 'ascii'))
    }
  }
  chunks.push(Buffer.from(`--${boundary}--${CRLF}`, 'ascii'))

  const body = Buffer.concat(chunks)
  const isHttps = baseUrl.protocol === 'https:'

  return new Promise<T>((resolve, reject) => {
    const reqFn = isHttps ? httpsRequest : httpRequest
    const req = reqFn({
      host: baseUrl.hostname,
      port: Number(baseUrl.port) || (isHttps ? 443 : 80),
      path: baseUrl.pathname + baseUrl.search,
      method: 'POST',
      headers: {
        'Host': effectiveHost,
        'X-Forwarded-Proto': 'https',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
    }, (res) => {
      const bufs: Buffer[] = []
      res.on('data', (chunk: Buffer) => { bufs.push(chunk) })
      res.on('end', () => {
        const raw = Buffer.concat(bufs).toString('utf8')
        try { resolve(JSON.parse(raw)) } catch {
          reject(new Error(`Réponse PS invalide (${res.statusCode}): ${raw.substring(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
