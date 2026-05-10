/**
 *
 * useI18nField — helper de lecture compatible DB-first (pattern _lang).
 *
 * **Since the DB-first migration on 2026-04-18**: Nuxt APIs resolve
 * translatable content server-side via JOIN on `_lang` tables and
 * return **plain strings**. The `{fr,en,de}` objects are no longer a
 * normal source — only a temporary fallback if a legacy endpoint
 * still returns a dict. `t()` handles both cases gracefully.
 *
 * Multi-language editing: use the `/hub/translations` workspace (pattern
 * _lang), plus `I18nField.client.vue` in the builder (editor tabs FR/EN/DE
 * for the few components that still use it).
 */

export type I18nString = string | Record<string, string> | null | undefined

export function useI18nField() {
  const route = useRoute()

  /**
   * Active language (for legacy dict fallback only — the server
   * should already have resolved via resolveIdLang).
   */
  const activeLang = computed<string>(() => {
    const q = route.query?.lang
    if (typeof q === 'string' && /^[a-z]{2}$/.test(q)) return q

    const pathLang = (route.params as Record<string, unknown>)?.lang
    if (typeof pathLang === 'string' && /^[a-z]{2}$/.test(pathLang)) return pathLang

    if (import.meta.client) {
      const m = document.cookie.match(/(?:^|;\s*)ac_lang=([a-z]{2})\b/)
      if (m) return m[1]
    }

    return 'fr'
  })

  /**
   * Always returns a string. Normal path: the API already resolved → we
   * receive a string, we return it. Fallback path (legacy dict): we
   * extract the active language key, then fr, then the first non-empty.
   */
  function t(field: I18nString, lang?: string, defaultLang: string = 'fr'): string {
    if (field == null) return ''
    if (typeof field === 'string') return field
    if (typeof field !== 'object') return String(field)

    const target = lang ?? activeLang.value
    if (typeof field[target] === 'string' && field[target]) return field[target]
    if (typeof field[defaultLang] === 'string' && field[defaultLang]) return field[defaultLang]
    for (const v of Object.values(field)) {
      if (typeof v === 'string' && v) return v
    }
    return ''
  }

  /**
   * Write helper for I18nField.client.vue (builder multi-language editor).
   * Builds a dict {lang: value} preserving other languages if already a dict.
   */
  function setT(current: I18nString, lang: string, value: string): Record<string, string> {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return { ...(current as Record<string, string>), [lang]: value }
    }
    if (typeof current === 'string') {
      return { [lang]: value }
    }
    return { [lang]: value }
  }

  return { t, setT, activeLang }
}
