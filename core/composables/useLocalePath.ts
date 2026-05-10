/**
 *
 * useLocalePath — prefixes an internal URL with /:lang/ if the active language
 * is not the default (fr). Used by TheHeader, TheFooter, megamenu,
 * silo children, product cards, etc. to keep navigation in the
 * active language without reloading the locale.
 *
 * Rules:
 * - fr (default) → path unchanged: '/grossiste/olive/'
 * - en/de/… → prefix added: '/en/grossiste/olive/'
 * - Absolute URLs (http(s)://) or external → unchanged
 * - Anchors (#...) or relative (?query...) → unchanged
 * - path already prefixed (e.g.: '/en/...') → unchanged (idempotent)
 *
 * Pattern aligned with core/modules/i18n-routes.ts which duplicates each page
 * with a /:lang(en|de|es|it|nl|pt) prefix at build — the default language
 * remains without prefix.
 */

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

    // URL absolue, externe, mailto, tel — on laisse tel quel
    if (/^(https?:)?\/\//i.test(s) || /^(mailto|tel|sms):/i.test(s)) return s
    // Ancre pure OU query-only → inchangé
    if (s.startsWith('#') || s.startsWith('?')) return s

    const lang = activeLang.value
    if (!lang || lang === 'fr') return s

    // Déjà préfixé par une locale connue → idempotent
    if (LOCALE_PREFIX_RE.test(s)) return s

    // Normaliser : garantir leading '/'
    const normalized = s.startsWith('/') ? s : `/${s}`

    // Traduire le premier segment (root) si c'est un segment canonique FR
    // (grossiste → wholesaler, marque → brand, etc.).
    const firstSlash = normalized.indexOf('/', 1)
    const firstSeg = firstSlash > 0 ? normalized.slice(1, firstSlash) : normalized.slice(1)
    const rest = firstSlash > 0 ? normalized.slice(firstSlash) : ''
    const translatedRoot = localizeRootSegment(firstSeg, lang)

    return `/${lang}/${translatedRoot}${rest}`
  }

  return { localePath, activeLang }
}
