
<script setup lang="ts">
const { localePath } = useLocalePath()
const { t: i18nt } = useI18nField()
const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload?: { limit?: number; cta_label?: string; cta_to?: string } | null
}>()

const limit = computed(() => Math.min(Math.max(props.payload?.limit ?? 3, 1), 12))
const { activeLang } = useRouteLang()

const { data } = await useFetch<any[]>('/api/cms', {
  query: { limit: limit.value, lang: activeLang },
  watch: [activeLang],
  server: false,
  lazy: true,
})
const articles = computed(() => data.value ?? [])

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}
</script>

<template>
  <section v-if="articles.length" class="py-12 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900">{{ title || 'Notre blog : astuces & bons plans' }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="article.nuxtUrl || `/blog/${article.linkRewrite}`"
          class="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
        >
          <div class="aspect-[600/315] bg-gray-100 overflow-hidden">
            <NuxtImg
              v-if="article.coverImage"
              :src="article.coverImage"
              :alt="article.title"
              width="600"
              height="315"
              sizes="100vw sm:50vw lg:33vw"
              preset="blogCover"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
              <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          </div>

          <div class="p-5">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors">
              {{ article.title }}
            </h3>
            <p v-if="article.datePublished" class="text-xs text-gray-400 mb-3">
              Publié : {{ formatDate(article.datePublished) }}
            </p>
            <span class="inline-block text-xs font-semibold text-primary-700 group-hover:text-primary-800">
              Lire l'article →
            </span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="payload?.cta_to" class="text-center mt-8">
        <NuxtLink
          :to="localePath(payload.cta_to)"
          class="inline-block px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          {{ i18nt(payload.cta_label) || 'Découvrez tous nos conseils' }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
