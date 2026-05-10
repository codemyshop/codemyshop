/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

// ---------------------------------------------------------------------------
// Rate-limit store (in-memory, resets on server restart)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// ---------------------------------------------------------------------------
// URL validation helpers
// ---------------------------------------------------------------------------
const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
]

function validateUrl(raw: unknown): URL {
  if (!raw || typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid "url" parameter.' })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL format.' })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Only http and https URLs are accepted.' })
  }

  const hostname = parsed.hostname.toLowerCase()

  if (hostname === 'localhost' || hostname === '[::1]') {
    throw createError({ statusCode: 400, statusMessage: 'Localhost URLs are not allowed.' })
  }

  for (const regex of PRIVATE_IP_RANGES) {
    if (regex.test(hostname)) {
      throw createError({ statusCode: 400, statusMessage: 'Private/reserved IP addresses are not allowed.' })
    }
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Lightweight HTML helpers (no external parser needed)
// ---------------------------------------------------------------------------
function getTagContent(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = html.match(regex)
  return match ? match[1].trim() : null
}

function getAllTagContents(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    results.push(m[1].trim())
  }
  return results
}

function getMetaContent(html: string, attr: string, value: string): string | null {
  // Match both name="..." content="..." and content="..." name="..."
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']*)["'][^>]*/?>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${value}["'][^>]*/?>`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1]
  }
  return null
}

function getCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*\/?>/i)
    || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*\/?>/i)
  return m ? m[1] : null
}

function getJsonLdTypes(html: string): string[] {
  const types: string[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const extract = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(extract)
        } else if (obj && typeof obj === 'object') {
          if (obj['@type']) {
            const t = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]
            types.push(...t)
          }
          if (obj['@graph']) extract(obj['@graph'])
        }
      }
      extract(data)
    } catch { /* malformed JSON-LD, skip */ }
  }
  return types
}

function countImages(html: string): { total: number; withAlt: number; withoutAlt: number } {
  const imgs = html.match(/<img[^>]*\/?>/gi) || []
  let withAlt = 0
  let withoutAlt = 0
  for (const img of imgs) {
    if (/alt=["'][^"']+["']/i.test(img)) {
      withAlt++
    } else {
      withoutAlt++
    }
  }
  return { total: imgs.length, withAlt, withoutAlt }
}

function countLinks(html: string, baseHost: string): { internal: number; external: number } {
  const links = html.match(/<a[^>]+href=["']([^"']*)["'][^>]*>/gi) || []
  let internal = 0
  let external = 0
  for (const link of links) {
    const hrefMatch = link.match(/href=["']([^"']*)["']/i)
    if (!hrefMatch) continue
    const href = hrefMatch[1]
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
    try {
      const resolved = new URL(href, `https://${baseHost}`)
      if (resolved.hostname === baseHost) {
        internal++
      } else {
        external++
      }
    } catch {
      internal++ // relative URLs count as internal
    }
  }
  return { internal, external }
}

function getOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {}
  const regex = /<meta[^>]+property=["'](og:[^"']*)["'][^>]+content=["']([^"']*)["'][^>]*\/?>/gi
  const regex2 = /<meta[^>]+content=["']([^"']*)["'][^>]+property=["'](og:[^"']*)["'][^>]*\/?>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    tags[m[1]] = m[2]
  }
  while ((m = regex2.exec(html)) !== null) {
    tags[m[2]] = m[1]
  }
  return tags
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  score: number    // points earned
  maxScore: number // max possible
  value: string
  recommendation?: string
}

const LABEL_MAP: Record<string, string> = {
  title: 'Balise Title',
  meta_description: 'Meta Description',
  h1: 'Balise H1',
  json_ld: 'Données structurées JSON-LD',
  canonical: 'Balise Canonical',
  open_graph: 'Open Graph (réseaux sociaux)',
  img_alt: 'Images — attribut alt',
  links: 'Maillage interne / externe',
  ttfb: 'Temps de réponse serveur (TTFB)',
  https: 'HTTPS / SSL',
  robots: 'Directive robots',
}

const RECOMMENDATIONS: Record<string, Record<string, string>> = {
  title: { fail: 'Ajoutez une balise <title> unique avec votre mot-clé dans les 3 premiers mots.', warn: 'Ajustez la longueur du title entre 50 et 65 caractères pour un affichage optimal dans Google.' },
  meta_description: { fail: 'Ajoutez une meta description de 140-160 caractères avec votre mot-clé principal.', warn: 'Ajustez la longueur de la meta description entre 140 et 160 caractères.' },
  h1: { fail: 'Ajoutez une balise H1 unique contenant votre mot-clé principal.', warn: 'Gardez un seul H1 par page pour éviter la confusion des moteurs de recherche.' },
  json_ld: { fail: 'Ajoutez des données structurées JSON-LD (Product, Organization, BreadcrumbList) pour être visible des IA.' },
  canonical: { warn: 'Ajoutez une balise canonical pour éviter le contenu dupliqué et concentrer l\'autorité SEO.' },
  open_graph: { fail: 'Ajoutez les balises Open Graph (og:title, og:description, og:image) pour le partage social.', warn: 'Complétez les balises OG manquantes pour un partage social optimal.' },
  img_alt: { fail: 'Ajoutez un attribut alt descriptif à chaque image pour le SEO et l\'accessibilité.', warn: 'Certaines images manquent d\'attribut alt — ajoutez-les pour le SEO et l\'accessibilité.' },
  links: { warn: 'Ajoutez des liens internes vers vos pages stratégiques pour distribuer le PageRank.' },
  ttfb: { fail: 'Votre serveur est trop lent. Envisagez un VPS dédié avec Redis et Nginx.', warn: 'Le temps de réponse est acceptable mais pourrait être amélioré avec du cache serveur.' },
  https: { fail: 'Activez HTTPS avec un certificat SSL. C\'est obligatoire pour le SEO et la confiance.' },
  robots: { fail: 'Votre page est en noindex — elle ne sera jamais indexée par Google ni les IA.' },
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export default defineEventHandler(async (event) => {
  // Rate limiting
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || 'unknown'

  if (isRateLimited(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded. Maximum 10 requests per hour.',
    })
  }

  // Parse body
  const body = await readBody(event)
  const parsedUrl = validateUrl(body?.url)
  const email = body?.email && typeof body.email === 'string' ? body.email : undefined

  // Fetch the page
  const startTime = Date.now()
  let html: string
  let responseStatus: number
  let isHttps: boolean

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CodeMyShop-SEO-Audit/1.0 (+https://codemyshop.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)
    responseStatus = response.status
    isHttps = parsedUrl.protocol === 'https:'
    html = await response.text()
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'Target URL took longer than 10 seconds to respond.' })
    }
    throw createError({ statusCode: 502, statusMessage: `Failed to fetch URL: ${err?.message || 'unknown error'}` })
  }

  const ttfb = Date.now() - startTime

  // Run checks
  const checks: CheckResult[] = []

  // 1. Title
  const title = getTagContent(html, 'title')
  if (!title) {
    checks.push({ name: 'title', status: 'fail', score: 0, maxScore: 10, value: 'No <title> tag found.' })
  } else if (title.length >= 50 && title.length <= 65) {
    checks.push({ name: 'title', status: 'pass', score: 10, maxScore: 10, value: `Title present (${title.length} chars): "${title}"` })
  } else {
    checks.push({ name: 'title', status: 'warn', score: 5, maxScore: 10, value: `Title length ${title.length} chars (ideal: 50-65): "${title}"` })
  }

  // 2. Meta description
  const metaDesc = getMetaContent(html, 'name', 'description')
  if (!metaDesc) {
    checks.push({ name: 'meta_description', status: 'fail', score: 0, maxScore: 10, value: 'No meta description found.' })
  } else if (metaDesc.length >= 140 && metaDesc.length <= 160) {
    checks.push({ name: 'meta_description', status: 'pass', score: 10, maxScore: 10, value: `Meta description present (${metaDesc.length} chars).` })
  } else {
    checks.push({ name: 'meta_description', status: 'warn', score: 5, maxScore: 10, value: `Meta description length ${metaDesc.length} chars (ideal: 140-160).` })
  }

  // 3. H1
  const h1s = getAllTagContents(html, 'h1')
  if (h1s.length === 0) {
    checks.push({ name: 'h1', status: 'fail', score: 0, maxScore: 10, value: 'No <h1> tag found.' })
  } else if (h1s.length === 1) {
    checks.push({ name: 'h1', status: 'pass', score: 10, maxScore: 10, value: `Single H1 found: "${h1s[0].substring(0, 80)}"` })
  } else {
    checks.push({ name: 'h1', status: 'warn', score: 5, maxScore: 10, value: `${h1s.length} H1 tags found (should be unique).` })
  }

  // 4. JSON-LD
  const jsonLdTypes = getJsonLdTypes(html)
  if (jsonLdTypes.length > 0) {
    checks.push({ name: 'json_ld', status: 'pass', score: 10, maxScore: 10, value: `JSON-LD types found: ${jsonLdTypes.join(', ')}` })
  } else {
    checks.push({ name: 'json_ld', status: 'fail', score: 0, maxScore: 10, value: 'No JSON-LD structured data found.' })
  }

  // 5. Canonical
  const canonical = getCanonical(html)
  if (canonical) {
    checks.push({ name: 'canonical', status: 'pass', score: 10, maxScore: 10, value: `Canonical: ${canonical}` })
  } else {
    checks.push({ name: 'canonical', status: 'warn', score: 3, maxScore: 10, value: 'No canonical tag found.' })
  }

  // 6. Open Graph
  const ogTags = getOgTags(html)
  const ogKeys = Object.keys(ogTags)
  const requiredOg = ['og:title', 'og:description', 'og:image', 'og:url']
  const missingOg = requiredOg.filter(k => !ogTags[k])
  if (missingOg.length === 0) {
    checks.push({ name: 'open_graph', status: 'pass', score: 10, maxScore: 10, value: `All essential OG tags present (${ogKeys.length} total).` })
  } else if (ogKeys.length > 0) {
    checks.push({ name: 'open_graph', status: 'warn', score: 5, maxScore: 10, value: `Missing OG tags: ${missingOg.join(', ')}. Found: ${ogKeys.join(', ')}.` })
  } else {
    checks.push({ name: 'open_graph', status: 'fail', score: 0, maxScore: 10, value: 'No Open Graph tags found.' })
  }

  // 7. Image alt attributes
  const images = countImages(html)
  if (images.total === 0) {
    checks.push({ name: 'img_alt', status: 'warn', score: 5, maxScore: 10, value: 'No images found on the page.' })
  } else if (images.withoutAlt === 0) {
    checks.push({ name: 'img_alt', status: 'pass', score: 10, maxScore: 10, value: `All ${images.total} images have alt attributes.` })
  } else {
    const ratio = images.withAlt / images.total
    const earned = Math.round(ratio * 10)
    checks.push({ name: 'img_alt', status: ratio > 0.7 ? 'warn' : 'fail', score: earned, maxScore: 10, value: `${images.withAlt}/${images.total} images have alt attributes (${images.withoutAlt} missing).` })
  }

  // 8. Links
  const links = countLinks(html, parsedUrl.hostname)
  checks.push({
    name: 'links',
    status: links.internal > 0 ? 'pass' : 'warn',
    score: links.internal > 0 ? 5 : 2,
    maxScore: 5,
    detail: `${links.internal} internal links, ${links.external} external links.`,
  })

  // 9. TTFB
  if (ttfb < 600) {
    checks.push({ name: 'ttfb', status: 'pass', score: 5, maxScore: 5, value: `Response time: ${ttfb}ms (good).` })
  } else if (ttfb < 1500) {
    checks.push({ name: 'ttfb', status: 'warn', score: 3, maxScore: 5, value: `Response time: ${ttfb}ms (acceptable).` })
  } else {
    checks.push({ name: 'ttfb', status: 'fail', score: 0, maxScore: 5, value: `Response time: ${ttfb}ms (slow).` })
  }

  // 10. HTTPS
  if (isHttps) {
    checks.push({ name: 'https', status: 'pass', score: 5, maxScore: 5, value: 'URL uses HTTPS.' })
  } else {
    checks.push({ name: 'https', status: 'fail', score: 0, maxScore: 5, value: 'URL does not use HTTPS.' })
  }

  // 11. Robots meta
  const robotsMeta = getMetaContent(html, 'name', 'robots')
  if (!robotsMeta) {
    checks.push({ name: 'robots', status: 'pass', score: 5, maxScore: 5, value: 'No restrictive robots meta tag (default: index, follow).' })
  } else if (/noindex/i.test(robotsMeta)) {
    checks.push({ name: 'robots', status: 'fail', score: 0, maxScore: 5, value: `Robots meta contains "noindex": "${robotsMeta}".` })
  } else {
    checks.push({ name: 'robots', status: 'pass', score: 5, maxScore: 5, value: `Robots meta: "${robotsMeta}".` })
  }

  // Compute total score
  const totalEarned = checks.reduce((sum, c) => sum + c.score, 0)
  const totalMax = checks.reduce((sum, c) => sum + c.maxScore, 0)
  const score = Math.round((totalEarned / totalMax) * 100)

  // Add recommendations
  const enrichedChecks = checks.map(c => ({
    name: LABEL_MAP[c.name] ?? c.name,
    status: c.status,
    value: c.value,
    recommendation: c.status !== 'pass' ? RECOMMENDATIONS[c.name]?.[c.status] : undefined,
  }))

  return {
    url: parsedUrl.toString(),
    score,
    checks: enrichedChecks,
    fetchedAt: new Date().toISOString(),
  }
})
