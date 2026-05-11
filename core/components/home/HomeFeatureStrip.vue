
<script setup lang="ts">
import type { I18nString } from '~/composables/useI18nField'

interface Feature {
  image: string
  label: I18nString
  description?: I18nString
  icon?: string
  title?: I18nString
  text?: I18nString
}

defineProps<{
  features: Feature[]
}>()

const { t: i18nt } = useI18nField()
</script>

<template>
  <section v-if="features?.length" class="border-y border-gray-100 py-10 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div
          v-for="feat in features"
          :key="feat.label"
          class="flex items-center gap-4"
        >
          <div class="w-14 h-14 flex items-center justify-center shrink-0 rounded-full bg-primary-600/10">
            <img :src="feat.image" :alt="i18nt(feat.label || feat.title)" class="w-8 h-8 object-contain" loading="lazy" />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 leading-tight">{{ i18nt(feat.label || feat.title) }}</p>
            <p v-if="i18nt(feat.description || feat.text)" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ i18nt(feat.description || feat.text) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
