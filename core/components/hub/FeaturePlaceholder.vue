
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ title }}</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
          En cours de dev
        </span>
      </div>
    </header>

    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-8 py-10">
          <div class="flex items-start gap-5">
            <div class="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/15 flex items-center justify-center text-3xl shrink-0">
              {{ icon }}
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-extrabold text-gray-900 dark:text-white">{{ pitch }}</h2>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-2 leading-relaxed">{{ description }}</p>
            </div>
          </div>

          <div v-if="benefits.length" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="b in benefits" :key="b" class="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
              <svg class="w-4 h-4 text-success-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{{ b }}</span>
            </div>
          </div>

          <div v-if="$slots.default" class="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
            <slot />
          </div>

          <div class="mt-8 flex items-center gap-3">
            <NuxtLink to="/hub/system/marketplace" class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18" />
              </svg>
              Voir dans la marketplace
            </NuxtLink>
            <a v-if="feedbackTo" :href="`mailto:${feedbackTo}?subject=Feature%20${encodeURIComponent(title)}`"
               class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              Proposer un cas d'usage →
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title:       string
  subtitle:    string
  icon:        string
  pitch:       string
  description: string
  benefits?:   string[]
  feedbackTo?: string
}>(), {
  benefits:   () => [],
  feedbackTo: 'contact@codemyshop.com',
})
</script>
