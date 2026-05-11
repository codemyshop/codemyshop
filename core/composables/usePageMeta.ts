

export async function usePageMeta(route: string) {
  const siteUrl = (useRuntimeConfig().public.psFrontUrl as string || '').replace(/\/+$/, '')

  const { data } = await useFetch('/api/page-meta', { query: { route } })
  const pageMeta = computed(() => data.value?.meta ?? null)

  useHead({
    title: computed(() => pageMeta.value?.title ?? ''),
    meta: [
      { name: 'description', content: computed(() => pageMeta.value?.description ?? '') },
      { name: 'keywords', content: computed(() => pageMeta.value?.keywords ?? '') },
      { property: 'og:title', content: computed(() => pageMeta.value?.ogTitle ?? '') },
      { property: 'og:description', content: computed(() => pageMeta.value?.ogDescription ?? '') },
      { property: 'og:url', content: `${siteUrl}${route}` },
      { property: 'og:type', content: computed(() => pageMeta.value?.ogType ?? 'website') },
      { property: 'og:image', content: computed(() => pageMeta.value?.ogImage ?? '') },
      { property: 'og:locale', content: 'fr_FR' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: computed(() => pageMeta.value?.ogTitle ?? '') },
      { name: 'twitter:description', content: computed(() => pageMeta.value?.ogDescription ?? '') },
    ],
    link: [
      { rel: 'canonical', href: `${siteUrl}${route}` },
    ],
  })

  return { pageMeta }
}
