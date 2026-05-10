<script setup lang="ts">
/**
 */
interface CmsArticle {
  id: number
  title: string
  category: string
  subcategory: string
  slug: string
  linkRewrite: string
  excerpt: string
  coverImage: string
  thumbnailImage: string
  nuxtUrl: string
  datePublished: string
  readingTime: number
  faqCount: number
}

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const { blogTitle, blogDescription, pillars: pillarMap, pillarKeys, getPillar, getSubcatLabel, siteUrl, blogRootId } = useBlogConfig()
const { t } = useHubT()

// Convention PS : <body id="cms-category-X" class="cms-category cms-category-X"> — racine "Blog" sous Accueil
useListingBodyId('cms-category', () => blogRootId.value)

const canonical = `${siteUrl.value}/blog/`

const { activeLang } = useRouteLang()
const { data: articles, status } = await useFetch<CmsArticle[]>('/api/cms', {
  query: { limit: 100, lang: activeLang },
  watch: [activeLang],
})

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${siteUrl.value}/` },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: canonical },
  ],
}))

const collectionJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: blogTitle.value,
  description: blogDescription.value,
  url: canonical,
  inLanguage: 'fr-FR',
  isPartOf: { '@type': 'WebSite', url: `${siteUrl.value}/`, name: blogTitle.value },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: articles.value?.length ?? 0,
    itemListElement: (articles.value ?? []).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: a.nuxtUrl.startsWith('http') ? a.nuxtUrl : `${siteUrl.value}${a.nuxtUrl}`,
      name: a.title,
    })),
  },
}))

useHead({
  title: blogTitle.value,
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    { name: 'description', content: blogDescription.value },
    { property: 'og:title', content: blogTitle.value },
    { property: 'og:description', content: blogDescription.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: blogTitle.value },
    { name: 'twitter:description', content: blogDescription.value },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(collectionJsonLd.value) },
  ],
})

const piliers = computed(() => {
  if (!articles.value) return []
  const grouped: Record<string, Record<string, CmsArticle[]>> = {}
  for (const a of articles.value) {
    const cat = a.category || 'autres'
    const sub = a.subcategory || 'general'
    if (!grouped[cat]) grouped[cat] = {}
    if (!grouped[cat][sub]) grouped[cat][sub] = []
    grouped[cat][sub].push(a)
  }
  // Use pillar order from config, then append any extra categories from data
  const orderedKeys = [...pillarKeys.value]
  for (const k of Object.keys(grouped)) {
    if (!orderedKeys.includes(k)) orderedKeys.push(k)
  }
  return orderedKeys
    .filter(k => grouped[k])
    .map(k => {
      const meta = getPillar(k)
      return {
        key: k,
        meta,
        subcats: Object.entries(grouped[k]).map(([subKey, arts]) => ({
          key: subKey,
          label: getSubcatLabel(subKey),
          url: `/blog/${k}/${subKey}/`,
          articles: arts,
        })),
        allArticles: Object.values(grouped[k]).flat(),
        total: Object.values(grouped[k]).flat().length,
      }
    })
})

const totalArticles = computed(() => articles.value?.length ?? 0)
const featured = computed(() => articles.value?.[0] ?? null)
</script>

<template>
  <div class="py-12">

    <!-- ═══ HERO ═════════════════════════════════════════════════════════ -->
    <header class="mb-16">
      <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-6 flex items-center gap-2">
        <NuxtLink to="/" class="hover:text-primary-600 transition-colors">{{ t('common.home', 'Accueil') }}</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ t('blog.breadcrumb', 'Blog') }}</span>
      </nav>

      <div class="flex items-end justify-between gap-6 mb-10">
        <div>
          <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">{{ t('blog.title', blogTitle) }}</h1>
          <p class="text-lg text-gray-500 dark:text-slate-400 max-w-2xl">{{ blogDescription }}</p>
        </div>
        <div class="hidden md:flex items-center gap-6 shrink-0">
          <div class="text-center">
            <p class="text-3xl font-extrabold text-primary-600 dark:text-primary-400">{{ totalArticles }}</p>
            <p class="text-[10px] text-gray-600 dark:text-slate-400 uppercase tracking-widest">{{ t('blog.articles_label', 'articles') }}</p>
          </div>
          <div class="w-px h-10 bg-gray-200 dark:bg-slate-700" />
          <div class="text-center">
            <p class="text-3xl font-extrabold text-gray-900 dark:text-white">{{ piliers.length }}</p>
            <p class="text-[10px] text-gray-600 dark:text-slate-400 uppercase tracking-widest">{{ t('blog.pillars_label', 'piliers') }}</p>
          </div>
        </div>
      </div>

      <!-- Recherche -->
      <div class="mb-10">
        <BlogSearch />
      </div>

      <!-- Navigation piliers -->
      <div class="flex flex-wrap gap-2 mb-10">
        <template v-for="pilier in piliers" :key="pilier.key">
          <a
            :href="`#pilier-${pilier.key}`"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-transparent transition-all hover:shadow-sm"
            :class="pilier.meta.tagBg"
          >
            <span>{{ pilier.meta.icon }}</span>
            {{ pilier.meta.label }}
            <span class="opacity-80 ml-0.5">{{ pilier.total }}</span>
          </a>
        </template>
      </div>

      <!-- Article vedette -->
      <NuxtLink
        v-if="featured"
        :to="featured.nuxtUrl"
        class="group relative block rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500/30 transition-all duration-300 hover:shadow-2xl"
      >
        <div class="aspect-[2.4/1] bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <img v-if="featured.coverImage" :src="featured.coverImage" :alt="featured.title" class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" loading="eager" width="1200" height="500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div class="absolute bottom-0 inset-x-0 p-6 md:p-10">
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <span class="text-xs font-bold text-white/90 uppercase tracking-widest bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">Dernier article</span>
            <span v-if="featured.subcategory" class="text-xs font-semibold text-primary-300 bg-primary-600/20 backdrop-blur-sm px-3 py-1 rounded-full capitalize">{{ getSubcatLabel(featured.subcategory) }}</span>
          </div>
          <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug mb-3 group-hover:text-primary-200 transition-colors max-w-3xl">{{ featured.title }}</h2>
          <p class="text-sm text-white/60 line-clamp-2 max-w-2xl mb-4">{{ featured.excerpt }}</p>
          <div class="flex items-center gap-4 text-xs text-white/50">
            <time v-if="featured.datePublished">{{ formatDate(featured.datePublished) }}</time>
            <span v-if="featured.readingTime" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              {{ featured.readingTime }} min
            </span>
            <span v-if="featured.faqCount" class="flex items-center gap-1">{{ featured.faqCount }} FAQ</span>
          </div>
        </div>
      </NuxtLink>
    </header>

    <!-- ═══ LOADING ══════════════════════════════════════════════════════ -->
    <div v-if="status === 'pending'" class="space-y-12">
      <div v-for="n in 3" :key="n" class="animate-pulse">
        <div class="h-6 bg-gray-200 dark:bg-slate-800 rounded w-48 mb-6" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div v-for="m in 2" :key="m" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6"><div class="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl mb-4" /><div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" /><div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full" /></div>
        </div>
      </div>
    </div>

    <!-- ═══ COCON SÉMANTIQUE ═════════════════════════════════════════════ -->
    <div v-else-if="piliers.length" class="space-y-24">
      <section v-for="pilier in piliers" :key="pilier.key" :id="`pilier-${pilier.key}`" class="scroll-mt-20">

        <!-- En-tête pilier -->
        <div class="flex items-start gap-4 mb-8">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" :class="pilier.meta.tagBg">{{ pilier.meta.icon }}</div>
          <div class="flex-1">
            <div class="flex items-center gap-3 flex-wrap">
              <NuxtLink :to="`/blog/${pilier.key}/`" class="text-2xl font-extrabold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{{ pilier.meta.label }}</NuxtLink>
              <span class="text-xs font-bold px-2.5 py-1 rounded-full" :class="pilier.meta.tagBg">{{ pilier.total }} article{{ pilier.total > 1 ? 's' : '' }}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ pilier.meta.desc }}</p>
            <!-- Liens sous-catégories -->
            <div class="flex flex-wrap gap-2 mt-3">
              <NuxtLink
                v-for="sub in pilier.subcats"
                :key="sub.key"
                :to="sub.url"
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {{ sub.label }}
                <span class="text-gray-500 dark:text-slate-400">&middot; {{ sub.articles.length }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Article vedette du pilier (full-width) -->
        <NuxtLink
          v-if="pilier.allArticles[0]"
          :to="pilier.allArticles[0].nuxtUrl"
          class="group block rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 mb-6"
          :class="'hover:' + pilier.meta.accent"
        >
          <div class="flex flex-col md:flex-row">
            <div v-if="pilier.allArticles[0].coverImage" class="md:w-1/2 aspect-[600/315] md:aspect-auto overflow-hidden bg-gray-100 dark:bg-slate-800">
              <img :src="pilier.allArticles[0].coverImage" :alt="pilier.allArticles[0].title" class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" width="600" height="315" />
            </div>
            <div class="md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white dark:bg-slate-900">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" :class="pilier.meta.tagBg">{{ pilier.meta.label }}</span>
                <span v-if="pilier.allArticles[0].subcategory" class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ getSubcatLabel(pilier.allArticles[0].subcategory) }}</span>
              </div>
              <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ pilier.allArticles[0].title }}</h3>
              <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">{{ pilier.allArticles[0].excerpt }}</p>
              <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                <time v-if="pilier.allArticles[0].datePublished">{{ formatDateShort(pilier.allArticles[0].datePublished) }}</time>
                <span v-if="pilier.allArticles[0].readingTime" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {{ pilier.allArticles[0].readingTime }} min
                </span>
                <span v-if="pilier.allArticles[0].faqCount">{{ pilier.allArticles[0].faqCount }} FAQ</span>
              </div>
              <div class="mt-4 flex items-center gap-1.5 text-xs font-semibold" :class="pilier.meta.color">
                <span class="group-hover:underline">Lire l'article</span>
                <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </div>
            </div>
          </div>
        </NuxtLink>

        <!-- Articles suivants (grille 2 colonnes) -->
        <div v-if="pilier.allArticles.length > 1" class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <NuxtLink
            v-for="article in pilier.allArticles.slice(1)"
            :key="article.id"
            :to="article.nuxtUrl"
            class="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-500/20 transition-all duration-300"
          >
            <div v-if="article.thumbnailImage || article.coverImage" class="aspect-[600/315] overflow-hidden bg-gray-100 dark:bg-slate-800">
              <img :src="article.thumbnailImage || article.coverImage" :alt="article.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="600" height="315" />
            </div>
            <div class="p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" :class="pilier.meta.tagBg">{{ pilier.meta.label }}</span>
                <span v-if="article.subcategory" class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ getSubcatLabel(article.subcategory) }}</span>
              </div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ article.title }}</h3>
              <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">{{ article.excerpt }}</p>
              <div class="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                <time v-if="article.datePublished">{{ formatDateShort(article.datePublished) }}</time>
                <span v-if="article.readingTime" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {{ article.readingTime }} min
                </span>
                <span v-if="article.faqCount">{{ article.faqCount }} FAQ</span>
              </div>
              <div class="mt-3 flex items-center gap-1.5 text-xs font-semibold" :class="pilier.meta.color">
                <span class="group-hover:underline">Lire</span>
                <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Lien "Voir tout" si beaucoup d'articles -->
        <div v-if="pilier.total > 4" class="mt-6 text-center">
          <NuxtLink
            :to="`/blog/${pilier.key}/`"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
          >
            Tous les articles {{ pilier.meta.label }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </NuxtLink>
        </div>
      </section>
    </div>

    <!-- ═══ VIDE ═════════════════════════════════════════════════════════ -->
    <div v-else class="text-center py-20 text-gray-500 dark:text-slate-400">
      <p class="text-5xl mb-4">✍️</p>
      <p class="text-lg font-medium">Aucun article pour le moment.</p>
    </div>
  </div>
</template>

