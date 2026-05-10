<!--
  Home FAQ (DB-driven) — Accordion multi-groupes avec JSON-LD FAQPage.

  Payload DB attendu (type='faq') :
  {
    "groups": [
      {
        "id": "wholesale",
        "title": { "fr": "Grossiste & commandes", "en": "Wholesale & orders" },
        "items": [
          { "q": { "fr": "...", "en": "..." }, "a": { "fr": "...", "en": "..." } }
        ]
      }
    ]
  }

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import type { I18nString } from '~/composables/useI18nField'

interface FaqItem {
  q: I18nString
  a: I18nString
}

interface FaqGroup {
  id?:    string
  title?: I18nString
  items:  FaqItem[]
}

interface FaqPayload {
  groups?: FaqGroup[]
}

const props = defineProps<{
  title?:    string | null
  subtitle?: string | null
  payload:   FaqPayload | null
}>()

const { t: i18nt } = useI18nField()

const groups = computed<FaqGroup[]>(() => props.payload?.groups ?? [])
const hasContent = computed(() => groups.value.some(g => (g.items?.length ?? 0) > 0))

const openKey = ref<string | null>(null)
function toggle(key: string) {
  openKey.value = openKey.value === key ? null : key
}

const flatItems = computed(() =>
  groups.value.flatMap(g => (g.items ?? []).map(it => ({
    question: i18nt(it.q),
    answer:   i18nt(it.a),
  }))).filter(i => i.question && i.answer),
)

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type':    'FAQPage',
  mainEntity: flatItems.value.map(i => ({
    '@type':          'Question',
    name:             i.question,
    acceptedAnswer:   { '@type': 'Answer', text: i.answer },
  })),
}))

useHead(() => (flatItems.value.length
  ? { script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd.value) }] }
  : {}))
</script>

<template>
  <section v-if="hasContent" class="py-16 bg-gray-50 dark:bg-slate-900/50">
    <div class="max-w-5xl mx-auto px-4 sm:px-6">
      <div v-if="title || subtitle" class="mb-10 text-center">
        <h2 v-if="title" class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">{{ title }}</h2>
        <p v-if="subtitle" class="mt-2 text-sm text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">{{ subtitle }}</p>
      </div>

      <div class="space-y-10">
        <div v-for="(group, gi) in groups" :key="group.id ?? gi">
          <h3 v-if="i18nt(group.title)" class="text-sm font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-4">
            {{ i18nt(group.title) }}
          </h3>

          <dl class="space-y-3">
            <div
              v-for="(item, i) in group.items"
              :key="`${gi}-${i}`"
              class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden"
            >
              <dt>
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  :aria-expanded="openKey === `${gi}-${i}`"
                  @click="toggle(`${gi}-${i}`)"
                >
                  <span class="text-sm font-semibold text-gray-800 dark:text-slate-100">{{ i18nt(item.q) }}</span>
                  <svg
                    class="w-5 h-5 text-primary-500 shrink-0 transition-transform duration-300"
                    :class="openKey === `${gi}-${i}` ? 'rotate-180' : ''"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </dt>
              <dd
                v-show="openKey === `${gi}-${i}`"
                class="px-6 pb-5 text-sm text-gray-600 dark:text-slate-300 leading-relaxed border-t border-gray-50 dark:border-slate-700"
              >
                <p class="pt-4 whitespace-pre-line">{{ i18nt(item.a) }}</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </section>
</template>
