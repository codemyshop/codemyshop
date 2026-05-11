

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const siteUrl = ((config.public.psFrontUrl as string) || '').replace(/\/+$/, '')
  const brandName = (config.public.brandName as string) || 'Boutique'

  
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
