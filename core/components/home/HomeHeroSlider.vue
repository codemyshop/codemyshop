<!--
  Hero slider homepage — layout 2-colonnes :
  - Gauche (2/3 largeur) : slider défilant N slides
  - Droite (1/3 largeur) : 2 blocs image fixes empilés

  Payload DB attendu (table cs_homepage_section, type='hero-slider') :
  {
    "slides": [
      { "image": "/img/hero/promo-1.jpg", "title": "...", "subtitle": "...", "cta_label": "...", "cta_to": "/grossiste/fruit-sec" }
    ],
    "side_blocks": [
      { "image": "/img/hero/block-1.jpg", "alt": "...", "to": "/grossiste/oriental" },
      { "image": "/img/hero/block-2.jpg", "alt": "...", "to": "/grossiste/charcuterie-halal" }
    ],
    "interval_ms": 5000
  }

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { localePath } = useLocalePath()
import type { I18nString } from '~/composables/useI18nField'

interface Slide {
  image: string
  sticker?: I18nString
  title?: I18nString
  subtitle?: I18nString
  cta_label?: I18nString
  cta_to?: string
}

interface SideBlock {
  image: string
  alt?: string
  to?: string
  sticker?: I18nString
  title?: I18nString
  cta_label?: I18nString
}

const props = defineProps<{
  payload: { slides?: Slide[]; side_blocks?: SideBlock[]; interval_ms?: number } | null
}>()

const { t: i18nt } = useI18nField()

const slides = computed<Slide[]>(() => props.payload?.slides ?? [])
const sideBlocks = computed<SideBlock[]>(() => (props.payload?.side_blocks ?? []).slice(0, 2))
const interval = computed(() => Math.max(2000, props.payload?.interval_ms ?? 5000))

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function go(n: number) {
  if (slides.value.length === 0) return
  current.value = (n + slides.value.length) % slides.value.length
}

onMounted(() => {
  if (slides.value.length > 1) {
    timer = setInterval(() => go(current.value + 1), interval.value)
  }
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <section v-if="slides.length" class="bg-white py-6">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Slider principal (gauche, 2/3) -->
        <div class="lg:col-span-2 relative overflow-hidden rounded-xl bg-gray-900 aspect-[16/9] lg:aspect-auto lg:h-[440px]">
          <transition-group name="fade" tag="div" class="absolute inset-0">
            <div
              v-for="(slide, i) in slides"
              v-show="i === current"
              :key="i"
              class="absolute inset-0"
            >
              <NuxtImg
                :src="slide.image"
                :alt="i18nt(slide.title) || ''"
                class="absolute inset-0 w-full h-full object-cover"
                sizes="100vw md:66vw"
                preset="hero"
                :loading="i === 0 ? 'eager' : 'lazy'"
                :fetchpriority="i === 0 ? 'high' : 'auto'"
              />
              <!-- Overlay only if we have a title/subtitle/CTA -->
              <div
                v-if="i18nt(slide.sticker) || i18nt(slide.title) || i18nt(slide.subtitle) || i18nt(slide.cta_label)"
                class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"
              />
              <div v-if="i18nt(slide.sticker) || i18nt(slide.title) || i18nt(slide.subtitle) || i18nt(slide.cta_label)" class="relative z-10 h-full flex items-center px-6 sm:px-10">
                <div class="max-w-md space-y-3">
                  <span v-if="i18nt(slide.sticker)" class="inline-block bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                    {{ i18nt(slide.sticker) }}
                  </span>
                  <h2 v-if="i18nt(slide.title)" class="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {{ i18nt(slide.title) }}
                  </h2>
                  <p v-if="i18nt(slide.subtitle)" class="text-lg text-red-300 font-semibold">
                    {{ i18nt(slide.subtitle) }}
                  </p>
                  <NuxtLink
                    v-if="slide.cta_to && i18nt(slide.cta_label)"
                    :to="localePath(slide.cta_to)"
                    class="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {{ i18nt(slide.cta_label) }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </transition-group>

          <!-- Pagination -->
          <div v-if="slides.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            <button
              v-for="(_, i) in slides"
              :key="i"
              @click="go(i)"
              :aria-label="`Aller au slide ${i + 1}`"
              class="h-2.5 rounded-full transition-all"
              :class="i === current ? 'bg-white w-8' : 'bg-white/60 hover:bg-white/80 w-2.5'"
            />
          </div>
        </div>

        <!-- 2 blocks on the right (1/3 width, stacked) -->
        <div v-if="sideBlocks.length" class="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:h-[440px]">
          <component
            :is="block.to ? 'NuxtLink' : 'div'"
            v-for="(block, i) in sideBlocks"
            :key="i"
            :to="block.to || undefined"
            class="relative overflow-hidden rounded-xl bg-gray-100 aspect-[16/9] lg:aspect-auto lg:h-full group"
          >
            <NuxtImg
              :src="block.image"
              :alt="block.alt || ''"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="50vw lg:33vw"
              preset="hero"
              loading="lazy"
            />
            <div v-if="i18nt(block.sticker) || i18nt(block.title) || i18nt(block.cta_label)" class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div v-if="i18nt(block.sticker) || i18nt(block.title) || i18nt(block.cta_label)" class="absolute bottom-0 left-0 p-4 z-10 space-y-1.5">
              <span v-if="i18nt(block.sticker)" class="inline-block bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                {{ i18nt(block.sticker) }}
              </span>
              <p v-if="i18nt(block.title)" class="text-xl font-bold text-white leading-snug">
                {{ i18nt(block.title) }}
              </p>
              <NuxtLink
                v-if="block.to && i18nt(block.cta_label)"
                :to="localePath(block.to)"
                class="inline-block text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded transition-colors"
              >
                {{ i18nt(block.cta_label) }}
              </NuxtLink>
            </div>
          </component>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
