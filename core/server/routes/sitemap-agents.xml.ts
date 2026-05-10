/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-agents.xml
 * Dynamic sitemap of AI agents from the `cs_agents` DB.
 */
import { listAgentsSitemap } from '~/internal/agents/server/utils/agents'

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  let baseUrl = `https://${host.split(':')[0]}`
  if (host.includes('localhost') || host.includes('127.0.0.1')) baseUrl = 'https://codemyshop.com'

  let urls = ''

  try {
    const agents = await listAgentsSitemap({ event })

    // Page pilier /agents-ia
    urls += `  <url>
    <loc>${baseUrl}/agents-ia</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`

    // Page /equipe
    urls += `  <url>
    <loc>${baseUrl}/equipe</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`

    // Fiches agents individuelles
    for (const a of agents) {
      const lastmod = a.date_upd ? new Date(a.date_upd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `  <url>
    <loc>${baseUrl}/agents-ia/${a.codename}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`
    }
  } catch (err) {
    console.error('[sitemap-agents] Error:', err)
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})
