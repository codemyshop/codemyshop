<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Section homepage "brand-strip" — bandeau marquee de marques distribuées.
  Pattern Skate Deluxe / Nike SB / Vans : auto-scroll horizontal infinite.

  Item shape :
    { label: string, href: string, image?: string }
  Si `image` est fourni → <img> rendu (logo CDN). Sinon → wordmark textuel
  (typo Archivo Black uppercase, gris-foncé, hover noir).

  Marquee CSS pure (zéro JS) : duplication des items × 2 + animation linear
  infinite. Pause au hover.
-->
<script setup lang="ts">
interface BrandItem {
  label: string
  href: string
  image?: string | null
}

const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  items: BrandItem[]
  /** Speed in px/s (default 60). */
  speed?: number
}>()

const speedPx = computed(() => Math.max(20, props.speed ?? 60))
// Duplicate items for infinite loop without visual jump.
const looped = computed(() => [...props.items, ...props.items])

// Estimated width of an item (wordmark or logo) — used to calculate
// duration de l'animation (`pixels / speedPx` secondes).
const ITEM_WIDTH_PX = 180
const animationDuration = computed(() => `${(props.items.length * ITEM_WIDTH_PX) / speedPx.value}s`)
</script>

<template>
  <section class="py-10 bg-white border-y border-gray-100">
    <div v-if="title || subtitle" class="max-w-6xl mx-auto px-4 sm:px-6 mb-6 text-center">
      <h2 v-if="title" class="text-lg font-semibold text-gray-900 uppercase tracking-widest">{{ title }}</h2>
      <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
    </div>

    <div class="brand-strip relative overflow-hidden" aria-label="Marques distribuées">
      <ul
        class="brand-strip-track flex items-center gap-12 whitespace-nowrap"
        :style="{ animationDuration: animationDuration }"
      >
        <li v-for="(b, i) in looped" :key="`${b.href}-${i}`" class="shrink-0">
          <NuxtLink
            :to="b.href"
            :title="b.label"
            class="brand-item flex items-center justify-center h-12 px-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <img
              v-if="b.image"
              :src="b.image"
              :alt="b.label"
              class="max-h-10 w-auto object-contain grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition"
              loading="lazy"
              data-no-filter
            />
            <span
              v-else
              class="brand-wordmark uppercase tracking-wider text-base font-extrabold"
              style="font-family: 'Archivo Black', 'Arial Black', sans-serif;"
            >{{ b.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.brand-strip-track {
  animation-name: brand-marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  width: max-content;
}
.brand-strip:hover .brand-strip-track {
  animation-play-state: paused;
}
@keyframes brand-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .brand-strip-track { animation: none; }
}
</style>
