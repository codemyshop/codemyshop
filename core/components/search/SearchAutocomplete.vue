<script setup lang="ts">
/**
 *
 * Multi-entity autocomplete
 * Endpoint : /api/catalogue/suggest → { products, categories, cms, dictionary }
 * Produits via moteur natif PS (ps_search_index + ps_search_word),
 * Categories / CMS / dictionary via direct DB queries (useClientDbById).
 */

interface SuggestProduct {
  id: number
  name: string
  ref: string
  price: string
  priceRaw: number
  pricePerUnitFormatted?: string
  unitLabel?: string
  image?: string
}
interface SuggestCategory  { id: number; name: string; href: string }
interface SuggestCms       { id: number; title: string; href: string }
interface SuggestDictionary { slug: string; word: string; excerpt: string; href: string }

type SectionKey = 'products' | 'categories' | 'cms' | 'dictionary'
interface FlatItem {
  section: SectionKey
  href: string
  payload: SuggestProduct | SuggestCategory | SuggestCms | SuggestDictionary
}

const props = defineProps<{
  clientId: string
  placeholder?: string
  variant?: 'desktop' | 'mobile'
  inputClass?: string
}>()

const emit = defineEmits<{ (e: 'navigate'): void }>()

const { t } = useT()
const { activeLang } = useRouteLang()

const query      = ref('')
const products   = ref<SuggestProduct[]>([])
const categories = ref<SuggestCategory[]>([])
const cmsPages   = ref<SuggestCms[]>([])
const dictionary = ref<SuggestDictionary[]>([])
const isOpen     = ref(false)
const isLoading  = ref(false)
const activeIndex = ref(-1)

const containerRef = ref<HTMLElement | null>(null)
const inputRef     = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const listboxId = useId()
const inputId   = useId()

const flatItems = computed<FlatItem[]>(() => {
  const arr: FlatItem[] = []
  for (const p of products.value)   arr.push({ section: 'products',   href: `/produit/${p.id}`, payload: p })
  for (const c of categories.value) arr.push({ section: 'categories', href: c.href,             payload: c })
  for (const c of cmsPages.value)   arr.push({ section: 'cms',        href: c.href,             payload: c })
  for (const d of dictionary.value) arr.push({ section: 'dictionary', href: d.href,             payload: d })
  return arr
})

const totalResults = computed(() => flatItems.value.length)
const hasResults   = computed(() => totalResults.value > 0)

function flatIndexFor(section: SectionKey, i: number) {
  let offset = 0
  if (section === 'categories') offset = products.value.length
  else if (section === 'cms') offset = products.value.length + categories.value.length
  else if (section === 'dictionary') offset = products.value.length + categories.value.length + cmsPages.value.length
  return offset + i
}

async function doSearch(term: string) {
  if (term.length < 2) {
    products.value = []
    categories.value = []
    cmsPages.value = []
    dictionary.value = []
    isOpen.value = false
    activeIndex.value = -1
    return
  }

  isLoading.value = true
  isOpen.value = true
  try {
    const data = await $fetch<{
      products: SuggestProduct[]
      categories: SuggestCategory[]
      cms: SuggestCms[]
      dictionary: SuggestDictionary[]
    }>('/api/catalogue/suggest', {
      query: { q: term, clientId: props.clientId, limit: 12, lang: activeLang.value },
    })
    products.value   = data?.products   ?? []
    categories.value = data?.categories ?? []
    cmsPages.value   = data?.cms        ?? []
    dictionary.value = data?.dictionary ?? []
    activeIndex.value = -1
  } catch {
    products.value = []
    categories.value = []
    cmsPages.value = []
    dictionary.value = []
  } finally {
    isLoading.value = false
  }
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    doSearch(query.value.trim())
  }, 250)
}

function close() {
  isOpen.value = false
  activeIndex.value = -1
}

function clearQuery() {
  query.value = ''
  products.value = []
  categories.value = []
  cmsPages.value = []
  dictionary.value = []
  close()
  inputRef.value?.focus()
}

function submitFullSearch() {
  const q = query.value.trim()
  if (!q) return
  close()
  emit('navigate')
  navigateTo(`/recherche?q=${encodeURIComponent(q)}`)
}

function gotoItem(item: FlatItem) {
  close()
  emit('navigate')
  navigateTo(item.href)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (!isOpen.value || !hasResults.value) {
    if (e.key === 'Enter') submitFullSearch()
    return
  }
  const total = totalResults.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % total
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? total - 1 : activeIndex.value - 1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const active = flatItems.value[activeIndex.value]
    if (active) gotoItem(active)
    else submitFullSearch()
  }
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <form role="search" @submit.prevent="submitFullSearch">
      <div class="relative">
        <input
          :id="inputId"
          ref="inputRef"
          v-model="query"
          type="search"
          autocomplete="off"
          :placeholder="placeholder || t('search.placeholder')"
          role="combobox"
          :aria-expanded="isOpen"
          aria-autocomplete="list"
          :aria-controls="listboxId"
          :aria-activedescendant="activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined"
          :class="inputClass || 'w-full pl-4 pr-10 py-2 rounded-input border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition'"
          :aria-label="t('search.aria_search')"
          @input="onInput"
          @keydown="onKeydown"
          @focus="hasResults && (isOpen = true)"
        >
        <button
          v-if="query"
          type="button"
          class="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          :aria-label="t('search.aria_clear')"
          @click="clearQuery"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          type="submit"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
          :aria-label="t('search.aria_submit')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
          </svg>
        </button>
      </div>
    </form>

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
        class="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
      >
        <div v-if="isLoading" class="px-4 py-5 text-center text-sm text-gray-500 dark:text-slate-400">
          <svg class="mx-auto mb-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ t('search.loading') }}
        </div>

        <div
          v-else-if="hasResults"
          :id="listboxId"
          role="listbox"
          class="max-h-[32rem] overflow-y-auto"
        >
          <!-- ── Produits ────────────────────────────────────────── -->
          <div v-if="products.length" class="py-1">
            <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
              {{ t('search.section_products') }}
            </div>
            <div
              v-for="(p, i) in products"
              :id="`${listboxId}-opt-${flatIndexFor('products', i)}`"
              :key="`p-${p.id}`"
              role="option"
              :aria-selected="activeIndex === flatIndexFor('products', i)"
              :class="[
                'cursor-pointer transition-colors',
                activeIndex === flatIndexFor('products', i) ? 'bg-primary-50 dark:bg-slate-800/70' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50',
              ]"
              @mouseenter="activeIndex = flatIndexFor('products', i)"
              @click="gotoItem({ section: 'products', href: `/produit/${p.id}`, payload: p })"
            >
              <div class="flex items-center gap-3 px-3 py-2">
                <img
                  v-if="p.image"
                  :src="p.image"
                  :alt="p.name"
                  class="w-10 h-10 rounded object-cover shrink-0 bg-gray-100 dark:bg-slate-800"
                  loading="lazy"
                >
                <div v-else class="w-10 h-10 rounded bg-gray-100 dark:bg-slate-800 shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ p.name }}</p>
                  <p v-if="p.ref" class="text-[11px] text-gray-500 dark:text-slate-400 truncate">{{ t('common.item_ref', { ref: p.ref }) }}</p>
                </div>
                <!-- Hiérarchie alignée sur ProductCard (Aude 04/05 P2) :
                     prix HT/K en gros si dispo, prix colis en sous-ligne. -->
                <div class="text-right shrink-0 tabular-nums">
                  <template v-if="p.pricePerUnitFormatted">
                    <span class="block text-sm font-bold text-primary-700 dark:text-primary-400">
                      {{ p.pricePerUnitFormatted }}
                      <span class="text-[11px] font-semibold">{{ p.unitLabel || 'HT/K' }}</span>
                    </span>
                    <span class="block text-[10px] text-gray-500 dark:text-slate-400">
                      {{ p.price }} {{ t('common.price_ht_suffix') }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="block text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {{ p.price }}
                      <span class="text-[10px] font-normal text-gray-400">{{ t('common.price_ht_suffix') }}</span>
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Catégories ─────────────────────────────────────── -->
          <div v-if="categories.length" class="py-1 border-t border-gray-100 dark:border-slate-800">
            <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
              {{ t('search.section_categories') }}
            </div>
            <div
              v-for="(c, i) in categories"
              :id="`${listboxId}-opt-${flatIndexFor('categories', i)}`"
              :key="`c-${c.id}`"
              role="option"
              :aria-selected="activeIndex === flatIndexFor('categories', i)"
              :class="[
                'cursor-pointer transition-colors',
                activeIndex === flatIndexFor('categories', i) ? 'bg-primary-50 dark:bg-slate-800/70' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50',
              ]"
              @mouseenter="activeIndex = flatIndexFor('categories', i)"
              @click="gotoItem({ section: 'categories', href: c.href, payload: c })"
            >
              <div class="flex items-center gap-3 px-3 py-2">
                <span class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-slate-800 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                  </svg>
                </span>
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ c.name }}</span>
              </div>
            </div>
          </div>

          <!-- ── Dictionnaire (moat food) ───────────────────────── -->
          <div v-if="dictionary.length" class="py-1 border-t border-gray-100 dark:border-slate-800">
            <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
              {{ t('search.section_dictionary') }}
            </div>
            <div
              v-for="(d, i) in dictionary"
              :id="`${listboxId}-opt-${flatIndexFor('dictionary', i)}`"
              :key="`d-${d.slug}`"
              role="option"
              :aria-selected="activeIndex === flatIndexFor('dictionary', i)"
              :class="[
                'cursor-pointer transition-colors',
                activeIndex === flatIndexFor('dictionary', i) ? 'bg-primary-50 dark:bg-slate-800/70' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50',
              ]"
              @mouseenter="activeIndex = flatIndexFor('dictionary', i)"
              @click="gotoItem({ section: 'dictionary', href: d.href, payload: d })"
            >
              <div class="flex items-start gap-3 px-3 py-2">
                <span class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ d.word }}</p>
                  <p v-if="d.excerpt" class="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-snug">{{ d.excerpt }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Pages CMS ──────────────────────────────────────── -->
          <div v-if="cmsPages.length" class="py-1 border-t border-gray-100 dark:border-slate-800">
            <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50">
              {{ t('search.section_pages') }}
            </div>
            <div
              v-for="(c, i) in cmsPages"
              :id="`${listboxId}-opt-${flatIndexFor('cms', i)}`"
              :key="`cms-${c.id}`"
              role="option"
              :aria-selected="activeIndex === flatIndexFor('cms', i)"
              :class="[
                'cursor-pointer transition-colors',
                activeIndex === flatIndexFor('cms', i) ? 'bg-primary-50 dark:bg-slate-800/70' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50',
              ]"
              @mouseenter="activeIndex = flatIndexFor('cms', i)"
              @click="gotoItem({ section: 'cms', href: c.href, payload: c })"
            >
              <div class="flex items-center gap-3 px-3 py-2">
                <span class="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </span>
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ c.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="query.length >= 2" class="px-4 py-5 text-center text-sm text-gray-500 dark:text-slate-400">
          {{ t('search.empty', { query }) }}
        </div>

        <button
          v-if="hasResults && query.trim()"
          type="button"
          class="w-full px-4 py-2.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 border-t border-gray-100 dark:border-slate-800 text-left transition-colors"
          @click="submitFullSearch"
        >
          {{ t('search.view_all', { query }) }}
        </button>
      </div>
    </Transition>
  </div>
</template>
