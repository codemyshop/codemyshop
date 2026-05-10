/**
 *
 * Composable to load the megamenu from /api/megamenu (DB-first).
 * Transforms the API response to TheHeader.vue-compatible format
 * (megaMenu[], children[], isMegaMenu, bgColor, etc.)
 */

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

/** Transforme un item API en format TheHeader.vue */
function apiItemToHeaderFormat(root: ApiMegamenuItem): Record<string, any> {
  const item: Record<string, any> = {
    label: root.label,
    href: root.href,
  }

  // Top-level badge (bubble above the label)
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
    // The groupTitle can be: plain string, i18n object {fr,en,de}, or null.
    // We derive a stable canonical key (string) to group children
    // that share the same group title, even in i18n.
    const groupKeyOf = (gt: any): string => {
      if (!gt) return ''
      if (typeof gt === 'string') return gt
      if (typeof gt === 'object') return gt.fr || gt.en || gt.de || ''
      return String(gt)
    }
    const groups = new Map<string, ApiMegamenuItem[]>()
    const groupOrder: string[] = []
    // Preserves the original groupTitle (i18n object or string) by canonical key,
    // to re-expose it as-is when rendering (i18nt will resolve it).
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

    // Normalizes an i18n-eligible field: pass the object as-is, wrap strings
     // in { fr: ... } so that i18nt() can resolve in all cases.
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
    // MegaMenu format (1 column without title) for stacked layout compatibility
    item.isMegaMenu = false

    // Liens explicites (children megamenu)
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

    // Auto-generated links from PS categories (show_ps_children on the root)
    // Sub-categories (grandchildren) only if the dropdown points to a deep level
    // (ex: /marque/meyva = 2 segments → oui, /marque = 1 segment → non)
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

  // Local state editable by the builder (live preview)
  const builderOverride = useState<Record<string, any>[] | null>('megamenu_builder_override', () => null)

  /** Items for TheHeader: builder override > API DB > empty */
  const menuItems = computed(() => {
    if (builderOverride.value?.length) return builderOverride.value
    if (!data.value?.items?.length) return []
    return data.value.items.map(apiItemToHeaderFormat)
  })

  /** Loads the DB menu into the builder state (for live editing) */
  function loadIntoBuilder() {
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    } else {
      builderOverride.value = []
    }
  }

  /** Updates the builder state (immediate live preview in TheHeader) */
  function setBuilderItems(items: Record<string, any>[]) {
    builderOverride.value = [...items]
  }

  /** Syncs the builder menu to the DB via PUT /api/megamenu/sync */
  async function syncToDb() {
    const items = builderOverride.value
    if (!items) return
    await $fetch('/api/megamenu/sync', {
      method: 'PUT',
      body: { items },
    })
    // Refreshes the useFetch cache so the non-builder frontend stays up-to-date
    await refreshNuxtData('megamenu')
    // Reloads the builder state from the fresh API: newly fetched PS psChildren
    // fetched (following a showPsChildren toggle) must populate builderOverride,
    // otherwise the live view (driven by builderOverride) won't display the sub-categories.
    if (data.value?.items?.length) {
      builderOverride.value = data.value.items.map(apiItemToHeaderFormat)
    }
  }

  /** Resets the builder override (when exiting edit mode) */
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
