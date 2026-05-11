

import { getModuleBySlugAsync, findModuleByPartialSlug, getAllModulesAsync } from '~/server/utils/academy-content'

let _psArticlesCache: { data: Record<string, unknown>[] | null; ts: number } = { data: null, ts: 0 }
const PS_CACHE_TTL = 300_000 

const MENTOR_BLOG_CATEGORIES: Record<string, string[]> = {
  descartes:  ['prestashop/architecture', 'prestashop/developpement', 'prestashop'],
  aristote:   ['seo', 'prestashop/performance'],
  vinci:      ['seo/intelligence-artificielle', 'strategie/intelligence-artificielle'],
  kant:       ['devops/docker', 'devops'],
  machiavel:  ['strategie/flywheel', 'strategie'],
  'de-gaulle': ['strategie/positionnement'],
  'sun-tzu':  ['strategie/positionnement', 'strategie'],
  confucius:  ['strategie/positionnement', 'strategie'],
  socrate:    ['strategie/intelligence-artificielle', 'strategie'],
  alexandre:  ['strategie', 'prestashop'],
  hegel:      ['strategie/positionnement', 'strategie'],
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Slug requis' })

  const mod = await getModuleBySlugAsync(slug)
  if (!mod) {
    
    const partial = findModuleByPartialSlug(slug)
    if (partial) {
      return sendRedirect(event, `/api/academy/${partial.slug}`, 301)
    }
    throw createError({ statusCode: 404, message: 'Module introuvable' })
  }

  
  let relatedArticles: { id: number; title: string; url: string; excerpt: string; coverImage: string }[] = []
  const mentorKey = mod.mentor
  if (mentorKey) {
    const blogCategories = MENTOR_BLOG_CATEGORIES[mentorKey] ?? []
    if (blogCategories.length > 0) {
      try {
        const config = useRuntimeConfig()
        const apiKey = config.prestashopApiKey
        const apiBase = config.public.apiBase
        if (apiKey && apiBase) {
          
          let psItems = _psArticlesCache.data
          if (!psItems || Date.now() - _psArticlesCache.ts > PS_CACHE_TTL) {
            const auth = Buffer.from(`${apiKey}:`).toString('base64')
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 3000) 
            const data = await $fetch<{ content_management_system: Record<string, unknown>[] }>(
              `${apiBase}/content_management_system`,
              {
                headers: { Authorization: `Basic ${auth}` },
                query: { output_format: 'JSON', display: 'full', limit: 50, sort: 'id_DESC' },
                signal: controller.signal,
              },
            ).catch(() => null).finally(() => clearTimeout(timeout))
            psItems = data?.content_management_system ?? null
            if (psItems) _psArticlesCache = { data: psItems, ts: Date.now() }
          }

          const items = (psItems ?? []).filter((item: any) => {
            if (item.active !== '1') return false
            const lr = getLang(item.link_rewrite)
            if (!lr.includes('--')) return false
            
            return blogCategories.some(cat => lr.startsWith(`${cat.replace('/', '--')}--`) || lr.startsWith(`${cat}--`))
          })

          relatedArticles = items.slice(0, 4).map((item: any) => {
            const lr = getLang(item.link_rewrite)
            const rawContent = getLang(item.content)
            const coverMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/)
            
            const parts = lr.split('--')
            const nuxtUrl = parts.length >= 3
              ? `/blog/${parts[0]}/${parts[1]}/${parts.slice(2).join('--')}`
              : parts.length === 2
                ? `/blog/${parts[0]}/${parts[1]}`
                : `/blog/${lr}`

            return {
              id: Number(item.id),
              title: getLang(item.meta_title),
              url: nuxtUrl,
              excerpt: getLang(item.meta_description) || stripHtml(rawContent).slice(0, 120),
              coverImage: coverMatch ? coverMatch[1] : '',
            }
          })
        }
      } catch {
        
      }
    }
  }

  
  const allData = await getAllModulesAsync()
  const mentorData = mod.mentor ? (allData.mentors?.[mod.mentor] ?? null) : null

  return { ...mod, relatedArticles, mentorData }
})
