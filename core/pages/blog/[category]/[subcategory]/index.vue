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

function formatDateShort(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const route = useRoute()
const category    = route.params.category as string
const subcategory = route.params.subcategory as string

const { getPillar, getSubcatLabel, getSubcatMeta, getSubcatId, blogTitle, author, siteUrl } = useBlogConfig()
const pilier = getPillar(category)
const subcatLabel = getSubcatLabel(subcategory)
const seo = getSubcatMeta(category, subcategory)

// Convention PS : <body id="cms-category-X" class="cms-category cms-category-X">
useListingBodyId('cms-category', () => getSubcatId(category, subcategory))

const pageTitle = seo.title || `${subcatLabel} — ${pilier.label} | ${blogTitle.value}`
const pageDesc = seo.description || `Tous les articles ${subcatLabel.toLowerCase()} dans la catégorie ${pilier.label}. Retours d'expérience et guides techniques par ${author.value.name}.`
const canonical = `${siteUrl.value}/blog/${category}/${subcategory}/`

const { activeLang } = useRouteLang()
const { data: allArticles, status } = await useFetch<CmsArticle[]>('/api/cms', {
  query: { limit: 100, category, lang: activeLang },
  watch: [activeLang],
})

const articles = computed(() =>
  (allArticles.value ?? []).filter(a => a.subcategory === subcategory)
)

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${siteUrl.value}/` },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl.value}/blog/` },
    { '@type': 'ListItem', position: 3, name: pilier.label, item: `${siteUrl.value}/blog/${category}/` },
    { '@type': 'ListItem', position: 4, name: subcatLabel, item: canonical },
  ],
}))

const collectionJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle,
  description: pageDesc,
  url: canonical,
  inLanguage: 'fr-FR',
  isPartOf: { '@type': 'WebSite', url: `${siteUrl.value}/`, name: blogTitle.value },
  about: { '@type': 'Thing', name: `${subcatLabel} (${pilier.label})` },
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
  title: pageTitle,
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    { name: 'description', content: pageDesc },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDesc },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: pageDesc },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(collectionJsonLd.value) },
  ],
})

const siblingSubcats = computed(() => {
  if (!allArticles.value) return []
  const subs = new Map<string, number>()
  for (const a of allArticles.value) {
    if (a.subcategory && a.subcategory !== subcategory) {
      subs.set(a.subcategory, (subs.get(a.subcategory) ?? 0) + 1)
    }
  }
  return Array.from(subs.entries()).map(([key, count]) => ({
    key, label: getSubcatLabel(key), count, url: `/blog/${category}/${key}/`,
  }))
})

const featured = computed(() => articles.value?.[0] ?? null)
const rest = computed(() => articles.value?.slice(1) ?? [])
</script>

<template>
  <div class="py-12">

    <!-- Fil d'Ariane -->
    <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-6 flex items-center gap-2">
      <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/blog" class="hover:text-primary-600 transition-colors">Blog</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink :to="`/blog/${category}/`" class="hover:text-primary-600 transition-colors">{{ pilier.label }}</NuxtLink>
      <span aria-hidden="true">/</span>
      <span>{{ subcatLabel }}</span>
    </nav>

    <!-- En-tête -->
    <header class="mb-10">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" :class="pilier.tagBg">{{ pilier.icon }}</div>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">{{ subcatLabel }}</h1>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="pilier.tagBg">{{ articles.length }} article{{ articles.length > 1 ? 's' : '' }}</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Pilier <span class="font-semibold" :class="pilier.color">{{ pilier.label }}</span>
          </p>
        </div>
      </div>

      <!-- Navigation sous-catégories soeurs -->
      <div v-if="siblingSubcats.length" class="flex flex-wrap gap-2 mt-4">
        <NuxtLink
          :to="`/blog/${category}/`"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-400 transition-all"
        >
          Tout {{ pilier.label }}
        </NuxtLink>
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2" :class="pilier.tagBg + ' border-current'">
          {{ subcatLabel }} ({{ articles.length }})
        </span>
        <NuxtLink
          v-for="sib in siblingSubcats" :key="sib.key" :to="sib.url"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-400 transition-all"
        >
          {{ sib.label }} <span class="opacity-60">({{ sib.count }})</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div v-for="n in 4" :key="n" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 animate-pulse">
        <div class="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl mb-4" /><div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" /><div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full" />
      </div>
    </div>

    <template v-else-if="articles.length">
      <!-- Article vedette (full-width) -->
      <NuxtLink
        v-if="featured"
        :to="featured.nuxtUrl"
        class="group block rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 mb-8"
      >
        <div class="flex flex-col md:flex-row">
          <div v-if="featured.coverImage" class="md:w-1/2 aspect-[600/315] md:aspect-auto overflow-hidden bg-gray-100 dark:bg-slate-800">
            <img :src="featured.coverImage" :alt="featured.title" class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" width="600" height="315" />
          </div>
          <div class="md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" :class="pilier.tagBg">{{ pilier.label }}</span>
              <span class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ subcatLabel }}</span>
            </div>
            <h2 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ featured.title }}</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">{{ featured.excerpt }}</p>
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
              <time v-if="featured.datePublished">{{ formatDateShort(featured.datePublished) }}</time>
              <span v-if="featured.readingTime" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {{ featured.readingTime }} min
              </span>
              <span v-if="featured.faqCount">{{ featured.faqCount }} FAQ</span>
            </div>
          </div>
        </div>
      </NuxtLink>

      <!-- Articles suivants -->
      <div v-if="rest.length" class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <NuxtLink
          v-for="article in rest" :key="article.id" :to="article.nuxtUrl"
          class="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-500/20 transition-all duration-300"
        >
          <div v-if="article.thumbnailImage || article.coverImage" class="aspect-[600/315] overflow-hidden bg-gray-100 dark:bg-slate-800">
            <img :src="article.thumbnailImage || article.coverImage" :alt="article.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="600" height="315" />
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" :class="pilier.tagBg">{{ pilier.label }}</span>
              <span class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ subcatLabel }}</span>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ article.title }}</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">{{ article.excerpt }}</p>
            <div class="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
              <time v-if="article.datePublished">{{ formatDateShort(article.datePublished) }}</time>
              <span v-if="article.readingTime" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {{ article.readingTime }} min
              </span>
              <span v-if="article.faqCount">{{ article.faqCount }} FAQ</span>
            </div>
            <div class="mt-3 flex items-center gap-1.5 text-xs font-semibold" :class="pilier.color">
              <span class="group-hover:underline">Lire</span>
              <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </div>
          </div>
        </NuxtLink>
      </div>
    </template>

    <!-- Vide -->
    <div v-else class="text-center py-20 text-gray-500 dark:text-slate-500">
      <p class="text-5xl mb-4">📂</p>
      <p class="text-lg font-medium">Aucun article dans cette sous-cat&eacute;gorie.</p>
      <NuxtLink :to="`/blog/${category}/`" class="text-sm mt-3 inline-block text-primary-500 hover:underline">Voir tous les articles {{ pilier.label }} &rarr;</NuxtLink>
    </div>
  </div>
</template>
