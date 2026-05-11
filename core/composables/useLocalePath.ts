

import { localizeRootSegment } from '~/utils/locale-route-roots'

export function useLocalePath() {
  const { activeLang } = useRouteLang()
  const config = useRuntimeConfig()
  const locales: string[] = ((config.public as any).i18nLocales as string[]) || ['en']
  const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join('|')})(?:/|$)`)

  function localePath(path: string | null | undefined): string {
    if (!path) return '/'
    const s = String(path).trim()
    if (!s) return '/'

    
    if (/^(https?:)?\/\//i.test(s) || /^(mailto|tel|sms):/i.test(s)) return s
    
    if (s.startsWith('#') || s.startsWith('?')) return s

    const lang = activeLang.value
    if (!lang || lang === 'fr') return s

    
    if (LOCALE_PREFIX_RE.test(s)) return s

    
    const normalized = s.startsWith('/') ? s : `/${s}`

    
    
    const firstSlash = normalized.indexOf('/', 1)
    const firstSeg = firstSlash > 0 ? normalized.slice(1, firstSlash) : normalized.slice(1)
    const rest = firstSlash > 0 ? normalized.slice(firstSlash) : ''
    const translatedRoot = localizeRootSegment(firstSeg, lang)

    return `/${lang}/${translatedRoot}${rest}`
  }

  return { localePath, activeLang }
}
