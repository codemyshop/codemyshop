
<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <div class="block sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 p-4 pb-safe">
    <a
      href="https://calendly.com/contact-alexandrecarette/30min"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-600/30 text-sm"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      {{ t('common.cta_book_call') }}
    </a>
  </div>
</template>
