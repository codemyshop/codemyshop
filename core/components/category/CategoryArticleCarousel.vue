
<script setup lang="ts">
const { localePath } = useLocalePath()
interface ArticleCard {
  id: number
  title: string
  slug: string
  excerpt: string
  url: string
  date_published: string | null
}

interface ArticlesResponse {
  articles: ArticleCard[]
  total: number
  limit: number
}

const props = withDefaults(
  defineProps<{
    endpoint: string
    query: Record<string, string | number>
    keyPrefix: string
    title?: string
  }>(),
  { title: 'Articles liés' },
)

const { activeLang } = useRouteLang()
const fetchQuery = computed(() => ({ ...props.query, lang: activeLang.value }))
const { data } = await useFetch<ArticlesResponse>(props.endpoint, {
  query: fetchQuery,
  key: () => `${props.keyPrefix}-${activeLang.value}`,
  watch: [fetchQuery],
})

const articles = computed(() => data.value?.articles ?? [])
</script>

<template>
  <div v-if="articles.length > 0">
    <h2 class="mb-6 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100">
      {{ title }}
    </h2>

    <div
      class="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0"
      style="scrollbar-width: thin;"
    >
      <NuxtLink
        v-for="article in articles"
        :key="article.id"
        :to="localePath(article.url)"
        class="group flex w-72 flex-shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-primary-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="aspect-[16/9] overflow-hidden bg-slate-50 dark:bg-slate-800">
          <div class="flex h-full w-full items-center justify-center text-slate-300">
            <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
        </div>

        <div class="flex flex-1 flex-col p-4">
          <h3 class="mb-2 line-clamp-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400">
            {{ article.title }}
          </h3>
          <p
            v-if="article.excerpt"
            class="line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-400"
          >
            {{ article.excerpt }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
