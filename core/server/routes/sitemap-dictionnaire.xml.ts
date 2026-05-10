/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-dictionnaire.xml
 * Dynamic sitemap of technical dictionary terms from the DB.
 * Read via Drizzle facade `core/modules/dictionary`.
 */
import { listDictionarySitemapEntries } from '~/internal/dictionary/server/utils/dictionary'

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  let baseUrl = `https://${host.split(':')[0]}`
  if (host.includes('localhost') || host.includes('127.0.0.1')) baseUrl = 'https://codemyshop.com'

  let urls = ''

  try {
    const config = useRuntimeConfig()
    const clientId = (config as any).clientId || 'ac'
    const terms = await listDictionarySitemapEntries(clientId, { event })

    // Page pilier /dictionnaire
    urls += `  <url>
    <loc>${baseUrl}/dictionnaire</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n`

    // Pages termes
    for (const t of terms) {
      const lastmod = t.dateUpd ? new Date(t.dateUpd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `  <url>
    <loc>${baseUrl}/dictionnaire/${t.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`
    }
  } catch (err) {
    console.error('[sitemap-dictionnaire] Error:', err)
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})
