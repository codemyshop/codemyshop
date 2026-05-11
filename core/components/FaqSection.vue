<script setup lang="ts">

interface FaqItem { question: string; reponse: string }
const { config } = useClientDetection()
const faqData = computed<FaqItem[]>(() => ((config.value as any)?.faq as FaqItem[]) ?? [])

const openIndex = ref<number | null>(null)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <dl class="space-y-3">
      <div
        v-for="(item, i) in faqData"
        :key="i"
        class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
      >
        
        <dt>
          <button
            type="button"
            class="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            :aria-expanded="openIndex === i"
            @click="toggle(i)"
          >
            <span class="text-sm font-semibold text-gray-800">{{ item.question }}</span>
            
            <svg
              class="w-5 h-5 text-primary-500 shrink-0 transition-transform duration-300"
              :class="openIndex === i ? 'rotate-180' : ''"
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
          v-show="openIndex === i"
          class="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50"
        >
          <p class="pt-4">{{ item.reponse }}</p>
        </dd>
      </div>
    </dl>
  </div>
</template>
