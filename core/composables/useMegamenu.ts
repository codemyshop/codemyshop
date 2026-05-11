

interface ApiPsChild {
  id: number
  name: string
  slug: string
  href: string
}

interface ApiMegamenuItem {
  id: number
  type: 'link' | 'megamenu' | 'dropdown'
  label: Record<string, string>
  href: string | null
  icon: string | null
  description: string | null
  badge: string | null
  groupTitle: string | null
  style: Record<string, string> | null
  gridColumns: number | null
  cssClass: string | null
  psCategoryId: number | null
  showPsChildren: boolean
  position: number
  children: ApiMegamenuItem[]
  psChildren: ApiPsChild[]
}

function apiItemToHeaderFormat(root: ApiMegamenuItem): Record<string, any> {
  const item: Record<string, any> = {
    label: root.label,
    href: root.href,
  }

  
  if (root.badge) item.badge = root.badge
  if (root.style?.badgeBg) item.badgeBg = root.style.badgeBg
  if (root.style?.badgeColor) item.badgeColor = root.style.badgeColor

  if (root.style) {
    item.bgColor = root.style.backgroundColor
    item.textColor = root.style.color
    if ((root.style as any).highlight) item.highlight = true
    item.style = root.style
  }

  if (root.cssClass?.includes('ml-auto')) {
    item.rightAlign = true
    item.align = 'right'
  }

  if (root.type === 'megamenu' && root.children.length) {
    item.isMegaMenu = true
    
    
    
    const groupKeyOf = (gt: any): string => {
      if (!gt) return ''
      if (typeof gt === 'string') return gt
      if (typeof gt === 'object') return gt.fr || gt.en || gt.de || ''
      return String(gt)
    }
    const groups = new Map<string, ApiMegamenuItem[]>()
    const groupOrder: string[] = []
    
    
    const groupTitleByKey = new Map<string, any>()

    for (const child of root.children) {
      const key = groupKeyOf(child.groupTitle)
      if (!groups.has(key)) {
        groups.set(key, [])
        groupOrder.push(key)
        groupTitleByKey.set(key, child.groupTitle)
      }
      groups.get(key)!.push(child)
    }

    
     
    const normI18n = (v: any): any => {
      if (v === null || v === undefined || v === '') return undefined
      if (typeof v === 'object') return v
      return { fr: v }
    }

    item.megaMenu = groupOrder.map((groupKey) => {
      const items = groups.get(groupKey)!
      const originalTitle = groupTitleByKey.get(groupKey)
      return {
        title: normI18n(originalTitle),
        icon: items[0]?.icon || undefined,
        links: items.map((sub) => ({
          label: sub.label,
          href: sub.href,
          description: normI18n(sub.description),
          badge: normI18n(sub.badge),
          psCategoryId: sub.psCategoryId || undefined,
          psChildren: sub.psChildren?.length ? sub.psChildren.map(pc => ({
            label: { fr: pc.name },
            href: pc.href,
          })) : undefined,
          showPsChildren: sub.showPsChildren || false,
        })),
      }
    })
  } else if (root.type === 'dropdown' && (root.children.length || root.psChildren?.length)) {
    
    item.isMegaMenu = false

    
    const explicitLinks = root.children.map((sub) => ({
      label: sub.label,
      href: sub.href,
      psChildren: sub.psChildren?.length ? sub.psChildren.map(pc => ({
        label: { fr: pc.name },
        href: pc.href,
      })) : undefined,
      showPsChildren: sub.showPsChildren || false,
      psCategoryId: sub.psCategoryId || undefined,
    }))

    
    
    
    const hrefDepth = (root.href || '').replace(/^\/|\/$/g, '').split('/').filter(Boolean).length
    const showGrandchildren = hrefDepth >= 2
    const autoLinks = (root.psChildren || []).map(pc => ({
      label: { fr: pc.name },
      href: pc.href,
      psChildren: showGrandchildren && pc.psChildren?.length ? pc.psChildren.map((gc: any) => ({
        label: { fr: gc.name },
        href: gc.href,
      })) : undefined,
    }))

    const allLinks = [...explicitLinks, ...autoLinks]
    item.megaMenu = [{ links: allLinks }]
    item.children = allLinks
  }

  return item
}

export function useMegamenu() {
  const { activeLang } = useRouteLang()
  const { data, status } = useFetch<{ items: ApiMegamenuItem[] }>('/api/megamenu', {
    key: 'megamenu',
    query: { lang: activeLang },
    watch: [activeLang],
    default: () => ({ items: [] }),
  })

  
  const builderOverride = useState<Record<string, any>[] | null>('megamenu_builder_override', () => null)

  
  const menuItems = computed(() => {
    if (builderOverride.value?.length) return builderOverride.value
    if (!data.value?.items?.length) return []
    return data.value.items.map(apiItemToHeaderFormat)
  })

  
  function loadIntoBuilder() {
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    } else {
      builderOverride.value = []
    }
  }

  
  function setBuilderItems(items: Record<string, any>[]) {
    builderOverride.value = [...items]
  }

  
  async function syncToDb() {
    const items = builderOverride.value
    if (!items) return
    await $fetch('/api/megamenu/sync', {
      method: 'PUT',
      body: { items },
    })
    
    await refreshNuxtData('megamenu')
    
    
    
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    }
  }

  
  function clearBuilderOverride() {
    builderOverride.value = null
  }

  return {
    menuItems,
    status,
    builderOverride,
    loadIntoBuilder,
    setBuilderItems,
    syncToDb,
    clearBuilderOverride,
  }
}
