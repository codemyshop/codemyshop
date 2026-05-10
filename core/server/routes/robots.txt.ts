/**
 *
 * GET /robots.txt
 * Dynamic per tenant — references the correct sitemap.
 */

export default defineEventHandler((event) => {
  const host = getRequestHost(event) || ''

  let sitemapUrl = 'https://codemyshop.com/sitemap.xml'
  let extra = ''

  if (host.includes('codemyshop')) {
    sitemapUrl = 'https://codemyshop.com/sitemap.xml'
  }

  if (host.includes('preprod')) {
    extra = '\n# Preprod — no indexing\nUser-agent: *\nDisallow: /\n'
  }

  const disallow = [
    '/crm/',
    '/hub/',
    '/api/',
    '/module/',
    '/img/',
    '/mon-compte',
    '/__nuxt_error',
  ].map(p => `Disallow: ${p}`).join('\n')

  // ── Bots d'entraînement IA — BLOQUÉS (pillage IP sans attribution) ──
  // GPTBot = entraînement modèles OpenAI
  // Google-Extended = entraînement Gemini
  // CCBot = entraînement Common Crawl / datasets IA
  // Bytespider = entraînement modèles ByteDance
  // anthropic-ai = entraînement modèles Anthropic (training crawler distinct de ClaudeBot)
  const aiTrainingBlock = `
# AI Training Crawlers — BLOQUÉS (propriété intellectuelle)
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: anthropic-ai
Disallow: /
`

  // ── Bots de recherche live IA — AUTORISÉS (visibilité, citation avec lien) ──
  // ChatGPT-User = recherche web en temps réel quand un utilisateur pose une question
  // PerplexityBot = recherche web Perplexity (cite les sources)
  // Amazonbot = Alexa answers
  // ClaudeBot = recherche web Claude (citation avec lien)
  const aiSearchAllow = `
# AI Search Crawlers — autorisés (recherche live avec attribution)
User-agent: ChatGPT-User
Allow: /blog/
Allow: /academy/
Allow: /dictionnaire/
Allow: /expertise/
Allow: /equipe
Allow: /manifeste
${disallow}

User-agent: PerplexityBot
Allow: /blog/
Allow: /academy/
Allow: /dictionnaire/
${disallow}

User-agent: Amazonbot
Allow: /blog/
Allow: /academy/
${disallow}

User-agent: claudebot
Allow: /blog/
Allow: /academy/
Allow: /dictionnaire/
Allow: /expertise/
Allow: /equipe
Allow: /manifeste
Allow: /drill
Allow: /synedre/
${disallow}
`

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\n${disallow}\n${aiTrainingBlock}${aiSearchAllow}${extra}\nSitemap: ${sitemapUrl}\n`
})
