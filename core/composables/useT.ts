/**
 *
 * Composable i18n storefront — reads OSS UI strings from `ps_translation`
 * (rows where `domain='oss'`, seeded from `core/i18n/locales/*.yaml`).
 *
 * Usage:
 *   const { t } = useT()
 * t('cart.loyalty.title')                                  → "Loyalty program"
 *   t('cart.loyalty.points_balance', { points: 42 })         → "42 points disponibles"
 *
 * Missing keys: returns the key itself + console.warn in dev. In prod,
 * returns the key without warning (visible to user but doesn't break UI).
 */

export const useT = () => {
  const translations = useState<Record<string, string>>('oss_translations', () => ({}))
  const loaded = useState<boolean>('oss_translations_loaded', () => false)

  async function load() {
    if (loaded.value) return
    try {
      const activeLang = useState<string>('active_lang', () => 'fr')
      const data = await $fetch<Record<string, string>>('/api/translations', {
        query: { lang: activeLang.value },
      })
      translations.value = data || {}
      loaded.value = true
    } catch {
      loaded.value = true
    }
  }

  /** Translate a key, with optional `{name}` placeholder interpolation. */
  function t(key: string, params?: Record<string, string | number>): string {
    const raw = translations.value[key]
    if (!raw) {
      if (import.meta.dev) console.warn(`[useT] missing key: ${key}`)
      return key
    }
    if (!params) return raw
    return raw.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] !== undefined ? String(params[name]) : m,
    )
  }

  if (!loaded.value && import.meta.client) {
    load()
  }

  return { t, translations, load, loaded }
}
