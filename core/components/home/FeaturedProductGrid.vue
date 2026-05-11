
<script setup lang="ts">
type BadgeVariant = 'promo' | 'top' | 'new' | 'custom'

interface Badge { text: string; variant?: BadgeVariant }

const props = withDefaults(defineProps<{
  title?: string | null
  subtitle?: string | null
  
  products: any[]
  
  headerPill?: { text: string; variant?: 'red' | 'green' | 'primary' | 'amber' } | null
  
  bgClass?: string
  
  featuredBadge?: Badge | null
  
  otherBadgeFn?: ((rank: number) => Badge | null) | null
  
  featuredPosition?: 'left' | 'right'
}>(), {
  title: '',
  subtitle: '',
  headerPill: null,
  bgClass: 'bg-white',
  featuredBadge: null,
  otherBadgeFn: null,
  featuredPosition: 'left',
})

const featured = computed(() => props.products[0] ?? null)
const others   = computed(() => props.products.slice(1, 5))

const pillClass = computed(() => {
  const v = props.headerPill?.variant ?? 'primary'
  if (v === 'red')     return 'bg-red-50 text-red-700'
  if (v === 'green')   return 'bg-emerald-50 text-emerald-700'
  if (v === 'amber')   return 'bg-amber-50 text-amber-700'
  return 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
})
</script>

<template>
  <section v-if="products.length" :class="['py-12', bgClass]">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mb-8 flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-100">{{ title }}</h2>
          <p v-if="subtitle" class="mt-1 text-sm text-gray-500 dark:text-slate-400">{{ subtitle }}</p>
        </div>
        <span
          v-if="headerPill?.text"
          :class="['hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block', pillClass]"
        >
          {{ headerPill.text }}
        </span>
      </div>

      
      <div class="grid gap-5 lg:grid-cols-2 lg:items-center">
        
        <ProductCard
          v-if="featured"
          :product="featured"
          :badge="featuredBadge"
          featured
          :class="featuredPosition === 'right' ? 'lg:order-2' : ''"
        />

        
        <div
          v-if="others.length"
          class="grid grid-cols-1 sm:grid-cols-2 gap-5"
          :class="featuredPosition === 'right' ? 'lg:order-1' : ''"
        >
          <ProductCard
            v-for="(product, idx) in others"
            :key="product.id"
            :product="product"
            :badge="otherBadgeFn ? otherBadgeFn(idx) : null"
          />
        </div>
      </div>
    </div>
  </section>
</template>
