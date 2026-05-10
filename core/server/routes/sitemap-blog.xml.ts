/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /sitemap-blog.xml
 * Dynamic blog article sitemap — reads from the CMS API.
 * Generates the correct Nuxt URLs (/blog/category/subcategory/slug).
 */

export default defineEventHandler(async (event) => {
  const host = getRequestHost(event) || ''
  // Resolve base URL from hostname — no hardcoded domain
  let baseUrl = `https://${host.split(':')[0]}`
  if (host.includes('localhost') || host.includes('127.0.0.1')) baseUrl = 'https://codemyshop.com'

  const config = useRuntimeConfig()
  const apiKey = config.prestashopApiKey as string
  const psBaseUrl = config.psBaseUrl as string || 'http://localhost:8080'
  const psHost = config.psHost as string || 'localhost'
  const psPort = psBaseUrl.match(/:(\d+)/)?.[1] || '8080'
  const psApiUrl = psHost.includes(':') ? `http://${psHost}` : `http://${psHost}:${psPort}`
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  let urls = ''

  try {
    // Articles CMS
    const data = await $fetch<{ content_management_system: Array<{ id: number | string; active: string; link_rewrite: unknown; date_add?: string }> }>(
      `${psApiUrl}/api/content_management_system`,
      {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        query: { output_format: 'JSON', display: 'full', sort: 'id_DESC' },
      },
    ).catch(() => null)

    const items = data?.content_management_system?.filter(i => {
      if (i.active !== '1') return false
      const lr = getLang(i.link_rewrite)
      return lr.includes('--')
    }) ?? []

    // Dates depuis ac_cms_extra
    let dateMap: Record<string, string> = {}
    try {
      const extras = await $fetch<{ ac_cms_extras?: Array<{ id_cms: string; date_published: string; date_updated: string }> }>(
        `${psApiUrl}/api/ac_cms_extras`,
        {
          headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
          query: { output_format: 'JSON', display: 'full' },
        },
      ).catch(() => null)

      if (extras?.ac_cms_extras) {
        for (const e of extras.ac_cms_extras) {
          dateMap[String(e.id_cms)] = e.date_updated || e.date_published || ''
        }
      }
    } catch { /* pas de dates */ }

    // Blog categories (for the sitemap)
    const categories = new Set<string>()

    for (const item of items) {
      const lr = getLang(item.link_rewrite)
      const parts = lr.split('--')
      if (parts.length < 3) continue

      const category = parts[0]
      const subcategory = parts[1]
      const slug = parts.slice(2).join('--')
      const nuxtUrl = `/blog/${category}/${subcategory}/${slug}`
      const lastmod = dateMap[String(item.id)] || new Date().toISOString().split('T')[0]

      categories.add(category)
      categories.add(`${category}/${subcategory}`)

      urls += `  <url>
    <loc>${baseUrl}${nuxtUrl}</loc>
    <lastmod>${lastmod.split(' ')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`
    }

    // Blog category and subcategory pages
    for (const cat of categories) {
      urls += `  <url>
    <loc>${baseUrl}/blog/${cat}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`
    }

  } catch (err) {
    console.error('[sitemap-blog] Error:', err)
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`
})

function getLang(val: unknown): string {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val[0]?.value ?? ''
  if (val && typeof val === 'object') return (val as any).value ?? Object.values(val)[0] ?? ''
  return ''
}
