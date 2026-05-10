<!--
  Home Banners — Row 3 colonnes (image background + overlay texte centré + CTA).
  Équivalent interne du module st_banner utilisé sur la prod Example Shop.
  Payload DB attendu (type='banners') :
  {
    "items": [
      {
        "image": "/img/banners/meyva.jpg",
        "header": "Meyva Example Shop",
        "title": "Partenaire Premium",
        "footer": "Une offre complète au meilleur prix",
        "cta_label": "J'achète",
        "cta_href": "/279-chr",
        "target": "_self"
      }
    ],
    "height": 512,
    "cols": 3
  }

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import { NuxtLink } from '#components'
import type { I18nString } from '~/composables/useI18nField'

interface BannerItem {
  image:      string
  header?:    I18nString
  title?:     I18nString
  footer?:    I18nString
  cta_label?: I18nString
  cta_href?:  string
  target?:    '_self' | '_blank'
}

interface BannerPayload {
  items?:  BannerItem[]
  height?: number
  cols?:   1 | 2 | 3 | 4
}

const props = defineProps<{
  title?:    string | null
  subtitle?: string | null
  payload:   BannerPayload | null
}>()

const { t: i18nt } = useI18nField()

const items  = computed<BannerItem[]>(() => props.payload?.items ?? [])
const height = computed(() => props.payload?.height ?? 512)
const cols   = computed(() => props.payload?.cols ?? 3)

const gridCols = computed(() => ({
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}[cols.value] ?? 'md:grid-cols-3'))

const isExternal = (href?: string) =>
  !!href && (href.startsWith('http://') || href.startsWith('https://'))
</script>

<template>
  <section v-if="items.length" class="py-10 bg-white dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-6 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-slate-400 mt-2">{{ subtitle }}</p>
      </div>

      <div :class="['grid grid-cols-1 gap-4', gridCols]">
        <component
          v-for="(item, i) in items"
          :is="item.cta_href ? (isExternal(item.cta_href) ? 'a' : NuxtLink) : 'div'"
          :key="i"
          :to="item.cta_href && !isExternal(item.cta_href) ? item.cta_href : undefined"
          :href="item.cta_href && isExternal(item.cta_href) ? item.cta_href : undefined"
          :target="item.cta_href && item.target === '_blank' ? '_blank' : undefined"
          :rel="item.cta_href && isExternal(item.cta_href) ? 'noopener noreferrer' : undefined"
          :title="i18nt(item.title)"
          class="group relative block overflow-hidden rounded-xl bg-cover bg-center"
          :style="{ backgroundImage: `url(${item.image})`, height: `${height}px` }"
        >
          <div
            aria-hidden="true"
            class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"
          />
          <div
            class="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 bg-cover bg-center"
            :style="{ backgroundImage: `url(${item.image})` }"
          />
          <div class="relative z-10 flex h-full flex-col items-center justify-start text-center px-6 pt-8 pb-10 text-white">
            <span
              v-if="i18nt(item.header)"
              class="text-xs sm:text-sm font-semibold uppercase tracking-widest drop-shadow-md mb-2"
            >
              {{ i18nt(item.header) }}
            </span>
            <span
              v-if="i18nt(item.title)"
              class="text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md mb-2"
            >
              {{ i18nt(item.title) }}
            </span>
            <span
              v-if="i18nt(item.footer)"
              class="text-sm drop-shadow-md max-w-xs"
            >
              {{ i18nt(item.footer) }}
            </span>
          </div>
        </component>
      </div>
    </div>
  </section>
</template>
