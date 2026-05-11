
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')

useHead({
  title: t('dictionary.meta_title', `Dictionnaire — ${brandName}`),
  meta: [
    { name: 'description', content: t('dictionary.meta_description', `Glossaire ${brandName} — définitions professionnelles.`) },
  ],
})

const { data } = await useFetch('/api/dictionary')
const entries = computed(() => {
  const items = data.value?.entries ?? []
  return [...items].filter((e: any) => e.word).sort((a: any, b: any) => a.word.localeCompare(b.word, 'fr'))
})

const letters = computed(() => {
  const set = new Set(entries.value.filter((e: any) => e.word).map((e: any) => e.word[0].toUpperCase()))
  return [...set].sort()
})

function entriesByLetter(letter: string) {
  return entries.value.filter((e: any) => e.word && e.word[0].toUpperCase() === letter)
}
</script>

<template>
  <NuxtLayout name="white-label">

    
    <section class="relative pt-28 md:pt-36 pb-16 overflow-hidden bg-white dark:bg-[#0f172a]">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-500/6 dark:bg-primary-500/4 rounded-full blur-[140px]" />
      </div>

      <div class="relative max-w-4xl mx-auto px-6 text-center">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400 mb-4">
          {{ t('dictionary.hero_label', 'Référence') }}
        </p>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
          {{ t('dictionary.h1', `Dictionnaire ${brandName}`) }}
        </h1>
        <p class="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {{ t('dictionary.hero_subtitle', `Les définitions précises utilisées par ${brandName}. Standards du métier et concepts propriétaires.`) }}
        </p>
      </div>
    </section>

    
    <section class="pb-8 bg-white dark:bg-[#0f172a]">
      <div class="max-w-4xl mx-auto px-6">
        <div class="flex flex-wrap gap-2 justify-center">
          <a
            v-for="letter in letters"
            :key="letter"
            :href="'#' + letter"
            class="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-primary-100 dark:hover:bg-primary-500/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {{ letter }}
          </a>
        </div>
      </div>
    </section>

    
    <section class="pb-20 bg-white dark:bg-[#0f172a]">
      <div class="max-w-4xl mx-auto px-6">
        <div v-for="letter in letters" :key="letter" class="mb-12">
          <h2 :id="letter" class="text-3xl font-extrabold text-gray-200 dark:text-slate-800 mb-6 scroll-mt-24">
            {{ letter }}
          </h2>

          <div class="space-y-4">
            <NuxtLink
              v-for="entry in entriesByLetter(letter)"
              :key="entry.slug"
              :to="'/dictionnaire/' + entry.slug"
              class="block group rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-3 mb-1">
                    <h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {{ entry.word }}
                    </h3>
                    <span class="text-[10px] font-bold text-gray-400 dark:text-slate-400 italic">{{ entry.type }}</span>
                    <span
                      v-if="entry.category === 'proprietary'"
                      class="text-[8px] font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 px-1.5 py-0.5 rounded-full"
                    >
                      {{ t('dictionary.proprietary_badge', brandName) }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {{ entry.definition }}
                  </p>
                </div>
                <svg class="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-primary-400 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    
    <section class="py-16 bg-white dark:bg-[#0f172a]">
      <div class="max-w-2xl mx-auto px-6 text-center">
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('dictionary.cta_text', "Ces définitions sont utilisées dans les modules de l'Academy et les articles du blog.") }}
        </p>
        <a
          href="/academy"
          class="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-primary-600/20"
        >
          {{ t('dictionary.discover_academy', "Découvrir l'Academy") }}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </section>

  </NuxtLayout>
</template>
