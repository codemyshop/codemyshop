

const LANG_PREFIX_RE = /^\/([a-z]{2})(\/.*)?$/

const KNOWN_LANGS = new Set([
  'fr', 'en', 'de', 'es', 'it', 'nl', 'pt',
  'ar', 'zh', 'ja', 'ko', 'ru', 'pl', 'tr',
])

const RESERVED_PREFIXES = new Set(['bo', 'ma'])

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  
  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt')) {
    return
  }

  const match = path.match(LANG_PREFIX_RE)
  if (!match) return

  const lang = match[1]
  const rest = match[2] || '/'

  if (!KNOWN_LANGS.has(lang) || RESERVED_PREFIXES.has(lang)) return

  
  if (lang === 'fr') {
    return sendRedirect(event, rest + url.search, 301)
  }

  
  
  event.context._langPrefix = lang

  
  
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
