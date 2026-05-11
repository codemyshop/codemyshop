
<script setup lang="ts">
const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload?: { limit?: number; featuredPosition?: 'left' | 'right' } | null
}>()

const limit = computed(() => Math.min(Math.max(props.payload?.limit ?? 5, 1), 5))
const featuredPosition = computed<'left' | 'right'>(() =>
  props.payload?.featuredPosition === 'left' ? 'left' : 'right',
)

const { data } = await useFetch('/api/catalogue/by-category', {
  query: { id_category: 390, limit: limit.value },
  server: false,
  lazy: true,
})
const products = computed(() => data.value?.products ?? [])

const featuredBadge = { text: 'Nouveau', variant: 'new' as const }
</script>

<template>
  <HomeFeaturedProductGrid
    :title="title || 'Nos nouveautés'"
    :subtitle="subtitle"
    :products="products"
    :header-pill="{ text: 'Derniers ajouts', variant: 'green' }"
    :featured-badge="featuredBadge"
    :featured-position="featuredPosition"
  />
</template>
