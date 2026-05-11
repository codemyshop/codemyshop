<script setup lang="ts">

interface SearchResult {
  id: number
  title: string
  slug: string
  category: string
  subcategory: string
  excerpt: string
  nuxtUrl: string
  datePublished: string
}

const { t } = useT()

const SUBCAT_KEYS = [
  'architecture', 'performance', 'developpement', 'automatisation',
  'referencement', 'flywheel', 'positionnement', 'docker',
  'intelligence-artificielle', 'cybersecurite',
] as const

const CAT_KEYS = ['prestashop', 'strategie', 'seo', 'devops', 'securite'] as const

const query = ref('')
const results = ref<SearchResult[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function doSearch(term: string) {
  if (term.length < 2) {
    results.value = []
    isOpen.value = false
    return
  }

  isLoading.value = true
  try {
    const data = await $fetch<SearchResult[]>('/api/blog/search', {
      query: { q: term },
    })
    results.value = data ?? []
    isOpen.value = results.value.length > 0 || term.length >= 2
  } catch {
    results.value = []
  } finally {
    isLoading.value = false
  }
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    doSearch(query.value.trim())
  }, 300)
}

function close() {
  isOpen.value = false
}

function clear() {
  query.value = ''
  results.value = []
  isOpen.value = false
  inputRef.value?.focus()
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function formatCategory(result: SearchResult): string {
  const catKey = (CAT_KEYS as readonly string[]).includes(result.category)
    ? `blog.categories.${result.category}` : null
  const subKey = (SUBCAT_KEYS as readonly string[]).includes(result.subcategory)
    ? `blog.subcategories.${result.subcategory}` : null
  const cat = catKey ? t(catKey) : result.category
  const sub = subKey ? t(subKey) : result.subcategory
  if (sub) return `${cat} > ${sub}`
  return cat
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full max-w-xl">
    
    <div class="relative">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg
          class="h-4.5 w-4.5 text-gray-500 dark:text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path stroke-linecap="round" d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        :placeholder="t('blog.search.placeholder')"
        autocomplete="off"
        class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-2.5 pl-11 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-primary-400 dark:focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
        @input="onInput"
        @focus="results.length && (isOpen = true)"
      />
      
      <button
        v-if="query"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        @click="clear"
        :aria-label="t('blog.search.clear_aria')"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
      >
        
        <div v-if="isLoading" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
          <svg class="mx-auto mb-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ t('blog.search.loading') }}
        </div>

        
        <ul v-else-if="results.length" class="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
          <li v-for="result in results" :key="result.id">
            <NuxtLink
              :to="result.nuxtUrl"
              class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              @click="close"
            >
              <p class="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-0.5">
                {{ formatCategory(result) }}
              </p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1">
                {{ result.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ result.excerpt.slice(0, 120) }}{{ result.excerpt.length > 120 ? '...' : '' }}
              </p>
            </NuxtLink>
          </li>
        </ul>

        
        <div v-else class="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
          {{ t('blog.search.empty', { query }) }}
        </div>
      </div>
    </Transition>
  </div>
</template>
