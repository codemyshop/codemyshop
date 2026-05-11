

export function useRouteLang() {
  const route = useRoute()

  const activeLang = computed<string>(() => {
    
    const pathLang = (route.params as Record<string, unknown>)?.lang
    if (typeof pathLang === 'string' && /^[a-z]{2}$/.test(pathLang)) return pathLang

    
    const first = (route.path || '').split('/').filter(Boolean)[0]
    if (first && /^[a-z]{2}$/.test(first)) return first

    
    const q = route.query?.lang
    if (typeof q === 'string' && /^[a-z]{2}$/.test(q)) return q

    
    if (import.meta.client) {
      const m = document.cookie.match(/(?:^|;\s*)ac_lang=([a-z]{2})\b/)
      if (m) return m[1]
    }

    return 'fr'
  })

  return { activeLang }
}
