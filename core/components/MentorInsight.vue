<script setup lang="ts">

const props = defineProps<{
  name: string
  title: string
  quote: string
  quoteSource?: string
  domain: string
  academySlug: string
}>()

const academyLink = computed(() =>
  props.academySlug ? `/academy/${props.academySlug}` : '/academy',
)
</script>

<template>
  <aside class="mt-12 rounded-2xl border border-primary-100 dark:border-primary-800/50 bg-gradient-to-br from-primary-50/80 to-white dark:from-primary-950/30 dark:to-slate-900 overflow-hidden">
    <div class="px-6 py-5 sm:px-8 sm:py-6">
      
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            L'éclairage du mentor
          </p>
          <p class="text-sm text-gray-600 dark:text-slate-400">
            <span class="font-semibold text-gray-800 dark:text-white">{{ name }}</span>
            <span class="text-gray-400 dark:text-slate-400"> &mdash; </span>
            <span class="italic">{{ title }}</span>
          </p>
        </div>
      </div>

      
      <blockquote class="relative pl-4 border-l-2 border-primary-300 dark:border-primary-700 mb-4">
        <p class="text-gray-700 dark:text-slate-300 italic text-sm leading-relaxed">
          &laquo;&nbsp;{{ quote }}&nbsp;&raquo;
        </p>
        <footer v-if="quoteSource" class="mt-1 text-xs text-gray-400 dark:text-slate-400 not-italic">
          — {{ name }}, <cite>{{ quoteSource }}</cite>
        </footer>
      </blockquote>

      
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-gray-500 dark:text-slate-400">{{ domain }}</span>
        <NuxtLink
          :to="academyLink"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors group"
        >
          Approfondir dans l'Academy
          <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>
