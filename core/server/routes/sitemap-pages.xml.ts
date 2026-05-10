/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-pages.xml
 * Auto-discovery — scans .vue files in clients/{clientId}/pages/ + core/pages/.
 * Never miss pages: every new .vue file appears automatically.
 */

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Pages à exclure (internes, dynamiques, noindex)
const EXCLUDED = ['onboarding', 'suspended', 'mon-compte', 'produit']

// Priorité explicite (le reste = 0.6)
const PRIORITY_MAP: Record<string, string> = {
  '/':                       '1.0',
  '/blog':                   '0.9',
  '/offre-starter':          '0.9',
  '/offre-premium':          '0.8',
  '/expertise':              '0.9',
  '/academy':                '0.8',
  '/dictionnaire':           '0.8',
  '/agents-ia':              '0.8',
  '/synedre':                '0.8',
  '/synedre/constitution':   '0.7',
  '/synedre/reunion':        '0.7',
  '/drill':                  '0.7',
  '/flywheel':               '0.7',
  '/reacteur':               '0.7',
  '/modules':                '0.7',
  '/outils-ia':              '0.7',
  '/catalogue':              '0.6',
  '/equipe':                 '0.6',
  '/a-propos':               '0.6',
  '/ambassadeur':            '0.6',
  '/manifeste':              '0.6',
  '/presse':                 '0.6',
  '/contact':                '0.5',
  '/mentions-legales':       '0.3',
  '/confidentialite':        '0.3',
  '/conditions-utilisation': '0.3',
  '/livraison':              '0.3',
  '/paiement-securise':      '0.3',
}

const CHANGEFREQ_MAP: Record<string, string> = {
  '/':            'weekly',
  '/blog':        'daily',
  '/expertise':   'weekly',
  '/academy':     'weekly',
  '/dictionnaire':'weekly',
  '/agents-ia':   'weekly',
  '/drill':       'weekly',
  '/reacteur':    'always',
  '/catalogue':   'weekly',
}

function getChangefreq(loc: string, priority: string): string {
  if (CHANGEFREQ_MAP[loc]) return CHANGEFREQ_MAP[loc]
  if (parseFloat(priority) <= 0.3) return 'yearly'
  return 'monthly'
}

/**
 * Recursively scans a folder of .vue pages and returns the routes.
 * Ignores dynamic files ([param].vue), hub/ folders, and exclusions.
 */
function scanPages(dir: string, prefix = ''): string[] {
  const routes: string[] = []

  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return routes
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry)

    // Ignorer hub (admin) et dossiers internes
    if (entry === 'hub' || entry.startsWith('.') || entry.startsWith('_')) continue

    try {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        // Dossier → récurse (mais skip les sous-pages dynamiques comme [slug])
        if (!entry.startsWith('[')) {
          routes.push(...scanPages(fullPath, `${prefix}/${entry}`))
        }
      } else if (entry.endsWith('.vue')) {
        const name = entry.replace('.vue', '')

        // Skip dynamiques et exclusions
        if (name.startsWith('[')) continue
        if (EXCLUDED.some(ex => name.includes(ex))) continue

        const route = name === 'index' ? prefix || '/' : `${prefix}/${name}`
        routes.push(route)
      }
    } catch { /* stat error — skip */ }
  }

  return routes
}

// CMS pages for CodeMyShop (fallback if no scan)
const CMS_PAGES = [
  { loc: '/offre-premium', priority: '0.8', changefreq: 'monthly' },
  { loc: '/innovation', priority: '0.7', changefreq: 'monthly' },
  { loc: '/souverainete-numerique', priority: '0.7', changefreq: 'monthly' },
  { loc: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { loc: '/conditions-generales-de-vente', priority: '0.3', changefreq: 'yearly' },
  { loc: '/politique-confidentialite', priority: '0.3', changefreq: 'yearly' },
]

export default defineEventHandler((event) => {
  const host = getRequestHost(event) || ''
  const isAC = !host.includes('codemyshop')
  const baseUrl = isAC ? 'https://codemyshop.com' : 'https://codemyshop.com'

  const now = new Date().toISOString().split('T')[0]

  let pages: Array<{ loc: string; priority: string; changefreq: string }>

  if (isAC) {
    // Auto-discovery: core/pages/ + clients/{clientId}/pages/
    // The monorepo is mounted at /monorepo in all Nuxt containers.
    // process.cwd() points to /app (PM2 workdir), not to the source — absolute path required.
    const coreDir = join('/monorepo/core', 'pages')
    const clientDir = join('/monorepo/clients', 'alexandrecarette', 'pages')

    // Merge the two sources (client overrides core if same route)
    const routeSet = new Set<string>()
    for (const route of [...scanPages(coreDir), ...scanPages(clientDir)]) {
      routeSet.add(route)
    }

    pages = [...routeSet].map(loc => ({
      loc,
      priority: PRIORITY_MAP[loc] ?? '0.6',
      changefreq: getChangefreq(loc, PRIORITY_MAP[loc] ?? '0.6'),
    }))
  } else {
    pages = CMS_PAGES
  }

  // Sort: priority desc, then alphabetically
  pages.sort((a, b) => parseFloat(b.priority) - parseFloat(a.priority) || a.loc.localeCompare(b.loc))

  const urls = pages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})
