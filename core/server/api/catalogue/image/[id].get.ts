/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/image/:id?clientId=example-shop-v2&size=home_default
 * Proxies product images from PrestaShop's /img/p/ directory.
 * Avoids CORS issues and hides PS infrastructure from the browser.
 */
import http from 'node:http'
import https from 'node:https'

function resolveBaseUrl(clientId: string): string {
  const env = process.env
  const upper = clientId.toUpperCase().replace(/-/g, '_')

  // 1. Front URL spécifique client (PS_FRONT_URL_EXAMPLE_V2…) — prime sur l'URL API
  // qui pointe souvent vers un backend interne sans fichiers statiques.
  const specificFront = env[`PS_FRONT_URL_${upper}`]
  if (specificFront) return specificFront.replace(/\/+$/, '')

  // 2. URL API spécifique client (PS_URL_EXAMPLE_V2, PS_URL_AC_HUB…)
  // On privilégie ça SI elle pointe vers un host public. Si interne
  // (127.0.0.1 / localhost), on retombe sur NUXT_PUBLIC_PS_FRONT_URL qui
  // a les images physiques (cas Example Shop v2 : snapshot migré, images encore
  // sur example-shop.com).
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

  // 3. Fallback default (AC Hub)
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

  // Construire le chemin PS : /img/p/1/2/3/123-home_default.jpg
  const digits = imageId.toString().split('')
  const imgPath = `/img/p/${digits.join('/')}/${imageId}-${imgSize}.jpg`
  const fullUrl = `${baseUrl}${imgPath}`

  const parsedUrl = new URL(fullUrl)
  const transport = parsedUrl.protocol === 'https:' ? https : http

  // Host header obligatoire pour PS derrière Docker (sinon 302)
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
