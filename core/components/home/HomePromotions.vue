<!--
  Section "Nos promotions" — produits en réduction (DB-driven via ps_specific_price).
  Layout 1+4 via FeaturedProductGrid (source unique).
  Alimenté par GET /api/catalogue/by-category?id_category=391 (catégorie
  virtuelle "promotions") pour bénéficier des mêmes fields enrichis
  (pricePerKgFormatted, format, packaging…) que les pages catégorie listing.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
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
