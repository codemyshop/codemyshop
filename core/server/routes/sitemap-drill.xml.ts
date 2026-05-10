/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-drill.xml
 * Dynamic sitemap of the assessment platform: main pages + scored exercises.
 */
import { listScoredResponsesForSitemap } from '~/internal/drill/server/utils/drill'

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  let baseUrl = `https://${host.split(':')[0]}`
  if (host.includes('localhost') || host.includes('127.0.0.1')) baseUrl = 'https://codemyshop.com'

  let urls = ''

  try {
    const responses = await listScoredResponsesForSitemap({ event })

    // Pages statiques du Drill
    urls += `  <url>
    <loc>${baseUrl}/drill</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`

    urls += `  <url>
    <loc>${baseUrl}/drill/historique</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`

    urls += `  <url>
    <loc>${baseUrl}/drill/incidents</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`

    // Pages épreuves individuelles
    for (const r of responses) {
      const lastmod = r.date_upd ? new Date(r.date_upd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `  <url>
    <loc>${baseUrl}/drill/epreuve/${r.id_response}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>\n`
    }
  } catch (err) {
    console.error('[sitemap-drill] Error:', err)
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})
