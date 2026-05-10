/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * SEO plugin: automatically injects `<link rel="canonical">` on every page.
 *
 * The canonical domain is read from `runtimeConfig.public.psFrontUrl`
 * (configured per tenant in their `.env` / `nuxt.config.ts`).
 *
 * Hub pages (auth, `ssr:false`) → no canonical (`noindex`).
 */
export default defineNuxtPlugin(() => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const siteUrl = ((config.public.psFrontUrl as string) || '').replace(/\/+$/, '')
  const brandName = (config.public.brandName as string) || 'Boutique'

  // Routes hub (noindex, pas de canonical)
  const NO_CANONICAL_PREFIXES = ['/hub', '/mon-compte', '/onboarding', '/suspended']

  useHead(computed(() => {
    const path = route.path

    if (NO_CANONICAL_PREFIXES.some(p => path.startsWith(p))) {
      return {}
    }

    if (!siteUrl) return {}

    const canonical = `${siteUrl}${path}`

    return {
      link: [{ rel: 'canonical', href: canonical }],
      meta: [
        { property: 'og:url', content: canonical },
        { property: 'og:site_name', content: brandName },
        { property: 'og:type', content: 'website' },
      ],
    }
  }))
})
