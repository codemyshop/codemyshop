/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * SSR-only plugin: pre-loads client config from the DB
 * BEFORE rendering layouts/components. Solves the timing issue
 * where TheHeader rendered before config was available.
 *
 * Also pre-loads the blog categories hierarchy (ps_cms_category native PS)
 * so that useBlogConfig can access it synchronously on layouts and pages.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  // Résolution clientId depuis le runtimeConfig (chaque VPS définit son clientId)
  const runtimeConfig = useRuntimeConfig()
  const clientId = (runtimeConfig.clientId as string) || (runtimeConfig.public?.clientId as string) || 'ac-hub'

  const [configRes, categoriesRes, featuresRes] = await Promise.allSettled([
    $fetch<Record<string, unknown>>(`/api/client-config/${clientId}`),
    $fetch<{ rootId: number | null; pillars: unknown[] }>('/api/blog/categories'),
    $fetch<unknown[]>('/api/hub/features-catalog', { query: { clientId } }),
  ])

  if (configRes.status === 'fulfilled' && configRes.value) {
    useState('client_db_config', () => configRes.value)
  }

  if (categoriesRes.status === 'fulfilled' && categoriesRes.value) {
    const payload = categoriesRes.value
    useState('blog_root_id', () => payload.rootId ?? null)
    useState('blog_categories', () => Array.isArray(payload.pillars) ? payload.pillars : [])
  }

  if (featuresRes.status === 'fulfilled' && Array.isArray(featuresRes.value)) {
    useState('feature_flags', () => featuresRes.value)
    useState('feature_flags_loaded', () => true)
  }
})
