/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Nitro middleware — language prefix detection in the URL.
 *
 * Role:
 * 1. Store the language in event.context._langPrefix (read by SSR plugins)
 * 2. Inject ?lang=xx on internal /api/* calls (resolveIdLang depends on it)
 * 3. Redirect /fr/... → /... with 301 (fr = default, no prefix = canonical)
 *
 * Page routing (SSR rendering) is managed by the i18n-routes.ts module
 * which duplicates Vue Router routes with a /:lang() prefix.
 * We don't do URL rewriting here because H3 v1.15 captures _reqPath
 * as a const before middlewares — the rewrite would be overwritten.
 *
 * Numbered 00- to execute BEFORE SEO redirects (01/02).
 */

const LANG_PREFIX_RE = /^\/([a-z]{2})(\/.*)?$/

const KNOWN_LANGS = new Set([
  'fr', 'en', 'de', 'es', 'it', 'nl', 'pt',
  'ar', 'zh', 'ja', 'ko', 'ru', 'pl', 'tr',
])

// Préfixes réservés à des routes réelles (pas des langues)
const RESERVED_PREFIXES = new Set(['bo', 'ma'])

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Ne pas toucher aux assets ou chemins internes Nuxt
  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt')) {
    return
  }

  const match = path.match(LANG_PREFIX_RE)
  if (!match) return

  const lang = match[1]
  const rest = match[2] || '/'

  if (!KNOWN_LANGS.has(lang) || RESERVED_PREFIXES.has(lang)) return

  // /fr/... → 301 vers /... (fr = langue par défaut, canonical sans préfixe)
  if (lang === 'fr') {
    return sendRedirect(event, rest + url.search, 301)
  }

  // Stocker la langue dans le contexte pour les plugins SSR
  // (hub-translations.server.ts, i18n-lang.ts)
  event.context._langPrefix = lang

  // Pour les appels API, injecter ?lang=xx pour que resolveIdLang() le trouve.
  // Les API ne passent PAS par le Vue Router, donc le param :lang n'existe pas.
  if (path.startsWith('/api/')) {
    const existingSearch = url.search
    if (!existingSearch.includes('lang=')) {
      const langQuery = `lang=${lang}`
      const newSearch = existingSearch
        ? `${existingSearch}&${langQuery}`
        : `?${langQuery}`
      event.node.req.url = rest + newSearch
    }
  }
})
