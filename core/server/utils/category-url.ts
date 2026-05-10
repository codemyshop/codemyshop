/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Category URL conventions — canonical with trailing slash.
 *
 * Rule (2026-04-21): all category URLs issued by API or stored
 * en DB doivent se terminer par `/`. Uniformise :
 * - SEO canonical (Google treats /foo and /foo/ as distinct URLs)
 *   - Breadcrumbs + navigation interne
 * - Front-end consumers (avoids concatenated hrefs that duplicate or omit)
 *
 * Do not apply to:
 * - Product URLs (e.g. /grossiste/olive/tartinable/medjool-premium-1kg) that
 * are leaf nodes without trailing slash convention
 *   - Query strings, fragments, URLs externes (http://…)
 */
export function ensureTrailingSlash(url: string | null | undefined): string {
  if (!url) return url || ''
  // Laisse passer URLs externes, ancres, query-only
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#') || url.startsWith('?')) {
    return url
  }
  // Split query/fragment pour les préserver à la fin
  const hashIdx = url.indexOf('#')
  const queryIdx = url.indexOf('?')
  const cut = [hashIdx, queryIdx].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? -1
  const base = cut >= 0 ? url.slice(0, cut) : url
  const suffix = cut >= 0 ? url.slice(cut) : ''
  if (!base) return url
  return base.endsWith('/') ? url : `${base}/${suffix}`
}

/**
 * Detects if a URL is a category URL (wholesale|brand pillars).
 * Used to selectively apply `ensureTrailingSlash` to
 * hrefs stored in DB, without touching product URLs or custom pages.
 */
export function isCategoryHref(url: string | null | undefined): boolean {
  if (!url) return false
  // Route catégorie tenant : /grossiste/... /marque/... /catalogue/... /c/...
  return /^\/(grossiste|marque|catalogue|c)(\/|$)/i.test(url)
}
