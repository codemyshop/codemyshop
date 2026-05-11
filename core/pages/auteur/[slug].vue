<script setup lang="ts">

interface AuthorArticle {
  id: number
  title: string
  excerpt: string
  coverImage: string
  thumbnailImage: string
  category: string
  subcategory: string
  slug: string
  linkRewrite: string
  nuxtUrl: string
  datePublished: string
  readingTime: number
}

interface AuthorPayload {
  author: {
    id: number
    firstname: string
    lastname: string
    slug: string
    displayName: string
    bio: string
    expertise: string
    photoUrl: string
    linkedinUrl: string
  }
  articles: AuthorArticle[]
  count: number
}

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const { siteUrl } = useBlogConfig()

const { data, error } = await useFetch<AuthorPayload>(`/api/public/author/${slug.value}`, {
  key: `author-${slug.value}`,
})

if (error.value || !data.value?.author) {
  throw createError({ statusCode: 404, statusMessage: 'Auteur introuvable', fatal: true })
}

const author = computed(() => data.value!.author)
const articles = computed(() => data.value!.articles || [])

const canonical = computed(() => `${siteUrl.value}/auteur/${author.value.slug}`)

const pageTitle = computed(() => `${author.value.displayName} — auteur sur le blog`)
const pageDescription = computed(() =>
  author.value.expertise
  || (author.value.bio ? author.value.bio.slice(0, 160) : `Articles signés par ${author.value.displayName}.`)
)

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const personJsonLd = computed(() => {
  const sameAs: string[] = []
  if (author.value.linkedinUrl) sameAs.push(author.value.linkedinUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.value.displayName,
    givenName: author.value.firstname || undefined,
    familyName: author.value.lastname || undefined,
    description: author.value.bio || author.value.expertise || undefined,
    jobTitle: author.value.expertise || undefined,
    image: author.value.photoUrl || undefined,
    url: canonical.value,
    sameAs: sameAs.length ? sameAs : undefined,
  }
})

const itemListJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: articles.value.map((a, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `${siteUrl.value}${a.nuxtUrl}`,
    name: a.title,
  })),
}))

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${siteUrl.value}/` },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl.value}/blog/` },
    { '@type': 'ListItem', position: 3, name: author.value.displayName, item: canonical.value },
  ],
}))

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:type', content: 'profile' },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: canonical },
    { property: 'profile:first_name', content: author.value.firstname || '' },
    { property: 'profile:last_name', content: author.value.lastname || '' },
    ...(author.value.photoUrl ? [{ property: 'og:image', content: author.value.photoUrl }] : []),
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(personJsonLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd.value) },
    ...(articles.value.length
      ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(itemListJsonLd.value) }]
      : []),
  ],
})

function authorInitials(): string {
  const f = (author.value.firstname || author.value.displayName || '').trim()[0] || ''
  const l = (author.value.lastname || '').trim()[0] || ''
  return (f + l).toUpperCase() || '?'
}
</script>

<template>
  <main class="bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100">

    
    <nav class="max-w-5xl mx-auto px-6 pt-8 text-xs text-gray-500 dark:text-slate-400" aria-label="Fil d'Ariane">
      <NuxtLink to="/" class="hover:text-primary-600">Accueil</NuxtLink>
      <span class="mx-2">/</span>
      <NuxtLink to="/blog" class="hover:text-primary-600">Blog</NuxtLink>
      <span class="mx-2">/</span>
      <span class="text-gray-700 dark:text-slate-200">{{ author.displayName }}</span>
    </nav>

    
    <header class="max-w-5xl mx-auto px-6 pt-8 pb-12">
      <div class="flex flex-col md:flex-row gap-8 items-start">
        <div class="shrink-0">
          <img
            v-if="author.photoUrl"
            :src="author.photoUrl"
            :alt="`Portrait de ${author.displayName}`"
            class="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover ring-1 ring-gray-200 dark:ring-slate-700 shadow-sm"
            loading="eager"
          />
          <div
            v-else
            class="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center text-4xl font-bold ring-1 ring-gray-200 dark:ring-slate-700"
            aria-hidden="true"
          >
            {{ authorInitials() }}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
            {{ author.displayName }}
          </h1>
          <p v-if="author.expertise" class="mt-2 text-base text-primary-600 dark:text-primary-400 font-medium">
            {{ author.expertise }}
          </p>
          <div v-if="author.bio" class="prose prose-sm dark:prose-invert max-w-none mt-4 text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {{ author.bio }}
          </div>
          <div v-if="author.linkedinUrl" class="mt-5">
            <a
              :href="author.linkedinUrl"
              target="_blank"
              rel="noopener me"
              class="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              Voir le profil LinkedIn
            </a>
          </div>
        </div>
      </div>
    </header>

    
    <section class="max-w-5xl mx-auto px-6 pb-20 border-t border-gray-100 dark:border-slate-800 pt-10">
      <header class="mb-8">
        <h2 class="text-xl md:text-2xl font-bold tracking-tight">
          Articles signés par {{ author.firstname || author.displayName }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {{ articles.length }} article{{ articles.length > 1 ? 's' : '' }} publié{{ articles.length > 1 ? 's' : '' }}
        </p>
      </header>

      <div v-if="articles.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="a in articles"
          :key="a.id"
          class="group rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <NuxtLink :to="a.nuxtUrl" class="block">
            <div class="aspect-[16/10] bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <img
                v-if="a.thumbnailImage || a.coverImage"
                :src="a.thumbnailImage || a.coverImage"
                :alt="a.title"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-xs text-gray-400">
                Pas d'illustration
              </div>
            </div>
            <div class="p-5">
              <p v-if="a.category" class="text-[10px] uppercase tracking-wider font-semibold text-primary-600 dark:text-primary-400 mb-2">
                {{ a.category }}
              </p>
              <h3 class="text-base font-bold leading-snug text-gray-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors">
                {{ a.title }}
              </h3>
              <p v-if="a.excerpt" class="text-xs text-gray-500 dark:text-slate-400 mt-2 line-clamp-3">
                {{ a.excerpt }}
              </p>
              <div class="flex items-center gap-3 mt-4 text-[11px] text-gray-400">
                <span v-if="a.datePublished">{{ formatDate(a.datePublished) }}</span>
                <span v-if="a.datePublished && a.readingTime">·</span>
                <span v-if="a.readingTime">{{ a.readingTime }} min de lecture</span>
              </div>
            </div>
          </NuxtLink>
        </article>
      </div>

      <p v-else class="text-sm text-gray-500 dark:text-slate-400 italic">
        Aucun article publié pour l'instant.
      </p>
    </section>

  </main>
</template>
