
<script setup lang="ts">
interface IgMedia {
  id:        string
  caption:   string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  imageUrl:  string
  permalink: string
  timestamp: string
}

const { t } = useT()
const cfg = useRuntimeConfig()
const igHandle = String((cfg.public as any).instagramHandle ?? '')
const igHref = computed(() => igHandle ? `https://www.instagram.com/${igHandle}/` : '')

const { data } = await useFetch<{ items: IgMedia[] }>('/api/instagram/feed', {
  query: { limit: 6 },
  default: () => ({ items: [] }),
})

const items = computed(() => data.value?.items ?? [])
const hasFeed = computed(() => items.value.length > 0)
</script>

<template>
  <section class="py-12 bg-gray-50 dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('instagram.heading') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          {{ t('instagram.subheading') }}
        </p>
      </div>

      
      <div
        v-if="hasFeed"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-8"
      >
        <a
          v-for="m in items"
          :key="m.id"
          :href="m.permalink"
          target="_blank"
          rel="noopener noreferrer"
          class="group relative block aspect-square overflow-hidden rounded-lg bg-gray-200 dark:bg-slate-800"
          :title="m.caption || t('instagram.view_on_ig')"
        >
          <img
            :src="m.imageUrl"
            :alt="m.caption || t('instagram.alt_post')"
            loading="lazy"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          >
          
          <span
            v-if="m.mediaType === 'VIDEO'"
            class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5"
            :aria-label="t('instagram.media_video')"
          >
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          
          <span
            v-else-if="m.mediaType === 'CAROUSEL_ALBUM'"
            class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5"
            :aria-label="t('instagram.media_album')"
          >
            <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="7" y="7" width="13" height="13" rx="2" />
              <path stroke-linecap="round" d="M4 16V6a2 2 0 0 1 2-2h10" />
            </svg>
          </span>
          
          <div
            v-if="m.caption"
            class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"
          >
            <p class="text-white text-xs line-clamp-3 leading-snug">{{ m.caption }}</p>
          </div>
        </a>
      </div>

      
      <div class="flex flex-wrap items-center justify-center gap-3">
        <a
          v-if="igHandle"
          :href="igHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          @{{ igHandle }}
        </a>
        <NuxtLink
          to="/instagram"
          class="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-xl text-sm transition-colors"
        >
          {{ t('instagram.see_all_cta') }} →
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
