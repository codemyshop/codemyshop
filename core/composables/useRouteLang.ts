/**
 *
 * useRouteLang — detects the active language (iso_code) from the current route.
 *
 * Priority order:
 * 1. /:lang/ in the path (multi-language URL pattern, e.g., /en/, /de/)
 *   2. ?lang=xx en query (override builder)
 *   3. cookie ac_lang (client only)
 * 4. 'fr' by default
 *
 * Used by all composables that load i18n content via API
 * (useHeaderDb, useFooterDb, useMegamenu, useHomepageDb…) to inject
 * `?lang=xx` in useFetch and trigger the correct JOIN _lang on the server side.
 */

export function useRouteLang() {
  const route = useRoute()

  const activeLang = computed<string>(() => {
    // 1. Path /:lang/...
    const pathLang = (route.params as Record<string, unknown>)?.lang
    if (typeof pathLang === 'string' && /^[a-z]{2}$/.test(pathLang)) return pathLang

    // 1bis. Si lang n'est pas un param (ex: routes sans le :lang), parser le path
    const first = (route.path || '').split('/').filter(Boolean)[0]
    if (first && /^[a-z]{2}$/.test(first)) return first

    // 2. Query ?lang=xx
    const q = route.query?.lang
    if (typeof q === 'string' && /^[a-z]{2}$/.test(q)) return q

    // 3. Cookie ac_lang (client)
    if (import.meta.client) {
      const m = document.cookie.match(/(?:^|;\s*)ac_lang=([a-z]{2})\b/)
      if (m) return m[1]
    }

    return 'fr'
  })

  return { activeLang }
}
