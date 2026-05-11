
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { menuItems } = useMegamenu()
const { showPrices } = useB2bVisibility()
const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')

const rawSegments = computed<string[]>(() => {
  const raw = route.params.path
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  return arr.filter(Boolean) as string[]
})

const piliersList = ((_cfg.public as any).piliers ?? []) as string[]
const piliersSlugs = piliersList.map((p) => (p.split(':', 1)[0] || p))
const isPilierRoute = computed(() => {
  const first = rawSegments.value[0]
  return !!first && piliersSlugs.includes(first)
})
const activePilier = computed(() => (isPilierRoute.value ? rawSegments.value[0] : ''))
const pilierSubSegments = computed(() => (isPilierRoute.value ? rawSegments.value.slice(1) : []))

const { addToCart, totalItems } = useServerCart(clientId)
const { open: openCartDrawer } = useCartDrawer()

const { addToQuote, totalItems: quoteTotalItems } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()

const quantities = ref<Record<number, number>>({})
function getQty(id: number) { return quantities.value[id] ?? 1 }
function setQty(id: number, v: number) { quantities.value = { ...quantities.value, [id]: Math.max(1, v) } }

async function quickAdd(product: any) {
  await addToCart({ id: product.id, name: product.name, price: product.price, priceRaw: product.priceRaw, image: product.image, ref: product.ref }, getQty(product.id))
  openCartDrawer()
}
function quickQuote(product: any) {
  addToQuote({ id: product.id, name: product.name, reference: product.ref, image: product.image }, getQty(product.id))
  openQuoteDrawer()
}

const slug = computed(() => {
  const parts = route.params.path
  const arr = Array.isArray(parts) ? parts : (parts ? [parts] : [])
  
  return arr.filter(Boolean).join('/')
})

function findPsId(menuList: any[], targetSlug: string): number | null {
  for (const item of menuList) {
    if (item.megaMenu) {
      for (const col of item.megaMenu) {
        const links = col.links ?? []
        for (const link of links) {
          const psId = link.psCategoryId ?? link.psId
          if (link.href?.includes(targetSlug) && psId) return psId
        }
      }
    }
  }
  return null
}

const { activeLang } = useRouteLang()
const { data: allCategories } = await useFetch('/api/catalogue/categories', {
  query: { clientId, limit: 200, lang: activeLang },
  watch: [activeLang],
})

const lastSeg = computed(() => (slug.value.split('/').pop() ?? '').toLowerCase())
const { data: directCategory } = await useFetch('/api/catalogue/category-by-slug', {
  query: computed(() => ({ slug: lastSeg.value, clientId, lang: activeLang.value })),
  watch: [lastSeg, activeLang],
})

const psId = computed(() => {
  const items = menuItems.value
  const fromMenu = findPsId(items, slug.value) ?? findPsId(items, lastSeg.value)
  if (fromMenu) return fromMenu
  return (directCategory.value as any)?.id ?? null
})

const isCmsCandidate = computed(() => {
  const segments = slug.value.split('/').filter(Boolean)
  return segments.length === 1 && /^[a-z0-9][a-z0-9-]*$/.test(segments[0])
})
const { data: cmsPageData } = isCmsCandidate.value
  ? await useFetch(`/api/catalogue/cms/by-slug/${lastSeg.value}`, {
      query: { clientId, lang: activeLang },
      key: () => `cms-slug-${lastSeg.value}-${activeLang.value}`,
      watch: [lastSeg, activeLang],
    })
  : { data: ref(null) }
const { data: footerData } = isCmsCandidate.value
  ? await useFetch('/api/footer-config', {
      query: { lang: activeLang },
      key: () => `footer-config-${activeLang.value}`,
      watch: [activeLang],
    })
  : { data: ref(null) }

const cmsPage = computed<any>(() => {
  
  if (!isCmsCandidate.value) return null
  if (psId.value) return null
  const raw = cmsPageData.value as any
  if (!raw || raw.error || !raw.title) return null
  return raw
})
const cmsContact = computed(() => (footerData.value as any)?.footer?.contact ?? null)
const cmsCanonicalUrl = computed(() => {
  const base = String((_cfg.public as any).psFrontUrl ?? '')
  return `${base}${route.path}`
})

if (!psId.value && isCmsCandidate.value && cmsPageData.value !== null && !cmsPage.value) {
  
  throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true })
}

const category = computed(() => {
  if (!psId.value) return null
  const cats = Array.isArray(allCategories.value) ? allCategories.value : (allCategories.value as any)?.categories ?? allCategories.value ?? []
  const fromAll = cats.find((c: any) => c.id === psId.value)
  return fromAll ?? (directCategory.value as any) ?? null
})

const subcategories = computed(() => {
  if (!psId.value) return []
  const cats = Array.isArray(allCategories.value) ? allCategories.value : (allCategories.value as any)?.categories ?? allCategories.value ?? []
  return cats.filter((c: any) => c.id_parent === psId.value)
})

const sortBy = ref<string>((route.query.sort as string) || 'name_asc')
const priceMin = ref<number>(Number(route.query.priceMin) || 0)
const priceMax = ref<number>(Number(route.query.priceMax) || 10000)
const currentPage = ref<number>(Number(route.query.page) || 1)
const showMobileFilters = ref(false)

const selectedFeatures = ref<Record<number, number[]>>({})

function parseFParam(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of raw.split('|')) {
    const [fIdStr, valsStr] = block.split(':')
    const fId = Number(fIdStr)
    if (!fId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[fId] = vals
  }
  return out
}
function serializeFParam(features: Record<number, number[]>): string {
  return Object.entries(features)
    .filter(([, vs]) => vs.length)
    .map(([fId, vs]) => `${fId}:${vs.join(',')}`)
    .join('|')
}
selectedFeatures.value = parseFParam(route.query.f as string)

function syncUrl() {
  const q: Record<string, any> = { ...route.query }
  if (sortBy.value && sortBy.value !== 'name_asc') q.sort = sortBy.value
  else delete q.sort
  if (priceMin.value > 0) q.priceMin = priceMin.value
  else delete q.priceMin
  if (priceMax.value < 10000) q.priceMax = priceMax.value
  else delete q.priceMax
  if (currentPage.value > 1) q.page = currentPage.value
  else delete q.page
  const fSerial = serializeFParam(selectedFeatures.value)
  if (fSerial) q.f = fSerial
  else delete q.f
  router.replace({ query: q })
}

const perPage = 24
const listKey = computed(() => `${psId.value}-${sortBy.value}-${priceMin.value}-${priceMax.value}-${currentPage.value}-${serializeFParam(selectedFeatures.value)}`)

const { data: listData, pending: loadingProducts } = useLazyFetch(() => `/api/catalogue/${psId.value}/list`, {
  query: computed(() => ({
    clientId,
    page: currentPage.value,
    limit: perPage,
    sort: sortBy.value,
    ...(priceMin.value > 0 ? { priceMin: priceMin.value } : {}),
    ...(priceMax.value < 10000 ? { priceMax: priceMax.value } : {}),
    ...(serializeFParam(selectedFeatures.value) ? { f: serializeFParam(selectedFeatures.value) } : {}),
  })),
  watch: [psId, listKey],
  immediate: !!psId.value,
  server: false,
})

const products = computed(() => (listData.value as any)?.products ?? [])
const total = computed(() => (listData.value as any)?.total ?? 0)
const filters = computed<Array<{ id: number; name: string; values: Array<{ id: number; name: string; count: number }> }>>(() => ((listData.value as any)?.filters ?? []).filter((f: any) => !/prix/i.test(f.name)))

const totalPages = computed(() => Math.ceil(total.value / perPage) || 1)

function toggleFeatureValue(fId: number, vId: number) {
  const current = selectedFeatures.value[fId] || []
  if (current.includes(vId)) {
    const next = current.filter(v => v !== vId)
    if (next.length) selectedFeatures.value = { ...selectedFeatures.value, [fId]: next }
    else {
      const { [fId]: _, ...rest } = selectedFeatures.value
      selectedFeatures.value = rest
    }
  } else {
    selectedFeatures.value = { ...selectedFeatures.value, [fId]: [...current, vId] }
  }
  currentPage.value = 1
}

function isFeatureValueSelected(fId: number, vId: number): boolean {
  return (selectedFeatures.value[fId] || []).includes(vId)
}

function resetFilters() {
  selectedFeatures.value = {}
  priceMin.value = 0
  priceMax.value = 10000
  currentPage.value = 1
}

const hasActiveFilters = computed(() =>
  Object.keys(selectedFeatures.value).length > 0 || priceMin.value > 0 || priceMax.value < 10000
)

watch([sortBy, priceMin, priceMax, selectedFeatures, currentPage], () => {
  syncUrl()
}, { deep: true })

watch([sortBy, priceMin, priceMax], () => { currentPage.value = 1 })

const collapsed = ref<Record<number, boolean>>({})
function toggleSection(fId: number) { collapsed.value = { ...collapsed.value, [fId]: !collapsed.value[fId] } }

function findSlugForPsId(id: number): string {
  const items = menuItems.value
  for (const item of items) {
    if (item.megaMenu) {
      for (const col of item.megaMenu) {
        for (const link of (col.links ?? [])) {
          if ((link.psCategoryId ?? link.psId) === id) return link.href
        }
      }
    }
  }
  return `/catalogue/${id}`
}

useCategoryBodyId(() => psId.value ?? null)

const brandName = computed(() => (_cfg.public as any).brandName || 'Catalogue')
const siteUrl = computed(() => (_cfg.public as any).psFrontUrl || '')

useHead({
  title: computed(() => category.value ? `${category.value.name} — ${brandName.value}` : `Catalogue — ${brandName.value}`),
  meta: [
    { name: 'description', content: computed(() => category.value?.meta_description || category.value?.description?.slice(0, 160) || '') },
  ],
  
  
  
  
  
  script: computed(() => {
    if (isPilierRoute.value || !category.value || total.value <= 0) return []
    return [{
      key: 'jsonld-collectionpage',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.value.name,
        description: category.value.meta_description || category.value.description,
        url: `${siteUrl.value}/${slug.value}`,
        numberOfItems: total.value,
        isPartOf: { '@type': 'WebSite', name: brandName.value, url: siteUrl.value },
      }),
    }]
  }),
})
</script>

<template>
  
  <CategoryPage
    v-if="isPilierRoute"
    :pilier="activePilier"
    :initial-segments="pilierSubSegments"
  />

  <NuxtLayout v-else name="white-label">
    
    <CmsPage
      v-if="cmsPage"
      :page="cmsPage"
      :contact="cmsContact"
      :canonical-url="cmsCanonicalUrl"
      :active-lang="activeLang"
    />

    
    <div v-else class="min-h-screen bg-white">

      
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <NuxtLink to="/" class="hover:text-primary-600">{{ t('catalogue.breadcrumb_home') }}</NuxtLink>
            <span>/</span>
            <span class="text-gray-700 font-medium">{{ category?.name ?? 'Catalogue' }}</span>
          </nav>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        
        <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ category?.name ?? 'Catalogue' }}</h1>

        
        <div v-if="subcategories.length" class="mb-10">
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-for="sub in subcategories"
              :key="sub.id"
              :to="findSlugForPsId(sub.id)"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-primary-600 hover:text-primary-600 transition-colors"
            >
              {{ sub.name }}
            </NuxtLink>
          </div>
        </div>

        
        <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

          
          <aside class="hidden lg:block">
            <div class="sticky top-24 space-y-6">

              
              <div v-if="hasActiveFilters" class="flex items-center justify-between">
                <span class="text-xs text-gray-500">{{ t('catalogue.filters_active') }}</span>
                <button class="text-xs font-medium text-primary-600 hover:underline" @click="resetFilters">{{ t('catalogue.filters_clear_all') }}</button>
              </div>

              
              <section v-for="feat in filters" :key="feat.id" class="border-b border-gray-100 pb-5">
                <button
                  class="flex items-center justify-between w-full mb-3 text-left"
                  @click="toggleSection(feat.id)"
                >
                  <h3 class="text-[11px] font-semibold text-gray-900 uppercase tracking-widest">{{ feat.name }}</h3>
                  <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="{ '-rotate-90': collapsed[feat.id] }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <ul v-show="!collapsed[feat.id]" class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  <li v-for="val in feat.values" :key="val.id">
                    <label class="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        :checked="isFeatureValueSelected(feat.id, val.id)"
                        class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-1 focus:ring-primary-600 focus:ring-offset-0"
                        @change="toggleFeatureValue(feat.id, val.id)"
                      />
                      <span class="text-xs text-gray-600 group-hover:text-gray-900 flex-1">{{ val.name }}</span>
                      <span class="text-[10px] text-gray-400 tabular-nums">{{ val.count }}</span>
                    </label>
                  </li>
                </ul>
              </section>

            </div>
          </aside>

          
          <div>
            
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p class="text-sm text-gray-500">{{ total }} produit{{ total > 1 ? 's' : '' }}</p>
              <div class="flex items-center gap-3">
                <button
                  class="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-primary-600 transition-colors"
                  @click="showMobileFilters = true"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
                  {{ t('catalogue.filters') }}
                  <span v-if="hasActiveFilters" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-[10px] rounded-full">{{ Object.keys(selectedFeatures).length }}</span>
                </button>
                <select v-model="sortBy" class="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:border-primary-600 focus:outline-none">
                  <option value="name_asc">{{ t('catalogue.sort_name_asc') }}</option>
                  <option value="name_desc">{{ t('catalogue.sort_name_desc') }}</option>
                  <option value="price_asc">{{ t('catalogue.sort_price_asc') }}</option>
                  <option value="price_desc">{{ t('catalogue.sort_price_desc') }}</option>
                </select>
              </div>
            </div>

            
            <div v-if="loadingProducts" class="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div v-for="i in 6" :key="i" class="rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div class="aspect-square bg-gray-100" />
                <div class="p-4 space-y-2">
                  <div class="h-4 bg-gray-100 rounded w-3/4" />
                  <div class="h-3 bg-gray-100 rounded w-1/2" />
                  <div class="h-5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>

            
            <div v-else-if="products.length" class="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <NuxtLink
                v-for="product in products"
                :key="product.id"
                :to="product.url || `/produit/${product.id}`"
                class="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-600/30 transition-all"
              >
                <div class="aspect-square bg-gray-50 overflow-hidden">
                  <img
                    v-if="product.image"
                    :src="product.image"
                    :alt="product.name"
                    class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                    <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                </div>
                <div class="p-4">
                  <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">{{ product.name }}</h3>
                  <p v-if="product.ref" class="text-[10px] text-gray-400 mb-2">{{ t('catalogue.label_ref') }} {{ product.ref }}</p>
                  <p v-if="product.description_short" class="text-xs text-gray-500 line-clamp-2 mb-2">{{ product.description_short }}</p>
                  <ClientOnly>
                    <p v-if="showPrices" class="text-base font-bold text-primary-600 mt-2">{{ product.price }} <span class="text-xs font-normal text-gray-400">{{ t('catalogue.label_ht') }}</span></p>
                    <p v-else class="text-xs text-gray-400 italic mt-2">{{ t('catalogue.price_on_quote') }}</p>
                    <template #fallback>
                      <div class="h-5 w-20 rounded bg-slate-100 animate-pulse mt-2" />
                    </template>
                  </ClientOnly>
                  <div class="flex items-center gap-2 mt-2" @click.stop @click.prevent>
                    <div class="flex items-center border border-gray-200 rounded-md">
                      <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs" @click="setQty(product.id, getQty(product.id) - 1)">−</button>
                      <span class="w-6 h-6 flex items-center justify-center text-[11px] font-semibold">{{ getQty(product.id) }}</span>
                      <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs" @click="setQty(product.id, getQty(product.id) + 1)">+</button>
                    </div>
                    <ClientOnly>
                      <button
                        v-if="showPrices"
                        class="flex-1 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                        @click="quickAdd(product)"
                      >{{ t('catalogue.add_to_cart') }}</button>
                      <button
                        v-else
                        class="flex-1 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                        @click="quickQuote(product)"
                      >{{ t('catalogue.add_to_quote') }}</button>
                      <template #fallback>
                        <div class="flex-1 h-7 rounded-lg bg-slate-100 animate-pulse" />
                      </template>
                    </ClientOnly>
                  </div>
                </div>
              </NuxtLink>
            </div>

            
            <div v-else class="text-center py-20 border border-dashed border-gray-200 rounded-xl">
              <p class="text-gray-400 text-sm mb-4">{{ t('catalogue.catalogue_empty') }}</p>
              <button v-if="hasActiveFilters" class="text-xs font-medium text-primary-600 hover:underline" @click="resetFilters">{{ t('catalogue.reset_filters') }}</button>
            </div>

            
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-10">
              <button
                :disabled="currentPage <= 1"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-30 hover:border-primary-600 transition-colors"
                @click="currentPage--"
              >←</button>
              <button
                v-for="p in totalPages"
                :key="p"
                class="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                :class="p === currentPage ? 'bg-primary-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-primary-600'"
                @click="currentPage = p"
              >{{ p }}</button>
              <button
                :disabled="currentPage >= totalPages"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-30 hover:border-primary-600 transition-colors"
                @click="currentPage++"
              >→</button>
            </div>
          </div>
        </div>

        
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="showMobileFilters" class="fixed inset-0 z-50 lg:hidden">
              <div class="absolute inset-0 bg-black/40" @click="showMobileFilters = false" />
              <div class="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-xl flex flex-col">
                <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 class="text-sm font-semibold text-gray-900">{{ t('catalogue.filters') }}</h2>
                  <button class="p-1 text-gray-400 hover:text-gray-600" @click="showMobileFilters = false">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                  <section v-for="feat in filters" :key="feat.id" class="border-b border-gray-100 pb-5">
                    <h3 class="text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-3">{{ feat.name }}</h3>
                    <ul class="space-y-1.5">
                      <li v-for="val in feat.values" :key="val.id">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            :checked="isFeatureValueSelected(feat.id, val.id)"
                            class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-1 focus:ring-primary-600"
                            @change="toggleFeatureValue(feat.id, val.id)"
                          />
                          <span class="text-xs text-gray-600 flex-1">{{ val.name }}</span>
                          <span class="text-[10px] text-gray-400 tabular-nums">{{ val.count }}</span>
                        </label>
                      </li>
                    </ul>
                  </section>
                </div>
                <div class="border-t border-gray-100 px-5 py-3 flex items-center gap-3">
                  <button class="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600" @click="resetFilters">{{ t('catalogue.filters_clear_all') }}</button>
                  <button class="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-xs font-semibold" @click="showMobileFilters = false">Voir {{ total }}</button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        
        <ClientOnly>
          
          <div v-if="showPrices && totalItems > 0" class="fixed bottom-6 right-6 z-40">
            <NuxtLink
              to="/panier"
              class="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white font-semibold rounded-full shadow-lg hover:bg-primary-700 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
              {{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }}
            </NuxtLink>
          </div>
          
          
        </ClientOnly>

      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
