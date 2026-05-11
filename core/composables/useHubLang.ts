

import type { HubLang, HubLangListResponse } from '~/types/hub/lang'

export const useHubLang = () => {
  const currentLangId = useState<number>('hub_lang_current', () => 1)
  const langs = useState<HubLang[]>('hub_lang_list', () => [])
  const defaultLangId = useState<number>('hub_lang_default', () => 1)
  const ready = useState<boolean>('hub_lang_ready', () => false)

  async function load(force = false) {
    if (ready.value && !force) return
    try {
      const data = await $fetch<HubLangListResponse>('/api/bo/lang/list')
      langs.value = data.langs || []
      defaultLangId.value = data.default_id || 1
      
      if (!langs.value.find((l) => l.id_lang === currentLangId.value)) {
        currentLangId.value = defaultLangId.value
      }
      ready.value = true
    } catch {
      
      langs.value = []
      ready.value = true
    }
  }

  
  function setLang(id: number) {
    const exists = langs.value.find((l) => l.id_lang === id)
    if (exists) currentLangId.value = id
  }

  
  const currentLang = computed<HubLang | undefined>(() =>
    langs.value.find((l) => l.id_lang === currentLangId.value),
  )

  
  const isDefault = computed(() => currentLangId.value === defaultLangId.value)

  
  if (!ready.value) {
    load()
  }

  return {
    currentLangId,
    langs,
    defaultLangId,
    currentLang,
    isDefault,
    ready,
    setLang,
    load,
  }
}
