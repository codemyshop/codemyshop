<script setup lang="ts">
/**
 */
interface CmsArticle {
  id: number
  title: string
  category: string
  subcategory: string
  slug: string
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
const category = route.params.category as string

const { getPillar, getSubcatLabel, getPillarMeta, getPillarId, blogTitle, author, siteUrl } = useBlogConfig()
const pilier = getPillar(category)
const seo = getPillarMeta(category)

// Convention PS : <body id="cms-category-X" class="cms-category cms-category-X">
useListingBodyId('cms-category', () => getPillarId(category))

const pageTitle = seo.title || `${pilier.label} — ${blogTitle.value}`
const pageDesc = seo.description || `Tous les articles ${pilier.label} : conseils, tutoriels et retours d'expérience par ${author.value.name}.`
const canonical = `${siteUrl.value}/blog/${category}/`

const { activeLang } = useRouteLang()
const { data: articles, status } = await useFetch<CmsArticle[]>('/api/cms', {
  query: { limit: 100, category, lang: activeLang },
  watch: [activeLang],
})

// Fallback URL plate `/blog/<slug>` (legacy SMOKE 2-niveaux, vs convention
// 3-niveaux par défaut). Si la catégorie ne ramène aucun article ET qu'un
// article existe avec ce slug, on rend l'article inline.
const isKnownPilier = getPillarId(category) > 0
const { data: directArticle } = await useFetch<{ id: number; title: string; content: string; metaTitle?: string; metaDescription?: string; datePublished?: string } | null>(
  `/api/cms/${category}`,
  {
    query: { lang: activeLang },
    watch: [activeLang],
    server: !isKnownPilier,  // skip SSR fetch si on est sur un pilier connu (catalog)
    lazy: isKnownPilier,
    default: () => null,
  },
)
const isArticleFallback = computed(() => !isKnownPilier && Boolean(directArticle.value) && (!articles.value || articles.value.length === 0))

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${siteUrl.value}/` },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl.value}/blog/` },
    { '@type': 'ListItem', position: 3, name: pilier.label, item: canonical },
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
  about: { '@type': 'Thing', name: pilier.label },
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

// Title réactif : si on est en mode article fallback, on prend les meta de
// l'article ; sinon les meta du pilier (catalog).
const finalTitle = computed(() =>
  isArticleFallback.value
    ? (directArticle.value?.metaTitle || directArticle.value?.title || pageTitle)
    : pageTitle,
)
const finalDesc = computed(() =>
  isArticleFallback.value
    ? (directArticle.value?.metaDescription || pageDesc)
    : pageDesc,
)

useHead({
  title: finalTitle,
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    { name: 'description', content: finalDesc },
    { property: 'og:title', content: finalTitle },
    { property: 'og:description', content: finalDesc },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: finalTitle },
    { name: 'twitter:description', content: finalDesc },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(collectionJsonLd.value) },
  ],
})

const subcats = computed(() => {
  if (!articles.value) return []
  const subs = new Map<string, number>()
  for (const a of articles.value) {
    if (a.subcategory) subs.set(a.subcategory, (subs.get(a.subcategory) ?? 0) + 1)
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

    <!-- ───────────────────────────────────────────────────────── -->
    <!-- Mode article direct (URL plate /blog/<slug>) — fallback   -->
    <!-- pour les tenants 2-niveaux type SMOKE v2 legacy.           -->
    <!-- ───────────────────────────────────────────────────────── -->
    <article v-if="isArticleFallback" class="prose prose-lg dark:prose-invert max-w-3xl mx-auto">
      <nav aria-label="Fil d'Ariane" class="not-prose text-sm text-gray-600 dark:text-slate-400 mb-6 flex items-center gap-2">
        <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
        <span aria-hidden="true">/</span>
        <NuxtLink to="/blog" class="hover:text-primary-600 transition-colors">Blog</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ directArticle?.title }}</span>
      </nav>
      <h1>{{ directArticle?.title }}</h1>
      <time
        v-if="directArticle?.datePublished"
        class="block text-sm text-gray-500 dark:text-slate-400 not-prose mb-6"
      >
        {{ formatDateShort(directArticle.datePublished) }}
      </time>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="directArticle?.content || ''" />
    </article>

    <template v-else>

    <!-- Fil d'Ariane -->
    <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-6 flex items-center gap-2">
      <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/blog" class="hover:text-primary-600 transition-colors">Blog</NuxtLink>
      <span aria-hidden="true">/</span>
      <span>{{ pilier.label }}</span>
    </nav>

    <!-- En-tête -->
    <header class="mb-10">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" :class="pilier.tagBg">{{ pilier.icon }}</div>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">{{ pilier.label }}</h1>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="pilier.tagBg">{{ articles?.length ?? 0 }} article{{ (articles?.length ?? 0) > 1 ? 's' : '' }}</span>
          </div>
          <p v-if="pilier.desc" class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ pilier.desc }}</p>
        </div>
      </div>

      <!-- Navigation sous-catégories -->
      <div v-if="subcats.length" class="flex flex-wrap gap-2 mt-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2" :class="pilier.tagBg + ' border-current'">
          Tout ({{ articles?.length ?? 0 }})
        </span>
        <NuxtLink
          v-for="sub in subcats" :key="sub.key" :to="sub.url"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500 transition-all"
        >
          {{ sub.label }} <span class="opacity-60">({{ sub.count }})</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div v-for="n in 4" :key="n" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 animate-pulse">
        <div class="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl mb-4" /><div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" /><div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full" />
      </div>
    </div>

    <template v-else-if="articles && articles.length">
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
              <span v-if="featured.subcategory" class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ getSubcatLabel(featured.subcategory) }}</span>
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

      <!-- Articles suivants (grille 2 colonnes) -->
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
              <span v-if="article.subcategory" class="text-[10px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{{ getSubcatLabel(article.subcategory) }}</span>
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
      <p class="text-lg font-medium">Aucun article dans cette cat&eacute;gorie.</p>
      <NuxtLink to="/blog" class="text-sm mt-3 inline-block text-primary-500 hover:underline">Voir tous les articles &rarr;</NuxtLink>
    </div>

    </template> <!-- /v-else article fallback -->
  </div>
</template>
