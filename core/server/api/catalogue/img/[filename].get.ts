

import http from 'node:http'
import https from 'node:https'
import sharp from 'sharp'

const SIZE_MAP: Record<string, string> = {
  thumb:  'small_default',
  small:  'small_default',
  home:   'home_default',
  cart:   'cart_default',
  medium: 'medium_default',
  large:  'large_default',
  xl:     'large_default',
}

function resolveBaseUrl(clientId: string): string {
  const env = process.env
  const upper = clientId.toUpperCase().replace(/-/g, '_')
  const specificFront = env[`PS_FRONT_URL_${upper}`]
  if (specificFront) return specificFront.replace(/\/+$/, '')
  const specificUrl = env[`PS_URL_${upper}`]
  if (specificUrl) {
    const stripped = specificUrl.replace(/\/api\/?$/, '')
    if (!stripped.includes('localhost') && !stripped.includes('127.0.0.1')) return stripped
    const publicFront = env.NUXT_PUBLIC_PS_FRONT_URL
    if (publicFront) return publicFront.replace(/\/+$/, '')
    return stripped
  }
  const raw = (env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080/api').replace(/\/api\/?$/, '')
  if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
    const publicHost = env.NUXT_PUBLIC_PS_FRONT_URL || env.PS_HOST
    if (publicHost) return publicHost.startsWith('http') ? publicHost : `https://${publicHost}`
  }
  return raw
}

function fetchBuffer(fullUrl: string, hostHeader: string): Promise<Buffer> {
  const parsed = new URL(fullUrl)
  const transport = parsed.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = transport.request(fullUrl, { headers: { Host: hostHeader } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  
  
  
  const match = filename.match(/^(\d+)-([a-z]+)(?:-([a-z0-9-]+))?\.(webp|jpg|jpeg)$/i)
  if (!match) {
    throw createError({ statusCode: 400, message: 'Filename invalide (attendu: {id}-{size}[-{slug}].webp)' })
  }

  const imageId = Number(match[1])
  const sizeKey = match[2].toLowerCase()
  const psSize = SIZE_MAP[sizeKey] || 'home_default'
  const ext = match[4].toLowerCase()

  const { clientId } = getQuery(event) as { clientId?: string }
  const resolvedClient = clientId || 'ac-hub'
  const baseUrl = resolveBaseUrl(resolvedClient)

  const digits = imageId.toString().split('')
  const psPath = `/img/p/${digits.join('/')}/${imageId}-${psSize}.jpg`
  const fullUrl = `${baseUrl}${psPath}`

  const parsed = new URL(fullUrl)
  const hostHeader = (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ? (process.env.PS_HOST || process.env.NUXT_PS_HOST || 'localhost')
    : parsed.host

  try {
    const jpgBuffer = await fetchBuffer(fullUrl, hostHeader)

    
    const outBuffer = ext === 'webp'
      ? await sharp(jpgBuffer).webp({ quality: 82, effort: 4 }).toBuffer()
      : jpgBuffer

    setResponseHeaders(event, {
      'Content-Type': ext === 'webp' ? 'image/webp' : 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(outBuffer.length),
    })
    return outBuffer
  } catch (err: any) {
    throw createError({ statusCode: 404, message: `Image introuvable: ${err?.message || 'unknown'}` })
  }
})
