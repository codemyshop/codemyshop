/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Nitro middleware — anti-scraping rate limit on public endpoints.
 *
 * Covers all Nuxt tenants automatically (core package deployed to
 * all sites). Backed by Redis via `rateLimit()` (fail-open if Redis
 * down — never block a paying customer due to a transient failure).
 *
 * Strategy :
 * 1. Skip internal Nuxt routes, assets, sitemap, robots.txt
 * 2. Skip if User-Agent matches a legitimate crawler (Googlebot, Bingbot,
 * DuckDuckBot, AhrefsBot partially allowed) — User-Agent verification
 * only (reverse-DNS stricter but slower; to harden if
 *      observation de spoofing UA)
 * 3. Skip if runtimeConfig.disableRateLimit (for open demo
 * if decided) — disableable per tenant
 * 4. Bucket by endpoint category (catalog / generic API / pages)
 * with different budgets
 * 5. Key = visitor IP (X-Forwarded-For priority, socket fallback)
 * 6. 429 + Retry-After header if exceeded
 */

import { rateLimit } from '../utils/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Buckets : (regex path, max req, window seconds)
// Plus le path est sensible, plus le budget est serré.
// ─────────────────────────────────────────────────────────────────────────────
const BUCKETS: Array<{ name: string; match: RegExp; max: number; windowSec: number }> = [
  // Catalogue : scrape cible n°1 — strict
  { name: 'catalogue', match: /^\/api\/catalogue\//,    max: 60,  windowSec: 60 },  // ~1 req/s
  // Stores (store locator) : moins agressif
  { name: 'stores',    match: /^\/api\/stores(\/|$|\?)/,max: 30,  windowSec: 60 },
  // Produits par slug (résolveur SEO)
  { name: 'product',   match: /^\/api\/product-/,        max: 60, windowSec: 60 },
  // API générique (menus, header, footer, hub) — usage normal du front
  { name: 'api',       match: /^\/api\//,                max: 120, windowSec: 60 },  // 2 req/s
  // Pages produit / catégorie SSR (potentiellement scrapées via crawl HTML)
  { name: 'page',      match: /^\/(produit|grossiste|marque|skateboard|marques)\//, max: 90, windowSec: 60 },
]

// User-Agents whitelistés (crawlers légitimes) — bypass rate limit
const WHITELIST_UA = /(Googlebot|Bingbot|DuckDuckBot|YandexBot|Applebot|Slurp|Twitterbot|facebookexternalhit|LinkedInBot|WhatsApp|TelegramBot|PinterestBot|SemrushBot|AhrefsBot)/i

// User-Agents blacklistés explicitement (scrapers connus malveillants).
// curl/wget/python-requests retirés : utilisés légitimement par les devs
// pour tester leur propre site + par le smoke test interne. Le rate limit
// classique fait son job sur ces UA, pas besoin de block immédiat.
const BLACKLIST_UA = /(scrapy|httrack|nikto|nuclei|sqlmap|gobuster|dirbuster)/i

// Skippe les routes internes Nuxt + assets + endpoints public-by-design
const SKIP_PATHS = /^\/(_nuxt|_ipx|_fonts|__sitemap|favicon|robots\.txt|sitemap|img\/|fonts\/)/

function getClientIp(event: any): string {
  const xff = getHeader(event, 'x-forwarded-for')
  if (xff) return String(xff).split(',')[0].trim()
  const xreal = getHeader(event, 'x-real-ip')
  if (xreal) return String(xreal).trim()
  // Fallback : adresse de la socket (rarement utile derrière reverse proxy)
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}

export default defineEventHandler(async (event) => {
  // 1. Skip interne / assets
  const url = getRequestURL(event)
  const path = url.pathname
  if (SKIP_PATHS.test(path)) return

  // 2. Skip si désactivé via runtimeConfig (ex: codemyshop-demo en mode démo ouverte)
  const cfg = useRuntimeConfig(event) as any
  if (cfg.disableRateLimit === true || cfg.public?.disableRateLimit === true) return

  // 3. Détermine le bucket applicable
  const bucket = BUCKETS.find((b) => b.match.test(path))
  if (!bucket) return  // Path non couvert : laisse passer

  // 4. Skip crawlers légitimes
  const ua = String(getHeader(event, 'user-agent') || '')
  if (WHITELIST_UA.test(ua)) return

  // 5. Bloque immédiat les UA blacklistés (sans incrémenter le compteur)
  if (BLACKLIST_UA.test(ua)) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', '3600')
    setResponseHeader(event, 'X-RateLimit-Reason', 'blacklisted-ua')
    return { error: 'Too Many Requests', reason: 'Automated access detected' }
  }

  // 6. Rate limit par IP+bucket
  const ip = getClientIp(event)
  const key = `${bucket.name}:${ip}`
  const allowed = await rateLimit(key, bucket.max, bucket.windowSec)

  if (!allowed) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', String(bucket.windowSec))
    setResponseHeader(event, 'X-RateLimit-Bucket', bucket.name)
    setResponseHeader(event, 'X-RateLimit-Limit', String(bucket.max))
    setResponseHeader(event, 'X-RateLimit-Window', String(bucket.windowSec))
    return { error: 'Too Many Requests', bucket: bucket.name, retryAfter: bucket.windowSec }
  }

  // Headers info (debug + transparence)
  setResponseHeader(event, 'X-RateLimit-Bucket', bucket.name)
  setResponseHeader(event, 'X-RateLimit-Limit', String(bucket.max))
})
