<template>
  <section class="py-12 bg-white dark:bg-slate-900">
    <h2 class="text-2xl font-bold text-foreground mb-8">
      {{ title ?? 'Nos univers' }}
    </h2>

    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <a
        v-for="cat in categories"
        :key="cat.href"
        :href="cat.href"
        class="group relative overflow-hidden rounded-card bg-gray-100 block aspect-[4/3]"
      >
        <!-- Image with zoom on hover -->
        <NuxtImg
          :src="cat.image"
          :alt="cat.label"
          class="w-full h-full object-cover transition-transform duration-400 group-hover:scale-110"
          sizes="50vw sm:33vw lg:25vw"
          preset="hero"
          loading="lazy"
        />
        <!-- Gradient bas -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <!-- Label -->
        <span class="absolute bottom-0 left-0 right-0 p-3 text-white font-semibold text-sm leading-tight">
          {{ t(cat.label as any) }}
        </span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomepageCategory } from '~/types/theme'
defineProps<{
  categories: HomepageCategory[]
  title?:     string
}>()
const { t } = useI18nField()
</script>

