

import http from 'node:http'
import https from 'node:https'

function resolveBaseUrl(clientId: string): string {
  const env = process.env
  const upper = clientId.toUpperCase().replace(/-/g, '_')

  
  
  const specificFront = env[`PS_FRONT_URL_${upper}`]
  if (specificFront) return specificFront.replace(/\/+$/, '')

  
  
  
  
  
  const specificUrl = env[`PS_URL_${upper}`]
  if (specificUrl) {
    const stripped = specificUrl.replace(/\/api\/?$/, '')
    if (!stripped.includes('localhost') && !stripped.includes('127.0.0.1')) {
      return stripped
    }
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

export default defineEventHandler(async (event) => {
  const imageId = Number(getRouterParam(event, 'id'))
  if (!imageId || isNaN(imageId)) throw createError({ statusCode: 400, message: 'ID image invalide' })

  const { clientId, size } = getQuery(event) as { clientId?: string; size?: string }
  const imgSize = size || 'home_default'
  const resolvedClient = clientId || 'ac-hub'

  const baseUrl = resolveBaseUrl(resolvedClient)

  
  const digits = imageId.toString().split('')
  const imgPath = `/img/p/${digits.join('/')}/${imageId}-${imgSize}.jpg`
  const fullUrl = `${baseUrl}${imgPath}`

  const parsedUrl = new URL(fullUrl)
  const transport = parsedUrl.protocol === 'https:' ? https : http

  
  const env = process.env
  const hostHeader = (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    ? (env.PS_HOST || env.NUXT_PS_HOST || 'localhost')
    : parsedUrl.host

  return new Promise((resolve, reject) => {
    const req = transport.request(fullUrl, {
      headers: { Host: hostHeader },
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(createError({ statusCode: 404, message: 'Image introuvable' }))
        return
      }

      const contentType = res.headers['content-type'] || 'image/jpeg'
      setResponseHeaders(event, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      })
      if (res.headers['content-length']) {
        setResponseHeader(event, 'Content-Length', res.headers['content-length'])
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', () => reject(createError({ statusCode: 502, message: 'Erreur connexion PS' })))
    req.setTimeout(10000, () => { req.destroy(); reject(createError({ statusCode: 504, message: 'Timeout PS image' })) })
    req.end()
  })
})
