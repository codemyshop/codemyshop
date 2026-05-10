/**
 *
 * GET /sitemap.xml
 * Dynamic sitemap index — replaces the static PS sitemap.
 * References the sub-sitemaps: pages, blog, expertise.
 */

export default defineEventHandler((event) => {
  const host = getRequestHost(event) || 'codemyshop.com'
  // Switch tenant par hostname dynamique — cohérent avec les sous-sitemaps.
  // Localhost en dev → fallback codemyshop.com pour avoir des URLs valides.
  const cleanHost = host.split(':')[0]
  const baseUrl = (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1'))
    ? 'https://codemyshop.com'
    : `https://${cleanHost}`

  const now = new Date().toISOString()

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-expertise.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-academy.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-dictionnaire.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-agents.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-drill.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-silo.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`
})
