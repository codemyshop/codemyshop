
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <span class="text-3xl">{{ icon }}</span>
        <div>
          <h1 class="text-lg font-bold">{{ title }}</h1>
          <p class="text-xs text-gray-500 mt-0.5">{{ subtitle }}</p>
        </div>
      </div>
    </header>
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold mb-4">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 2"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
          En préparation · Spec figée
        </div>
        <h2 class="text-2xl font-extrabold mb-3">{{ title }}</h2>
        <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{{ description }}</p>

        <div v-if="bullets?.length" class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          <div v-for="b in bullets" :key="b" class="flex items-start gap-2 text-sm">
            <svg class="w-4 h-4 mt-0.5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/>
            </svg>
            <span class="text-gray-700 dark:text-slate-300">{{ b }}</span>
          </div>
        </div>

        <p class="text-xs text-gray-400 mt-8 border-t border-gray-100 dark:border-slate-800 pt-4">
          Spec technique &rsaquo;&nbsp;<code class="text-primary-600">documentation/VERTICAL_AGROALIMENTAIRE_SPECS.md</code>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon:        string
  title:       string
  subtitle:    string
  description: string
  bullets?:    string[]
}
defineProps<Props>()
</script>
