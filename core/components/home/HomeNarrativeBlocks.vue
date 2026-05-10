<!--
  Blocs narratifs — 3 visuels storytelling (sourcing, conditionnement, livraison...)
  avec accroche éditoriale et CTA optionnel.
  Payload DB attendu (type='narrative-blocks') :
  {
    "blocks": [
      { "image": "/img/narratif/sourcing.jpg", "kicker": "Sourcing direct",
        "title": "De l'origine au sachet", "text": "...",
        "cta_label": "Notre démarche", "cta_to": "/page/notre-demarche" }
    ]
  }

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { localePath } = useLocalePath()
import type { I18nString } from '~/composables/useI18nField'

interface NarrativeBlock {
  image: string
  kicker?: I18nString
  title: I18nString
  text?: I18nString
  cta_label?: I18nString
  cta_to?: string
}

const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload: { blocks?: NarrativeBlock[] } | null
}>()

const { t: i18nt } = useI18nField()
const blocks = computed<NarrativeBlock[]>(() => props.payload?.blocks ?? [])
</script>

<template>
  <section v-if="blocks.length" class="py-16 bg-[#fafaf7]">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-10 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-2">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
        >
          <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
            <img
              :src="block.image"
              :alt="i18nt(block.title)"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <div class="p-6">
            <p v-if="i18nt(block.kicker)" class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2">
              {{ i18nt(block.kicker) }}
            </p>
            <h3 class="text-lg font-bold text-gray-900 mb-3">{{ i18nt(block.title) }}</h3>
            <p v-if="i18nt(block.text)" class="text-sm text-gray-600 leading-relaxed mb-4">{{ i18nt(block.text) }}</p>
            <NuxtLink
              v-if="block.cta_to && i18nt(block.cta_label)"
              :to="localePath(block.cta_to)"
              class="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              {{ i18nt(block.cta_label) }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
