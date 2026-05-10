/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-expertise.xml
 * Dynamic sitemap of PrestaShop expertise guides — direct Drizzle DB access.
 */
import { listExpertise } from '~/server/utils/expertise-db'

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  let baseUrl = 'https://codemyshop.com'
  if (host.includes('codemyshop')) baseUrl = 'https://codemyshop.com'

  const articles = await listExpertise({ limit: 500 })
  let urls = ''

  for (const a of articles) {
    if (!a.slug || !a.category) continue
    const loc = `/expertise/prestashop/${a.category}/${a.slug}`
    const lastmod = a.publishDate
      ? new Date(a.publishDate).toISOString().split('T')[0]
      : ''
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    urls += `  <url>
    <loc>${baseUrl}${loc}</loc>${lastmodTag}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})
