<!--
  Grille produits paginée SSR pour les pages catégorie/silo (réutilisable
  multi-tenant). Pagination classique via ?page=N&limit=N&sort=X —
  JAMAIS d'infinite scroll (cf feedback_no_infinite_scroll_seo_pages).

  Toolbar au-dessus de la grille : tri + items par page.
  Pagination dupliquée (haut + bas) pour confort long scroll.

  Props :
    - endpoint, query, canonicalPath, canonicalBase, keyPrefix
    - limit?            : items par page défaut (24)
    - title?
    - defaultSort?      : clé de tri par défaut ('relevance')
    - interleaveEvery?  : N → insère le slot #interleave tous les N produits (0 = off)
    - interleaveOnTop?  : true → rend aussi le slot une fois entre la pagination haut et la grille

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { t } = useT()
interface ProductRow {
  id: number
  ref?: string
  ean13?: string
  name: string
  price: string
  priceRaw?: number
  image?: string
  url: string
  format?: string
  netWeight?: string
  packaging?: string
  caliber?: string
  totalWeightKg?: number
  pricePerKgFormatted?: string
}

type ViewMode = 'grid' | 'list'

interface PagedResponse {
  products: ProductRow[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

type SortKey =
  | 'relevance'
  | 'price-asc' | 'price-desc'
  | 'price-kg-asc' | 'price-kg-desc'
  | 'weight-asc' | 'weight-desc'
  | 'ref-asc' | 'ref-desc'
  | 'name-asc' | 'name-desc'
  | 'ean13-asc' | 'ean13-desc'

// i18n labels via t() — computed so language change re-renders.
const SORT_OPTIONS = computed<Array<{ value: SortKey; label: string }>>(() => [
  { value: 'relevance',     label: t('catalogue.sort_relevance') },
  { value: 'price-asc',     label: t('catalogue.sort_price_asc') },
  { value: 'price-desc',    label: t('catalogue.sort_price_desc') },
  { value: 'price-kg-asc',  label: t('catalogue.sort_price_kg_asc') },
  { value: 'price-kg-desc', label: t('catalogue.sort_price_kg_desc') },
  { value: 'weight-asc',    label: t('catalogue.sort_weight_asc') },
  { value: 'weight-desc',   label: t('catalogue.sort_weight_desc') },
])
const SORT_KEYS: SortKey[] = [
  'relevance',
  'price-asc', 'price-desc',
  'price-kg-asc', 'price-kg-desc',
  'weight-asc', 'weight-desc',
  'ref-asc', 'ref-desc',
  'name-asc', 'name-desc',
  'ean13-asc', 'ean13-desc',
]

/** Sortable columns from table header. */
type SortCol = 'ref' | 'name' | 'ean13' | 'weight' | 'price' | 'price-kg'

const PAGE_SIZES = [24, 48, 60, 100, 500, 1000] as const

const props = withDefaults(
  defineProps<{
    endpoint: string
    query: Record<string, string | number>
    canonicalPath: string
    canonicalBase: string
    keyPrefix: string
    limit?: number
    title?: string
    defaultSort?: SortKey
    interleaveEvery?: number
    interleaveOnTop?: boolean
  }>(),
  { limit: 24, title: '', defaultSort: 'relevance', interleaveEvery: 0, interleaveOnTop: false },
)

// Default title via i18n (catalogue.available_products) if prop empty.
const resolvedTitle = computed(() => props.title || t('catalogue.available_products'))

const route = useRoute()
const router = useRouter()

// Current view: URL ?view takes priority, else cookie (user preference), else 'grid'.
const viewCookie = useCookie<ViewMode>('ac_listing_view', {
  default: () => 'grid',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const currentView = computed<ViewMode>(() => {
  const raw = String(route.query.view ?? '') as ViewMode
  if (raw === 'grid' || raw === 'list') return raw
  return viewCookie.value
})

function setView(v: ViewMode) {
  viewCookie.value = v
  router.push({
    path: route.path,
    query: { ...buildQuery(currentPage.value), view: v === 'grid' ? undefined : v },
  })
}

/** Toggle sort on column header. Cycle asc → desc → relevance. */
function toggleColumnSort(col: SortCol) {
  const asc = `${col}-asc` as SortKey
  const desc = `${col}-desc` as SortKey
  let next: SortKey = asc
  if (currentSort.value === asc) next = desc
  else if (currentSort.value === desc) next = 'relevance'
  router.push({
    path: route.path,
    query: {
      ...buildQuery(1),
      sort: next === props.defaultSort ? undefined : next,
      page: undefined,
    },
  })
}

function sortIndicator(col: SortCol): string {
  if (currentSort.value === `${col}-asc`) return '↑'
  if (currentSort.value === `${col}-desc`) return '↓'
  return ''
}

const currentLimit = computed(() => {
  const raw = Number(route.query.limit)
  return PAGE_SIZES.includes(raw as any) ? raw : props.limit
})

const currentSort = computed<SortKey>(() => {
  const raw = String(route.query.sort ?? '') as SortKey
  return SORT_KEYS.includes(raw) ? raw : props.defaultSort
})

const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const offset = computed(() => (currentPage.value - 1) * currentLimit.value)

const { activeLang } = useRouteLang()
const fetchQuery = computed(() => ({
  ...props.query,
  offset: offset.value,
  limit: currentLimit.value,
  sort: currentSort.value,
  lang: activeLang.value,
}))

const { data, pending } = await useFetch<PagedResponse>(props.endpoint, {
  query: fetchQuery,
  watch: [fetchQuery],
})

// Preserve the last non-null response during client-side refetch,
// else the UI briefly switches to empty state (section unmounts, select
// disappears) when changing limit/sort. See feedback from 2024-04-19 regarding limit=1000.
const lastGoodData = ref<PagedResponse | null>(data.value)
watch(data, (v) => { if (v !== null && v !== undefined) lastGoodData.value = v })

const products = computed(() => lastGoodData.value?.products ?? [])
const total = computed(() => lastGoodData.value?.total ?? 0)

// Empty state context: distinguish "empty silo in DB" (indexing) from
// simple "filter/pagination that matches nothing" (temporary empty result).
const hasActiveFilters = computed(() =>
  !!(route.query.origin || route.query.allergens),
)
const isFilteredEmpty = computed(() => hasActiveFilters.value || currentPage.value > 1)
const totalPages = computed(() =>
  total.value > 0 ? Math.max(1, Math.ceil(total.value / currentLimit.value)) : 1,
)

/** Query-string preservant sort/limit/view, en mutant juste `page`. */
function buildQuery(page: number, extra: Partial<Record<string, string | number>> = {}): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (page > 1) q.page = page
  if (currentLimit.value !== props.limit) q.limit = currentLimit.value
  if (currentSort.value !== props.defaultSort) q.sort = currentSort.value
  if (currentView.value === 'list') q.view = 'list'
  for (const [k, v] of Object.entries(extra)) {
    if (v == null || v === '') delete q[k]
    else q[k] = v
  }
  return q
}

function pageHref(p: number): string {
  const base = props.canonicalPath.endsWith('/') ? props.canonicalPath : props.canonicalPath + '/'
  const q = buildQuery(p)
  if (p <= 1) delete q.page
  const qs = new URLSearchParams(q as Record<string, string>).toString()
  return qs ? `${base}?${qs}` : base
}

function onSortChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as SortKey
  router.push({ path: route.path, query: { ...buildQuery(1), sort: v === props.defaultSort ? undefined : v, page: undefined } })
}
function onLimitChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  router.push({ path: route.path, query: { ...buildQuery(1), limit: v === props.limit ? undefined : v, page: undefined } })
}

// SEO pagination — rel prev/next in <head>
useHead(() => {
  const links: Array<{ rel: string; href: string }> = []
  if (currentPage.value > 1) {
    const prev = currentPage.value - 1
    links.push({ rel: 'prev', href: `${props.canonicalBase}${pageHref(prev)}` })
  }
  if (currentPage.value < totalPages.value) {
    links.push({ rel: 'next', href: `${props.canonicalBase}${pageHref(currentPage.value + 1)}` })
  }
  return { link: links }
})

/** Derived items: products + #interleave slot insertions every N. */
type GridItem =
  | { kind: 'product'; product: ProductRow }
  | { kind: 'interleave'; index: number }

const interleavedItems = computed<GridItem[]>(() => {
  const every = Math.max(0, Math.floor(props.interleaveEvery))
  const out: GridItem[] = []
  let interleaveIdx = 0
  products.value.forEach((p, i) => {
    out.push({ kind: 'product', product: p })
    if (every > 0 && (i + 1) % every === 0 && i !== products.value.length - 1) {
      out.push({ kind: 'interleave', index: interleaveIdx++ })
    }
  })
  return out
})

const pageWindow = computed<Array<number | '…'>>(() => {
  const tp = totalPages.value
  const cp = currentPage.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const out: Array<number | '…'> = [1]
  if (cp > 3) out.push('…')
  for (let p = Math.max(2, cp - 1); p <= Math.min(tp - 1, cp + 1); p++) out.push(p)
  if (cp < tp - 2) out.push('…')
  out.push(tp)
  return out
})
</script>

<template>
  <div v-if="total > 0">
    <div class="mb-5 flex items-baseline justify-between">
      <h2 class="text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100">
        {{ resolvedTitle }}
      </h2>
      <p class="text-sm text-slate-500">
        {{ total }} {{ t(total > 1 ? 'catalogue.references_plural' : 'catalogue.references_singular') }}
        <span v-if="totalPages > 1">· {{ t('catalogue.page') }} {{ currentPage }} / {{ totalPages }}</span>
      </p>
    </div>

    <!-- Toolbar : tri + nb/page + toggle vue -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span>{{ t('catalogue.sort_by') }}</span>
        <select
          :value="currentSort"
          class="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          @change="onSortChange"
        >
          <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>

      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{{ t('catalogue.per_page') }}</span>
          <select
            :value="currentLimit"
            class="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @change="onLimitChange"
          >
            <option v-for="s in PAGE_SIZES" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>

        <!-- Toggle grille / liste -->
        <div class="flex items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            :aria-pressed="currentView === 'grid'"
            :class="[
              'flex h-8 w-9 items-center justify-center transition-colors',
              currentView === 'grid'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
            ]"
            :aria-label="t('catalogue.view_grid')"
            @click="setView('grid')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </button>
          <button
            type="button"
            :aria-pressed="currentView === 'list'"
            :class="[
              'flex h-8 w-9 items-center justify-center transition-colors',
              currentView === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
            ]"
            :aria-label="t('catalogue.view_list')"
            @click="setView('list')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination HAUT -->
    <CategoryPaginationNav
      class="mb-6"
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-window="pageWindow"
      :page-href="pageHref"
      :aria-label="t('catalogue.pagination_top')"
    />

    <!-- Appointment card in header (just after 1st pagination) -->
    <div v-if="interleaveOnTop" class="mb-6">
      <slot name="interleave" :index="-1" />
    </div>

    <!-- Grille produits -->
    <div
      v-if="currentView === 'grid'"
      :class="[
        'grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 transition-opacity',
        pending ? 'opacity-50 pointer-events-none' : '',
      ]"
    >
      <template v-for="item in interleavedItems" :key="item.kind === 'product' ? `p-${item.product.id}` : `int-${item.index}`">
        <ProductCard
          v-if="item.kind === 'product'"
          :product="item.product"
        />
        <div v-else class="col-span-2 sm:col-span-3 lg:col-span-4">
          <slot name="interleave" :index="item.index" />
        </div>
      </template>
    </div>

    <!-- Vue liste (prise de commande rapide) -->
    <div
      v-else
      :class="[
        'overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity dark:border-slate-800 dark:bg-slate-900',
        pending ? 'opacity-50 pointer-events-none' : '',
      ]"
    >
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th class="w-16 px-3 py-2.5 text-left font-medium">{{ t('catalogue.col_image') }}</th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-left font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('ref')"
            >{{ t('catalogue.col_ref') }} <span class="text-primary-600">{{ sortIndicator('ref') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-left font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('name')"
            >{{ t('catalogue.col_product') }} <span class="text-primary-600">{{ sortIndicator('name') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-left font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('ean13')"
            >{{ t('catalogue.col_ean13') }} <span class="text-primary-600">{{ sortIndicator('ean13') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-left font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('weight')"
              :title="t('catalogue.col_format_title')"
            >{{ t('catalogue.col_format') }} <span class="text-primary-600">{{ sortIndicator('weight') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-right font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('price')"
            >{{ t('catalogue.col_price_ht') }} <span class="text-primary-600">{{ sortIndicator('price') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-right font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('price-kg')"
            >{{ t('catalogue.col_price_kg') }} <span class="text-primary-600">{{ sortIndicator('price-kg') }}</span></th>
            <th
              class="cursor-pointer select-none px-3 py-2.5 text-right font-medium hover:text-primary-700 dark:hover:text-primary-400"
              @click="toggleColumnSort('weight')"
            >{{ t('catalogue.col_weight') }} <span class="text-primary-600">{{ sortIndicator('weight') }}</span></th>
            <th class="px-3 py-2.5 text-right font-medium">{{ t('catalogue.col_order') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in interleavedItems" :key="item.kind === 'product' ? `pr-${item.product.id}` : `intr-${item.index}`">
            <ProductListRow
              v-if="item.kind === 'product'"
              :product="item.product"
            />
            <tr v-else>
              <td colspan="9" class="p-3">
                <slot name="interleave" :index="item.index" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination BAS -->
    <CategoryPaginationNav
      class="mt-10"
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-window="pageWindow"
      :page-href="pageHref"
      :aria-label="t('catalogue.pagination_bottom')"
    />
  </div>

  <div v-else>
    <slot name="empty">
      <div
        class="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-6 text-sm text-primary-800 dark:border-primary-800/50 dark:bg-primary-900/20"
      >
        <template v-if="isFilteredEmpty">
          <p class="font-medium">{{ t('catalogue.empty_filtered_title') }}</p>
          <p class="mt-1">
            {{ t('catalogue.empty_filtered_body') }}
          </p>
        </template>
        <template v-else>
          <p class="font-medium">{{ t('catalogue.empty_indexing_title') }}</p>
          <p class="mt-1">
            {{ t('catalogue.empty_indexing_body') }}
          </p>
        </template>
      </div>
    </slot>
  </div>
</template>
