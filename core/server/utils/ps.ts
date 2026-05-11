

export function getLang(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return (field[0] as { value: string })?.value ?? ''
  return String(field)
}

export function parseSlug(linkRewrite: string): { category: string; slug: string } {
  const sep = linkRewrite.indexOf('--')
  if (sep === -1) return { category: '', slug: linkRewrite }
  return {
    category: linkRewrite.slice(0, sep),
    slug: linkRewrite.slice(sep + 2),
  }
}

export function buildNuxtUrl(linkRewrite: string): string {
  if (!linkRewrite) return '/blog'
  return `/blog/${linkRewrite.split('--').join('/')}`
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '\u00AB')
    .replace(/&raquo;/g, '\u00BB')
    .replace(/&eacute;/g, '\u00E9')
    .replace(/&egrave;/g, '\u00E8')
    .replace(/&ecirc;/g, '\u00EA')
    .replace(/&agrave;/g, '\u00E0')
    .replace(/&ccedil;/g, '\u00E7')
    .replace(/&ocirc;/g, '\u00F4')
    .replace(/&ucirc;/g, '\u00FB')
    .replace(/&iuml;/g, '\u00EF')
    .replace(/&Eacute;/g, '\u00C9')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

export function extractCoverImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : ''
}
