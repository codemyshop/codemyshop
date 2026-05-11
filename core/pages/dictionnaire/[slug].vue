
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const route = useRoute()
const slug = route.params.slug as string

const { data } = await useFetch(`/api/dictionary?slug=${slug}`)

if (!data.value || (data.value as any).error || !(data.value as any).slug) {
  throw createError({ statusCode: 404, statusMessage: 'Terme introuvable', fatal: true })
}

const entry = computed(() => data.value as any)

useHead({
  title: computed(() => entry.value ? `${entry.value.word} — ${t('dictionary.meta_title_short', `Dictionnaire ${brandName}`)}` : `Dictionnaire ${brandName}`),
  meta: [
    { name: 'description', content: computed(() => entry.value?.definition?.slice(0, 160) ?? '') },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => entry.value ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entry.value.word,
        description: entry.value.definition,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: `Dictionnaire ${brandName}`,
          url: `${psFrontUrl}/dictionnaire`,
        },
        ...(entry.value.datePublished ? { datePublished: entry.value.datePublished } : {}),
      }) : '{}'),
    },
  ],
})

const { data: allData } = await useFetch('/api/dictionary')
const allEntries = computed(() => allData.value?.entries ?? [])

function getRelated(slugs: string[]) {
  return allEntries.value.filter((e: any) => slugs.includes(e.slug))
}
</script>

<template>
  <NuxtLayout name="white-label">

    <section class="relative pt-28 md:pt-36 pb-20 bg-white dark:bg-[#0f172a]">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-500/6 dark:bg-primary-500/4 rounded-full blur-[140px]" />
      </div>

      <div class="relative max-w-3xl mx-auto px-6" v-if="entry">

        
        <nav class="mb-8">
          <ol class="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-400">
            <li><NuxtLink to="/dictionnaire" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{{ t('dictionary.breadcrumb', 'Dictionnaire') }}</NuxtLink></li>
            <li>/</li>
            <li class="text-gray-600 dark:text-slate-300 font-semibold">{{ entry.word }}</li>
          </ol>
        </nav>

        
        <div class="mb-10">
          <div class="flex items-center gap-3 flex-wrap mb-3">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {{ entry.word }}
            </h1>
            <span class="text-sm text-gray-400 dark:text-slate-400 italic">{{ entry.type }}</span>
            <span
              v-if="entry.category === 'proprietary'"
              class="text-[9px] font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 px-2 py-0.5 rounded-full"
            >
              {{ t('dictionary.proprietary_badge', brandName) }}
            </span>
          </div>
          <p v-if="entry.phonetic" class="text-sm text-gray-400 dark:text-slate-400 mb-4 font-mono">
            /{{ entry.phonetic }}/
          </p>
        </div>

        
        <div class="mb-8 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400 mb-2">{{ t('dictionary.origin_label', 'Origine') }}</p>
          <p class="text-sm text-gray-600 dark:text-slate-300 leading-relaxed italic">{{ entry.origin }}</p>
        </div>

        
        <div class="mb-8">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400 mb-3">{{ t('dictionary.definition_label', 'Définition') }}</p>
          <p class="text-base text-gray-700 dark:text-slate-200 leading-relaxed">{{ entry.definition }}</p>
        </div>

        
        <div v-if="entry.example" class="mb-8 border-l-3 border-primary-400 dark:border-primary-500 pl-5">
          <p class="text-sm text-gray-600 dark:text-slate-300 leading-relaxed italic">{{ entry.example }}</p>
        </div>

        
        <div v-if="entry.linkedArticles?.length" class="mb-8">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400 mb-3">{{ t('dictionary.linked_articles', 'Articles liés') }}</p>
          <div class="space-y-2">
            <NuxtLink
              v-for="article in entry.linkedArticles"
              :key="article.url"
              :to="article.url"
              class="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 px-4 py-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
            >
              <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <span class="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ article.title }}</span>
            </NuxtLink>
          </div>
        </div>

        
        <div v-if="entry.linkedModules?.length" class="mb-8">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400 mb-3">{{ t('dictionary.linked_modules', 'Cours Academy liés') }}</p>
          <div class="space-y-2">
            <NuxtLink
              v-for="mod in entry.linkedModules"
              :key="mod.slug"
              :to="'/academy/' + mod.slug"
              class="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 px-4 py-3 hover:border-accent-300 dark:hover:border-accent-600 transition-colors group"
            >
              <svg class="w-4 h-4 text-accent-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>
              <span class="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">{{ mod.title }}</span>
            </NuxtLink>
          </div>
        </div>

        
        <div v-if="entry.seeAlso?.length" class="mb-8">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400 mb-3">{{ t('dictionary.see_also', 'Voir aussi') }}</p>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="related in getRelated(entry.seeAlso)"
              :key="related.slug"
              :to="'/dictionnaire/' + related.slug"
              class="text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
            >
              {{ related.word }}
            </NuxtLink>
          </div>
        </div>

        
        <div class="mt-12 pt-6 border-t border-gray-100 dark:border-slate-800">
          <p class="text-[9px] text-gray-400 dark:text-slate-600">
            &copy; {{ new Date().getFullYear() }} {{ brandName }} — {{ t('dictionary.copyright_suffix', 'Dictionnaire professionnel.') }} {{ t('dictionary.published_on', 'Définition publiée le') }} {{ entry.datePublished }}.
          </p>
        </div>

      </div>

      
      <div v-else class="relative max-w-3xl mx-auto px-6 text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{{ t('dictionary.not_found', 'Terme introuvable') }}</h1>
        <NuxtLink to="/dictionnaire" class="text-primary-600 dark:text-primary-400 hover:underline">
          {{ t('dictionary.back', 'Retour au dictionnaire') }}
        </NuxtLink>
      </div>

    </section>

  </NuxtLayout>
</template>
