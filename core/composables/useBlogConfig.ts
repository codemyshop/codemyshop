

import type { BlogConfig, BlogPillar } from '~/types/theme'

interface BlogCategoryNode {
  id: number
  key: string
  name: string
  description: string
  metaTitle?: string
  metaDescription?: string
  position: number
  subcategories?: Array<{
    id: number
    key: string
    name: string
    description: string
    metaTitle?: string
    metaDescription?: string
    position: number
  }>
}

export interface BlogSeoMeta {
  title: string
  description: string
}

const PILLAR_UI: Record<string, Pick<BlogPillar, 'icon' | 'color' | 'tagBg' | 'accent'>> = {
  strategie: {
    icon: '🎯',
    color: 'text-primary-600 dark:text-primary-400',
    tagBg: 'bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300',
    accent: 'border-primary-300 dark:border-primary-500/30',
  },
  prestashop: {
    icon: '🛒',
    color: 'text-sky-600 dark:text-sky-400',
    tagBg: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300',
    accent: 'border-sky-300 dark:border-sky-500/30',
  },
  devops: {
    icon: '⚙️',
    color: 'text-slate-600 dark:text-slate-300',
    tagBg: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300',
    accent: 'border-slate-300 dark:border-slate-500/30',
  },
  seo: {
    icon: '🔍',
    color: 'text-emerald-600 dark:text-emerald-400',
    tagBg: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    accent: 'border-emerald-300 dark:border-emerald-500/30',
  },
  'intelligence-artificielle': {
    icon: '🧠',
    color: 'text-violet-600 dark:text-violet-400',
    tagBg: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300',
    accent: 'border-violet-300 dark:border-violet-500/30',
  },
  'e-commerce': {
    icon: '🛍️',
    color: 'text-amber-600 dark:text-amber-400',
    tagBg: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    accent: 'border-amber-300 dark:border-amber-500/30',
  },
  securite: {
    icon: '🛡️',
    color: 'text-rose-600 dark:text-rose-400',
    tagBg: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
    accent: 'border-rose-300 dark:border-rose-500/30',
  },
  tech: {
    icon: '🔧',
    color: 'text-zinc-600 dark:text-zinc-400',
    tagBg: 'bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
    accent: 'border-zinc-300 dark:border-zinc-500/30',
  },
}

const DEFAULT_UI: Pick<BlogPillar, 'icon' | 'color' | 'tagBg' | 'accent'> = {
  icon: '📄',
  color: 'text-gray-600 dark:text-gray-400',
  tagBg: 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400',
  accent: 'border-gray-300',
}

const DEFAULT_PILLAR: BlogPillar = { ...DEFAULT_UI, label: '', desc: '' }

export function useBlogConfig() {
  const { resolvedClientId } = useClientDetection()
  const dbConfig = useState<Record<string, unknown> | null>('client_db_config', () => null)
  const categoriesState = useState<BlogCategoryNode[]>('blog_categories', () => [])
  const blogRootIdState = useState<number | null>('blog_root_id', () => null)

  const blogCfg = computed<BlogConfig | undefined>(() => (dbConfig.value as any)?.blog)

  
  
  
  const pillars = computed<Record<string, BlogPillar>>(() => {
    if (categoriesState.value && categoriesState.value.length) {
      const map: Record<string, BlogPillar> = {}
      for (const cat of categoriesState.value) {
        const ui = PILLAR_UI[cat.key] || DEFAULT_UI
        map[cat.key] = {
          label: cat.name,
          desc: cat.description || '',
          ...ui,
        }
      }
      return map
    }
    return blogCfg.value?.pillars ?? {}
  })

  
  const pillarKeys = computed(() => {
    if (categoriesState.value && categoriesState.value.length) {
      return categoriesState.value.map(c => c.key)
    }
    return Object.keys(blogCfg.value?.pillars ?? {})
  })

  function getPillar(category: string): BlogPillar {
    return pillars.value[category] ?? { ...DEFAULT_PILLAR, label: category }
  }

  
  const subcatLabels = computed<Record<string, string>>(() => {
    if (categoriesState.value && categoriesState.value.length) {
      const map: Record<string, string> = {}
      for (const cat of categoriesState.value) {
        for (const sub of cat.subcategories || []) {
          
          
          map[sub.key] = sub.name
        }
      }
      return map
    }
    return blogCfg.value?.subcatLabels ?? {}
  })

  function getSubcatLabel(key: string): string {
    return subcatLabels.value[key] ?? key
  }

  
  function getPillarMeta(pillarKey: string): BlogSeoMeta {
    const cat = (categoriesState.value || []).find(c => c.key === pillarKey)
    if (cat?.metaTitle || cat?.metaDescription) {
      return {
        title: cat.metaTitle || cat.name,
        description: cat.metaDescription || cat.description || '',
      }
    }
    const p = getPillar(pillarKey)
    return { title: p.label, description: p.desc }
  }

  function getSubcatMeta(pillarKey: string, subKey: string): BlogSeoMeta {
    const cat = (categoriesState.value || []).find(c => c.key === pillarKey)
    const sub = cat?.subcategories?.find(s => s.key === subKey)
    if (sub?.metaTitle || sub?.metaDescription) {
      return {
        title: sub.metaTitle || sub.name,
        description: sub.metaDescription || sub.description || '',
      }
    }
    return { title: getSubcatLabel(subKey), description: '' }
  }

  
  function getPillarId(pillarKey: string): number | null {
    const cat = (categoriesState.value || []).find(c => c.key === pillarKey)
    return cat?.id ?? null
  }

  
  const blogRootId = computed<number | null>(() => blogRootIdState.value ?? null)

  function getSubcatId(pillarKey: string, subKey: string): number | null {
    const cat = (categoriesState.value || []).find(c => c.key === pillarKey)
    const sub = cat?.subcategories?.find(s => s.key === subKey)
    return sub?.id ?? null
  }

  
  const author = computed(() => blogCfg.value?.author ?? { name: '', url: '/' })

  const publisher = computed(() => blogCfg.value?.publisher ?? {
    name: author.value.name,
    url: author.value.url,
  })

  
  const siteUrl = computed(() => {
    const d = (dbConfig.value as any)?.domain
    const hostname = d ? (Array.isArray(d) ? d[0] : d) : 'localhost'
    return `https://${hostname}`
  })

  
  const blogTitle = computed(() => blogCfg.value?.title ?? 'Blog')
  const blogDescription = computed(() => blogCfg.value?.description ?? '')
  const contactCta = computed(() => blogCfg.value?.contactCta)
  const contactEmail = computed(() => (dbConfig.value as any)?.contactEmail ?? '')

  return {
    blogCfg,
    pillars,
    pillarKeys,
    getPillar,
    getPillarMeta,
    subcatLabels,
    getSubcatLabel,
    getSubcatMeta,
    getPillarId,
    getSubcatId,
    blogRootId,
    author,
    publisher,
    siteUrl,
    blogTitle,
    blogDescription,
    contactCta,
    contactEmail,
    resolvedClientId,
  }
}
