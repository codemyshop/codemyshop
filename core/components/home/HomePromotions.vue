
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
const { activeLang } = useRouteLang()

const { data } = await useFetch('/api/catalogue/by-category', {
  query: { id_category: 391, limit: limit.value, lang: activeLang },
  watch: [activeLang],
  server: false,
  lazy: true,
})
const products = computed(() => data.value?.products ?? [])
</script>

<template>
  <HomeFeaturedProductGrid
    :title="title || 'Nos promotions'"
    :subtitle="subtitle"
    :products="products"
    :header-pill="{ text: 'Offres en cours', variant: 'red' }"
    :featured-position="featuredPosition"
  />
</template>
