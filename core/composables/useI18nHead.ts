

import { localizeRootSegment } from '~/utils/locale-route-roots'

export function useI18nHead() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const base = ((config.public as any).psFrontUrl as string || '').replace(/\/$/, '')
  const locales: string[] = ((config.public as any).i18nLocales as string[]) || ['en']
  const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join('|')})(?:/|$)`)

  
  const canonicalPath = computed<string>(() => {
    const p = route.path || '/'
    const m = p.match(LOCALE_PREFIX_RE)
    if (!m) return p
    const withoutLang = '/' + p.slice(m[0].length)
    
    
    
    
    return withoutLang
  })

  
  const alternates = computed(() => {
    const cPath = canonicalPath.value
    const links: Array<{ rel: string; hreflang: string; href: string }> = []

    
    links.push({ rel: 'alternate', hreflang: 'fr', href: `${base}${cPath}` })

    
    for (const iso of locales) {
      const firstSlash = cPath.indexOf('/', 1)
      const firstSeg = firstSlash > 0 ? cPath.slice(1, firstSlash) : cPath.slice(1)
      const rest = firstSlash > 0 ? cPath.slice(firstSlash) : ''
      const translatedRoot = localizeRootSegment(firstSeg, iso)
      const localizedPath = firstSeg
        ? `/${iso}/${translatedRoot}${rest}`
        : `/${iso}`
      links.push({ rel: 'alternate', hreflang: iso, href: `${base}${localizedPath}` })
    }

    
    links.push({ rel: 'alternate', hreflang: 'x-default', href: `${base}${cPath}` })

    return links
  })

  useHead({
    link: () => alternates.value,
  })

  return { canonicalPath, alternates }
}
