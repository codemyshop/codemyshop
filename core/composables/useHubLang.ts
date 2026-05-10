/**
 *
 * Composable for current language in the multi-tenant system.
 *
 * Reads /api/bo/lang/list (tenant auto-resolved server-side via hostname),
 * exposes reactive `currentLangId`, `langs` and `setLang(id)`. Editors
 * for category/product watch `currentLangId` to re-trigger their fetch
 * with `?lang=X`.
 *
 * Pattern `useState` (SSR-safe) volontaire — incidents `useHubT` :
 * Loading client-only would show literal keys on first paint.
 * Here we load in SSR so the selector is populated at hydration.
 *
 * Usage :
 *   const { currentLangId, langs, setLang, ready } = useHubLang()
 *   await $fetch(`/api/bo/categories/${id}?lang=${currentLangId.value}`)
 */

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
      // Si la langue courante n'est pas active pour ce tenant, on retombe sur default.
      if (!langs.value.find((l) => l.id_lang === currentLangId.value)) {
        currentLangId.value = defaultLangId.value
      }
      ready.value = true
    } catch {
      // Tenant sans ps_lang accessible → on force FR défaut, pas de crash.
      langs.value = []
      ready.value = true
    }
  }

  /** Change la langue active. Passé en prop `v-model` par le selector. */
  function setLang(id: number) {
    const exists = langs.value.find((l) => l.id_lang === id)
    if (exists) currentLangId.value = id
  }

  /** Current language resolved — useful for displaying name/iso. */
  const currentLang = computed<HubLang | undefined>(() =>
    langs.value.find((l) => l.id_lang === currentLangId.value),
  )

  /** `true` if the active language is the master language (editable structure). */
  const isDefault = computed(() => currentLangId.value === defaultLangId.value)

  // Loads on mount — SSR included, to avoid hydration flash.
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
