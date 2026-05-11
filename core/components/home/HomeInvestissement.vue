
<template>
  <section id="investissement" class="py-20 lg:py-24 bg-white dark:bg-slate-900 border-y border-gray-100 dark:border-slate-800">
    <div class="max-w-5xl mx-auto px-6">
      <div class="text-center mb-14">
        <span class="inline-block bg-primary-50 text-primary-700 dark:bg-primary-600/15 dark:text-primary-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">{{ t('investissement.kicker') }}</span>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{{ t('investissement.heading') }}</h2>
        <p class="max-w-2xl mx-auto text-gray-500 dark:text-slate-400 text-lg">{{ t('investissement.lede') }}</p>
      </div>
      <div class="grid md:grid-cols-2 gap-8">
        <NuxtLink to="/offre-starter" class="group relative rounded-2xl p-8 lg:p-10 border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-white/[0.03] shadow-sm text-left flex flex-col transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-500/40 hover:-translate-y-1">
          <div class="w-14 h-14 bg-rose-50 dark:bg-rose-500/15 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🚀</div>
          <h3 class="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">{{ t('investissement.starter_title') }}</h3>
          <p class="text-gray-500 dark:text-slate-400 text-sm leading-relaxed flex-1 mb-8">{{ t('investissement.starter_desc') }}</p>
          <span class="inline-flex items-center justify-center gap-2 bg-primary-600 group-hover:bg-primary-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm w-full">{{ t('investissement.starter_cta') }} <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></span>
        </NuxtLink>
        <NuxtLink to="/offre-premium" class="group relative rounded-2xl p-8 lg:p-10 border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-white/[0.03] shadow-sm text-left flex flex-col transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-500/40 hover:-translate-y-1">
          <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🏢</div>
          <h3 class="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">{{ t('investissement.premium_title') }}</h3>
          <p class="text-gray-500 dark:text-slate-400 text-sm leading-relaxed flex-1 mb-8">{{ t('investissement.premium_desc') }}</p>
          <span class="inline-flex items-center justify-center gap-2 bg-primary-600 group-hover:bg-primary-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm w-full">{{ t('investissement.premium_cta') }} <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useT()
</script>
