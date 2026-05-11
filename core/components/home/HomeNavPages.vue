
<template>
  <section class="py-20 lg:py-24 bg-gray-50 dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      <div class="text-center mb-12">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-3">{{ t('navpages.heading') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400">{{ t('navpages.lede') }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <NuxtLink
          v-for="(page, i) in pages"
          :key="page.href"
          :to="page.href"
          class="group relative p-7 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
        >
          <div class="text-3xl mb-4">{{ page.emoji }}</div>
          <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ t(`navpages.page${i + 1}_title`) }}</h3>
          <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed flex-1 mb-4">{{ t(`navpages.page${i + 1}_desc`) }}</p>
          <span class="text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:underline">{{ t(`navpages.page${i + 1}_cta`) }} →</span>
        </NuxtLink>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useT()

const pages = [
  { emoji: '📜',  href: '/manifeste' },
  { emoji: '👦',  href: '/a-propos' },
  { emoji: '💰',  href: '/ambassadeur' },
  { emoji: '♾️', href: '/flywheel' },
]
</script>
