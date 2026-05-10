/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * usePageMeta — loads SEO meta from cs_page_meta (DB-first, no fallback).
 *
 * Usage :
 *   const { pageMeta } = await usePageMeta('/synedre/constitution')
 *
 * If the route is not in the DB, the meta remains empty. No JSON fallback.
 * The DB is the single source of truth.
 */
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
