

export const useHubT = () => {
  const translations = useState<Record<string, string>>('hub_translations', () => ({}))
  const loaded = useState<boolean>('hub_translations_loaded', () => false)

  async function load() {
    if (loaded.value) return
    try {
      const activeLang = useState<string>('active_lang', () => 'fr')
      const data = await $fetch<Record<string, string>>('/api/hub/translations', {
        query: { lang: activeLang.value },
      })
      translations.value = data || {}
      loaded.value = true
    } catch {
      loaded.value = true 
    }
  }

  
  function t(key: string, fallback?: string): string {
    return translations.value[key] || fallback || key
  }

  
  
  if (!loaded.value && import.meta.client) {
    load()
  }

  return { t, translations, load, loaded }
}
