/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/crosslinks?type=blog|expertise&slug=xxx
 * Returns cross-links to other sections (Academy, Blog, Expertise).
 * Source of truth: DB (cs_crosslinks + cs_academy_module).
 */

export default defineEventHandler(async (event) => {
  const { getAllModulesAsync } = await import('~/server/utils/academy-content')
  const query = getQuery(event)

  const contentType = (query.type as string) || ''
  const slug = (query.slug as string) || ''
  const category = (query.category as string) || ''

  if (!contentType || !slug) {
    return { academy: [], blog: [], expertise: [] }
  }

  const result: { academy: any[]; blog: any[]; expertise: any[] } = {
    academy: [],
    blog: [],
    expertise: [],
  }

  // Academy depuis DB (cache 60s)
  const academy = await getAllModulesAsync()

  // Crosslinks depuis DB (façade ac_hub)
  let crosslinks: any[] = []
  try {
    const { listAllCrosslinks } = await import('~/internal/hub/server/utils/hub')
    crosslinks = await listAllCrosslinks()
  } catch (err) {
    console.error('[crosslinks] DB error:', err)
  }

  if (contentType === 'blog') {
    // Blog → Academy : modules dont relatedArticles contient ce slug
    for (const mod of academy.modules || []) {
      const related = (mod as any).relatedArticles || []
      const matches = related.some((entry: any) => {
        const url = typeof entry === 'string' ? entry : entry?.url || ''
        return url.includes(slug)
      })
      if (matches) {
        result.academy.push({
          title: mod.title,
          url: `/academy/${mod.slug}`,
          icon: mod.icon,
          type: 'module',
        })
      }
    }

    // Blog → Blog (même pilier/sous-cat) depuis DB
    const entry = crosslinks.find(c => c.url?.includes(slug))
    if (entry) {
      const sameSubcat = typeof entry.same_subcat === 'string' ? JSON.parse(entry.same_subcat) : entry.same_subcat || []
      const samePillar = typeof entry.same_pillar === 'string' ? JSON.parse(entry.same_pillar) : entry.same_pillar || []
      for (const link of [...sameSubcat, ...samePillar].slice(0, 3)) {
        result.blog.push({
          title: link.title,
          url: link.url,
          type: 'blog',
        })
      }
    }
  }

  if (contentType === 'expertise') {
    // Expertise → Academy
    for (const mod of academy.modules || []) {
      const related = (mod as any).relatedExpertise || []
      const matches = related.some((entry: any) => {
        const url = typeof entry === 'string' ? entry : entry?.url || ''
        return url.includes(slug)
      })
      if (matches) {
        result.academy.push({
          title: mod.title,
          url: `/academy/${mod.slug}`,
          icon: mod.icon,
          type: 'module',
        })
      }
    }

    // Expertise → Blog par catégorie depuis DB
    const expToBlogMap: Record<string, string[]> = {
      'seo': ['seo'],
      'securite': ['securite'],
      'performance': ['prestashop', 'devops'],
      'developpement': ['prestashop'],
      'configuration': ['prestashop'],
      'api': ['prestashop'],
      'migration': ['prestashop'],
      'design': ['prestashop'],
    }
    const blogPillars = expToBlogMap[category] || ['prestashop']

    const candidates: any[] = []
    for (const entry of crosslinks) {
      if (!blogPillars.includes(entry.pilier)) continue
      const slugWords = slug.split('-')
      const entrySlug = entry.link_rewrite.split('--').pop() || ''
      const entryWords = entrySlug.split('-')
      const common = slugWords.filter((w: string) => entryWords.includes(w) && w.length > 3)
      if (common.length > 0) {
        candidates.push({
          title: entry.title,
          url: entry.url,
          score: common.length,
          type: 'blog',
        })
      }
    }
    result.blog = candidates.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  return result
})
