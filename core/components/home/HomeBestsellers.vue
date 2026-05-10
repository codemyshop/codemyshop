<!--
  Section "Meilleures ventes" — top produits sur 90 jours glissants.
  Layout 1+4 via FeaturedProductGrid (source unique — cf core/components/home).
  Badge "Top 1/2/3" passé explicitement sur les 3 premiers rangs.
  Alimenté par GET /api/catalogue/by-category?id_category=392 (catégorie
  virtuelle "meilleures-ventes" — émet les mêmes fields enrichis qu'une
  catégorie réelle : pricePerKgFormatted, format, packaging, caliber, etc.
  pour cohérence avec les pages catégorie listing).

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
  // rank 0 = Top 2, rank 1 = Top 3, following ones without badge
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
