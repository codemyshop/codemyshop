
<script setup lang="ts">
interface FaqItem {
  position: number
  question: string
  answer_html: string
}

const props = defineProps<{
  items: FaqItem[]
  title?: string
}>()

const sorted = computed(() =>
  [...props.items].sort((a, b) => a.position - b.position),
)

const openIdx = ref<number>(-1)

function toggle(i: number) {
  openIdx.value = openIdx.value === i ? -1 : i
}

if (import.meta.dev && props.items.length > 0 && props.items.length < 15) {
  console.warn(
    `[CategoryFaq] Seulement ${props.items.length} Q/R — règle SEO minimum 15 (cf feedback_faq_15_questions_seo)`,
  )
}
</script>

<template>
  <div v-if="sorted.length > 0">
    <h2 class="mb-6 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100">
      {{ title || 'Questions fréquentes' }}
    </h2>

    <div class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      <div v-for="(item, i) in sorted" :key="item.position">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          :aria-expanded="openIdx === i"
          :aria-controls="`faq-answer-${i}`"
          @click="toggle(i)"
        >
          <span class="text-base font-semibold text-slate-900 dark:text-slate-100">
            {{ item.question }}
          </span>
          <svg
            class="h-5 w-5 flex-shrink-0 text-primary-700 transition-transform dark:text-primary-400"
            :class="{ 'rotate-180': openIdx === i }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div
          v-show="openIdx === i"
          :id="`faq-answer-${i}`"
          class="prose prose-primary prose-sm max-w-none px-5 pb-5 text-slate-700 dark:text-slate-300"
          v-html="item.answer_html"
        />
      </div>
    </div>
  </div>
</template>
