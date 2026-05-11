
<script setup lang="ts">
const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload?: { limit?: number; featuredPosition?: 'left' | 'right' } | null
}>()

const limit = computed(() => Math.min(Math.max(props.payload?.limit ?? 5, 1), 5))
const featuredPosition = computed<'left' | 'right'>(() =>
  props.payload?.featuredPosition === 'right' ? 'right' : 'left',
)

const { data } = await useFetch('/api/catalogue/by-category', {
  query: { id_category: 392, limit: limit.value },
  server: false,
  lazy: true,
})
const products = computed(() => data.value?.products ?? [])

const featuredBadge = { text: 'Top 1', variant: 'top' as const }

function otherBadge(rank: number) {
  
  if (rank === 0) return { text: 'Top 2', variant: 'top' as const }
  if (rank === 1) return { text: 'Top 3', variant: 'top' as const }
  return null
}
</script>

<template>
  <HomeFeaturedProductGrid
    :title="title || 'Nos meilleures ventes'"
    :subtitle="subtitle"
    :products="products"
    :header-pill="{ text: '90 derniers jours', variant: 'primary' }"
    bg-class="bg-slate-50 dark:bg-slate-900"
    :featured-badge="featuredBadge"
    :other-badge-fn="otherBadge"
    :featured-position="featuredPosition"
  />
</template>
