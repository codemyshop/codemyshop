<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <section class="relative py-20 lg:py-24 bg-white dark:bg-slate-900">
    <div class="relative max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-slate-100">{{ t(blogConfig.title as any) ?? 'Derniers articles' }}</h2>
        <NuxtLink to="/blog" class="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">Voir tout →</NuxtLink>
      </div>

      <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
          <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
          <div class="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-full mb-2" />
          <div class="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-5/6" />
        </div>
      </div>

      <div v-else-if="articles?.length" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          v-for="article in articles"
          :key="article.id"
          :to="article.nuxtUrl"
          class="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md hover:border-primary-200 dark:hover:border-primary-600/40 transition-all duration-200"
        >
          <div v-if="article.thumbnailImage || article.coverImage" class="aspect-[600/315] overflow-hidden bg-gray-100 dark:bg-slate-700">
            <NuxtImg
              :src="article.thumbnailImage || article.coverImage"
              :alt="article.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy" width="600" height="315"
              sizes="100vw sm:50vw lg:33vw"
              preset="blogCover"
            />
          </div>
          <div class="p-6 flex flex-col flex-1">
            <span class="inline-block text-xs font-semibold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-600/15 rounded-full px-3 py-1 mb-4 w-fit">Blog</span>
            <h3 class="text-base font-bold text-gray-800 dark:text-slate-100 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-snug">{{ article.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed flex-1">{{ article.excerpt }}</p>
            <time v-if="article.datePublished" :datetime="article.datePublished" class="block mt-3 text-xs text-gray-500 dark:text-slate-400">{{ formatDate(article.datePublished) }}</time>
            <span class="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline">Lire l'article →</span>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-12"><p class="text-gray-500 dark:text-slate-400 text-sm mb-2">Les premiers articles arrivent bientôt.</p><p class="text-xs text-gray-500 dark:text-slate-400">PrestaShop Headless, SEO technique, IA e-commerce, architecture Docker — des guides actionables pour scaler votre boutique.</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomepageBlog } from '~/types/theme'

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const props = defineProps<{ blogConfig: HomepageBlog }>()
const { t } = useI18nField()

const { activeLang } = useRouteLang()
const { data: articles, status } = await useFetch('/api/cms', {
  query: { limit: props.blogConfig.limit ?? 3, lang: activeLang },
  watch: [activeLang],
  lazy: true,
  server: false,
})
</script>
