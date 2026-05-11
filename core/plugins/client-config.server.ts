

export default defineNuxtPlugin(async (nuxtApp) => {
  
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
