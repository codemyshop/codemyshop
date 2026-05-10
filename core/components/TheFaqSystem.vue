<template>
  <section v-if="faqs.length" :class="sectionClass">
    <div :class="containerClass">

      <div v-if="showTitle" class="text-center mb-10">
        <span class="inline-block bg-primary-50 text-primary-700 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
          {{ badgeLabel }}
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">{{ title }}</h2>
      </div>

      <dl class="space-y-3">
        <div
          v-for="(faq, i) in faqs"
          :key="faq.id_faq ?? i"
          class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
        >
          <dt>
            <button
              @click="toggle(i)"
              type="button"
              class="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-gray-50 transition-colors group"
            >
              <span class="text-sm font-semibold text-gray-800 leading-snug group-hover:text-primary-700 transition-colors">
                {{ faq.question }}
              </span>
              <svg
                class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
                :class="open === i ? 'rotate-180 text-primary-600' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </dt>
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-screen"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 max-h-screen"
            leave-to-class="opacity-0 max-h-0"
          >
            <dd v-if="open === i" class="px-6 pb-5">
              <div class="w-full h-px bg-gray-100 mb-4" />
              <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{{ faq.answer }}</p>
            </dd>
          </Transition>
        </div>
      </dl>

    </div>
  </section>
</template>

<script setup lang="ts">
interface FaqItem {
  id_faq?:  number
  question: string
  answer:   string
}

const props = withDefaults(defineProps<{
  faqs:           FaqItem[]
  title?:         string
  badgeLabel?:    string
  showTitle?:     boolean
  sectionClass?:  string
  containerClass?: string
}>(), {
  title:          'Questions fréquentes',
  badgeLabel:     'FAQ',
  showTitle:      true,
  sectionClass:   'py-16 bg-gray-50',
  containerClass: 'max-w-3xl mx-auto px-6',
})

const open = ref<number | null>(null)

const toggle = (i: number) => {
  open.value = open.value === i ? null : i
}

// ── JSON-LD FAQPage ──────────────────────────────────────────────────────────
useHead(() => ({
  script: props.faqs.length
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type':    'FAQPage',
            mainEntity: props.faqs.map(f => ({
              '@type':        'Question',
              name:           f.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text:    f.answer,
              },
            })),
          }),
        },
      ]
    : [],
}))
</script>
