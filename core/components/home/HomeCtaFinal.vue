<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <section class="py-20 lg:py-24 bg-primary-600 dark:bg-primary-700 relative overflow-hidden">
    <!-- Decorative orb -->
    <div class="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
    <div class="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500/10 rounded-full blur-[80px]" />

    <div class="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
      <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-6">{{ t('ctafinal.heading') }}</h2>
      <p class="text-base sm:text-lg text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">
        {{ t('ctafinal.lede') }}
      </p>
      <a
        :href="available ? 'https://calendly.com/contact-alexandrecarette/30min' : undefined"
        :target="available ? '_blank' : undefined"
        :rel="available ? 'noopener noreferrer' : undefined"
        :class="available
          ? 'inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-lg shadow-primary-800/30 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer'
          : 'inline-flex items-center gap-2 px-8 py-4 bg-white/20 text-white/50 font-bold rounded-xl text-sm cursor-not-allowed'"
      >
        <svg v-if="available" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {{ available ? t('ctafinal.cta_book') : t('ctafinal.cta_full') }}
      </a>
      <p class="mt-4 text-xs text-white/50">{{ t('ctafinal.signature') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
const { available, remaining, maxClients } = useAvailability()
const { t } = useT()
</script>
