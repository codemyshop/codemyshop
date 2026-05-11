
<template>
  <section class="relative py-20 lg:py-24 overflow-hidden bg-white dark:bg-slate-900">
    <div class="relative max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-baseline gap-3 mb-10">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white">{{ t('testimonials.heading') }}</h2>
        <span class="text-sm text-gray-500 dark:text-slate-400">{{ t('testimonials.subheading') }}</span>
      </div>
      <TestimonialCarousel />
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useT()
</script>
