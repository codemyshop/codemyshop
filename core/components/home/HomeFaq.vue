<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <section class="py-16 bg-white dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="bg-gray-50 dark:bg-slate-800/50 rounded-2xl px-6 sm:px-10 py-12">
        <div class="mb-10">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">{{ t(faqConfig.title as any) ?? 'Questions Fréquentes' }}</h2>
          <p v-if="faqConfig.subtitle" class="text-sm text-gray-500 dark:text-slate-400">{{ t(faqConfig.subtitle as any) }}</p>
        </div>
        <FaqSection />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomepageFaq } from '~/types/theme'
defineProps<{ faqConfig: HomepageFaq }>()
const { t } = useI18nField()
</script>
