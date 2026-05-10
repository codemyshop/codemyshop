/**
 *
 * Composable i18n — reads translations from ps_translation (domain Hub*).
 * Usage : const { t } = useHubT()
 *         t('nav.orders')  → "Commandes"
 *         t('common.search') → "Rechercher"
 *
 * Fallback: if the key doesn't exist in DB, returns the key itself
 * (allows progressive migration without breaking display).
 */

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
      loaded.value = true // ne pas re-tenter en boucle
    }
  }

  /** Traduit une clé. Fallback = clé elle-même. */
  function t(key: string, fallback?: string): string {
    return translations.value[key] || fallback || key
  }

  // SSR: the hub-translations.server.ts plugin pre-loads translations.
  // Client: if not yet loaded (SPA navigation without SSR), load on demand.
  if (!loaded.value && import.meta.client) {
    load()
  }

  return { t, translations, load, loaded }
}
