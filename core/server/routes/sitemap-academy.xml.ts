/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-academy.xml
 * Dynamic sitemap of modules and lessons from the DB via `ac_academy` facade.
 */

import {
  listLessonsForSitemap,
  listModulesForSitemap,
} from '~/internal/academy/server/utils/academy'

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  let baseUrl = `https://${host.split(':')[0]}`
  if (host.includes('localhost') || host.includes('127.0.0.1')) baseUrl = 'https://codemyshop.com'

  let urls = ''

  try {
    const config = useRuntimeConfig()
    const clientId = (config.clientId as string) || 'ac-hub'

    const [modules, lessons] = await Promise.all([
      listModulesForSitemap(clientId, { event }),
      listLessonsForSitemap(clientId, { event }),
    ])

    urls += `  <url>
    <loc>${baseUrl}/academy</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n`

    for (const m of modules) {
      const lastmod = m.date_upd ? new Date(m.date_upd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `  <url>
    <loc>${baseUrl}/academy/${m.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`
    }

    for (const l of lessons) {
      const lastmod = l.date_upd ? new Date(l.date_upd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `  <url>
    <loc>${baseUrl}/academy/${l.module_slug}/${l.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`
    }

    urls += `  <url>
    <loc>${baseUrl}/academy/mon-parcours</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>\n`
  } catch (err) {
    console.error('[sitemap-academy] Error:', err)
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})
