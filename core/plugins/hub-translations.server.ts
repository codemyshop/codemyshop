/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * SSR-only plugin: pre-loads Hub translations from /api/hub/translations
 * BEFORE rendering components. Solves the problem of literal keys
 * (silo.xxx, nav.xxx) in SSR HTML (poor SEO + hydration flash).
 *
 * The internal Nitro $fetch does not propagate headers from the original request
 * (Nginx reverse proxy). We resolve the deployment here via useRequestURL() and we
 * pass the clientId explicitly as a query param.
 */
export default defineNuxtPlugin(async () => {
  const translations = useState<Record<string, string>>('hub_translations', () => ({}))
  const loaded = useState<boolean>('hub_translations_loaded', () => false)

  if (loaded.value) return

  // Résolution clientId depuis le runtimeConfig (chaque VPS définit son clientId)
  const runtimeConfig = useRuntimeConfig()
  const clientId = (runtimeConfig.clientId as string) || (runtimeConfig.public?.clientId as string) || 'ac-hub'

  // Résolution langue — priorité :
  //   1. route.params.lang (module i18n-routes → /:lang/grossiste/...)
  //   2. event.context._langPrefix (middleware 00-lang-prefix)
  //   3. URL query ?lang=xx (fallback direct)
  //   4. 'fr' (défaut)
  const route = useRoute()
  const routeLang = route.params.lang as string | undefined
  const reqUrl = useRequestURL()
  const queryLang = reqUrl.searchParams.get('lang')
  const rawLang = routeLang || queryLang
  const lang = (rawLang && /^[a-z]{2}$/.test(rawLang)) ? rawLang : 'fr'

  // Stocker la langue active pour le client-side (hydratation)
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
