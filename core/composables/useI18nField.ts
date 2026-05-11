

export type I18nString = string | Record<string, string> | null | undefined

export function useI18nField() {
  const route = useRoute()

  

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
