

export default defineNuxtPlugin(async () => {
  const translations = useState<Record<string, string>>('hub_translations', () => ({}))
  const loaded = useState<boolean>('hub_translations_loaded', () => false)

  if (loaded.value) return

  
  const runtimeConfig = useRuntimeConfig()
  const clientId = (runtimeConfig.clientId as string) || (runtimeConfig.public?.clientId as string) || 'ac-hub'

  
  
  
  
  
  const route = useRoute()
  const routeLang = route.params.lang as string | undefined
  const reqUrl = useRequestURL()
  const queryLang = reqUrl.searchParams.get('lang')
  const rawLang = routeLang || queryLang
  const lang = (rawLang && /^[a-z]{2}$/.test(rawLang)) ? rawLang : 'fr'

  
  useState<string>('active_lang', () => lang)

  try {
    const data = await $fetch<Record<string, string>>('/api/hub/translations', {
      query: { lang, clientId },
    })
    translations.value = data || {}
    loaded.value = true
  } catch (err: any) {
    console.error('[hub-translations.server] SSR preload failed:', err?.message || err)
    loaded.value = true
  }
})
