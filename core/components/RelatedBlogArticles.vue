<template>
  <section
    v-if="articles.length"
    aria-labelledby="related-blog-heading"
    class="py-16"
  >
    <div class="max-w-5xl mx-auto px-6">

      <!-- Section header -->
      <div class="flex items-center justify-between mb-8 gap-4">
        <div>
          <span class="inline-block text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">
            Cluster Sémantique
          </span>
          <h2
            id="related-blog-heading"
            class="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight"
          >
            Nos conseils liés à
            <span class="text-primary-600">{{ categoryLabel }}</span>
          </h2>
        </div>
        <NuxtLink
          v-if="categorySlug"
          :to="`/blog/${categorySlug}`"
          class="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors shrink-0"
          :aria-label="`Voir tous les articles sur ${categoryLabel}`"
        >
          Voir tous les articles
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </NuxtLink>
      </div>

      <!-- Loading skeletons -->
      <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in limit" :key="n" class="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div class="h-48 bg-gray-200" />
          <div class="p-5 space-y-3">
            <div class="h-4 bg-gray-200 rounded w-1/3" />
            <div class="h-5 bg-gray-200 rounded w-full" />
            <div class="h-5 bg-gray-100 rounded w-4/5" />
            <div class="h-3 bg-gray-100 rounded w-full mt-2" />
            <div class="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </div>

      <!-- Grille d'articles -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="article.nuxtUrl"
          :aria-label="`Lire l'article : ${article.title}`"
          class="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
        >
          <!-- Image de couverture -->
          <div class="relative h-48 overflow-hidden bg-gray-100 shrink-0">
            <img
              v-if="article.coverImage"
              :src="article.thumbnailImage || article.coverImage"
              :alt="article.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
              <svg class="w-12 h-12 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>

            <!-- Category badge -->
            <span
              v-if="article.category"
              class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary-100"
            >
              {{ article.category }}
            </span>
          </div>

          <!-- Card content -->
          <div class="flex flex-col flex-1 p-5">
            <h3 class="text-base font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors leading-snug">
              {{ article.title }}
            </h3>
            <p class="text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1">
              {{ article.excerpt }}
            </p>
            <time v-if="article.datePublished" :datetime="article.datePublished" class="block mt-2 text-xs text-gray-400">{{ formatDate(article.datePublished) }}</time>
            <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary-600 group-hover:gap-2.5 transition-all">
              Lire l'article
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Mobile link to category -->
      <div v-if="categorySlug" class="mt-8 text-center sm:hidden">
        <NuxtLink
          :to="`/blog/${categorySlug}`"
          :aria-label="`Voir tous les articles sur ${categoryLabel}`"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          Voir tous les articles sur {{ categoryLabel }}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </NuxtLink>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
interface CmsArticle {
  id:             number
  title:          string
  category:       string
  slug:           string
  excerpt:        string
  coverImage:     string
  thumbnailImage: string
  nuxtUrl:        string
  datePublished:  string
}

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const props = withDefaults(defineProps<{
  /** PS category slug (e.g., "prestashop", "seo") — filters articles */
  categorySlug:  string
  /** Label displayed in h2 title (e.g., "PrestaShop", "SEO") */
  categoryLabel?: string
  /** Number of articles to display — 3 or 6 */
  limit?:         number
  /** Article ID to exclude (to avoid self-reference on the article page) */
  excludeId?:     number
}>(), {
  categoryLabel: undefined,
  limit:         3,
  excludeId:     0,
})

const displayLabel = computed(() =>
  props.categoryLabel ?? props.categorySlug
)

const { activeLang } = useRouteLang()
const { data: raw, status } = await useFetch<CmsArticle[]>('/api/cms', {
  query: {
    // We fetch more than necessary to absorb the potential exclusion
    limit:    props.excludeId ? props.limit + 1 : props.limit,
    category: props.categorySlug,
    lang:     activeLang,
  },
  watch: [activeLang],
})

const articles = computed(() => {
  const list = raw.value ?? []
  const filtered = props.excludeId
    ? list.filter(a => a.id !== props.excludeId)
    : list
  return filtered.slice(0, props.limit)
})

// Re-exported for the <h2>
const categoryLabel = computed(() => displayLabel.value)
</script>
