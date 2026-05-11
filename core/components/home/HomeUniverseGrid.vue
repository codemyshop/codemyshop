
<script setup lang="ts">
const { localePath } = useLocalePath()
interface Category {
  icon?:  string
  image?: string
  label:  string | Record<string, string>
  href:   string
}

defineProps<{
  categories: Category[]
  title?: string
}>()

const { t: i18nt } = useI18nField()
</script>

<template>
  <section v-if="categories?.length" class="py-12 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-8">{{ title || 'Nos Univers' }}</h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5">
        <NuxtLink
          v-for="cat in categories"
          :key="cat.href"
          :to="localePath(cat.href)"
          class="group flex flex-col items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-primary-600/5 hover:shadow-md transition-all"
        >
          <div class="w-32 h-32 sm:w-36 sm:h-36 md:w-full md:aspect-square md:h-auto flex items-center justify-center text-primary-600 group-hover:scale-105 transition-transform duration-300">
            <HomeUniverseIcon
              v-if="cat.icon"
              :name="cat.icon as any"
              class="w-full h-full"
            />
            <img
              v-else-if="cat.image"
              :src="cat.image"
              :alt="i18nt(cat.label)"
              class="w-full h-full object-contain"
              loading="lazy"
            >
          </div>
          <span class="text-base font-semibold text-gray-700 group-hover:text-primary-600 text-center leading-tight">
            {{ i18nt(cat.label) }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
