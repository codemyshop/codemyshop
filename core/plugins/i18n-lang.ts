/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Universal plugin (SSR + client) — syncs the active language.
 *
 * Reads route.params.lang (injected by the i18n-routes module) and:
 * - populates useState('active_lang') for composables/API
 * - updates <html lang="xx"> via useHead()
 *
 * Works on SSR side (initial render) AND client side (SPA navigation).
 */
export default defineNuxtPlugin(() => {
  const route = useRoute()
  const activeLang = useState<string>('active_lang', () => {
    return (route.params.lang as string) || 'fr'
  })

  // Réagir aux changements de route côté client (navigation SPA)
  watch(
    () => route.params.lang,
    (lang) => {
      activeLang.value = (lang as string) || 'fr'
    },
  )

  // <html lang="xx"> dynamique
  useHead({
    htmlAttrs: { lang: activeLang },
  })
})
