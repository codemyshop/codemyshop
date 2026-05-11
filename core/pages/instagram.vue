
<script setup lang="ts">
const { t } = useHubT()

interface IgPost {
  id:        number
  igId:      string
  caption:   string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  imageUrl:  string
  permalink: string
  postedAt:  string
}

interface PagedResponse {
  items:   IgPost[]
  total:   number
  hasMore: boolean
}

const PAGE_SIZES = [24, 48, 96] as const
const route = useRoute()
const router = useRouter()

const currentLimit = computed(() => {
  const raw = Number(route.query.limit)
  return PAGE_SIZES.includes(raw as any) ? raw : 24
})
const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const offset = computed(() => (currentPage.value - 1) * currentLimit.value)

const { data } = await useFetch<PagedResponse>('/api/instagram/posts', {
  query: computed(() => ({ limit: currentLimit.value, offset: offset.value })),
  watch: [offset, currentLimit],
})
const posts = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() =>
  total.value > 0 ? Math.max(1, Math.ceil(total.value / currentLimit.value)) : 1,
)
const isFirstPage = computed(() => currentPage.value === 1)

function pageHref(p: number): string {
  const q: Record<string, string> = {}
  if (p > 1) q.page = String(p)
  if (currentLimit.value !== 24) q.limit = String(currentLimit.value)
  const qs = new URLSearchParams(q).toString()
  return qs ? `/instagram?${qs}` : '/instagram'
}

function onLimitChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  router.push({ path: '/instagram', query: { limit: v === 24 ? undefined : v, page: undefined } })
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function truncateCaption(text: string, n = 140): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n) + '…' : clean
}

const pageWindow = computed<Array<number | '…'>>(() => {
  const tp = totalPages.value
  const cp = currentPage.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const out: Array<number | '…'> = [1]
  if (cp > 3) out.push('…')
  for (let p = Math.max(2, cp - 1); p <= Math.min(tp - 1, cp + 1); p++) out.push(p)
  if (cp < tp - 2) out.push('…')
  out.push(tp)
  return out
})

const siteUrl = String((useRuntimeConfig().public as any).psFrontUrl ?? '')
const canonical = `${siteUrl}/instagram`

useHead(() => ({
  title: isFirstPage.value ? 'Instagram Example Shop — @example_fruits_secs' : `Instagram — Page ${currentPage.value} | Example Shop`,
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    { name: 'description', content: 'Retrouvez l\'intégralité des publications Instagram de Example Shop : nouveautés produits, coulisses grossiste, inspirations B2B.' },
    
    ...(isFirstPage.value ? [] : [{ name: 'robots', content: 'noindex,follow' }]),
    { property: 'og:title', content: 'Instagram Example Shop — @example_fruits_secs' },
    { property: 'og:url', content: canonical },
    { property: 'og:type', content: 'website' },
  ],
}))
</script>

<template>
  <main class="min-h-screen bg-gray-50 dark:bg-slate-950">
    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <header class="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-widest text-primary-600 mb-2">
            Instagram
          </p>
          <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            @example_fruits_secs
          </h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {{ total }} publication{{ total > 1 ? 's' : '' }} — coulisses, nouveautés produits et inspirations B2B.
          </p>
        </div>
        <a
          href="https://www.instagram.com/example_fruits_secs/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
          Suivre sur Instagram
        </a>
      </header>

      
      <div v-if="total > 0" class="mb-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p class="text-sm text-slate-500">
          Page {{ currentPage }} / {{ totalPages }}
        </p>
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{{ t('paging.per_page', 'Par page') }}</span>
          <select
            :value="currentLimit"
            class="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @change="onLimitChange"
          >
            <option v-for="s in PAGE_SIZES" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
      </div>

      
      <div
        v-if="posts.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <a
          v-for="post in posts"
          :key="post.id"
          :href="post.permalink"
          target="_blank"
          rel="noopener noreferrer"
          class="group relative block aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors"
          :title="truncateCaption(post.caption, 80)"
        >
          <img
            :src="post.imageUrl"
            :alt="truncateCaption(post.caption, 60) || 'Post Example Shop'"
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span
            v-if="post.mediaType === 'VIDEO'"
            class="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5"
            :aria-label="t('instagram.media_video', 'Vidéo')"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span
            v-else-if="post.mediaType === 'CAROUSEL_ALBUM'"
            class="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5"
            :aria-label="t('instagram.media_carousel', 'Carrousel')"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="13" height="13" rx="2"/><path d="M8 3h13v13"/></svg>
          </span>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <p class="text-[11px] text-white/80 mb-1">{{ formatDate(post.postedAt) }}</p>
            <p class="text-xs text-white line-clamp-2">{{ truncateCaption(post.caption, 80) }}</p>
          </div>
        </a>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"
      >
        {{ t('instagram.no_posts', 'Aucune publication disponible pour l\'instant.') }}
      </div>

      
      <nav
        v-if="totalPages > 1"
        class="mt-10 flex items-center justify-center gap-1 flex-wrap"
        :aria-label="t('instagram.pagination_aria', 'Pagination publications Instagram')"
      >
        <NuxtLink
          v-if="currentPage > 1"
          :to="pageHref(currentPage - 1)"
          class="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-sm hover:border-primary-500 hover:text-primary-600"
        >← {{ t('paging.prev', 'Précédent') }}</NuxtLink>
        <template v-for="(p, i) in pageWindow" :key="i">
          <span
            v-if="p === '…'"
            class="px-3 py-1.5 text-sm text-slate-400"
          >…</span>
          <NuxtLink
            v-else
            :to="pageHref(p as number)"
            :class="[
              'px-3 py-1.5 rounded-md border text-sm transition-colors',
              (p as number) === currentPage
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary-500 hover:text-primary-600',
            ]"
          >{{ p }}</NuxtLink>
        </template>
        <NuxtLink
          v-if="currentPage < totalPages"
          :to="pageHref(currentPage + 1)"
          class="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-sm hover:border-primary-500 hover:text-primary-600"
        >{{ t('paging.next', 'Suivant') }} →</NuxtLink>
      </nav>
    </section>
  </main>
</template>
