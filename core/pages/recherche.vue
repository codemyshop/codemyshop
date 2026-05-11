
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { showPrices } = useB2bVisibility()
const { t } = useHubT()
const searchQuery = ref((route.query.q as string) || '')

const _cfg = useRuntimeConfig()
const _clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')

const { addToCart } = useServerCart(_clientId)
const { open: openCartDrawer } = useCartDrawer()
const { addToQuote } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()

const quantities = ref<Record<number, number>>({})
function getQty(id: number) { return quantities.value[id] ?? 1 }
function setQty(id: number, v: number) { quantities.value = { ...quantities.value, [id]: Math.max(1, v) } }

async function quickCart(p: any) {
  await addToCart({ id: p.id, name: p.name, price: p.price, priceRaw: p.priceRaw, image: p.image, ref: p.ref }, getQty(p.id))
  openCartDrawer()
}
function quickQuote(p: any) {
  addToQuote({ id: p.id, name: p.name, reference: p.ref, image: p.image }, getQty(p.id))
  openQuoteDrawer()
}

const { activeLang } = useRouteLang()
const { data: results, pending } = await useFetch('/api/catalogue/search', {
  query: { clientId: _clientId, q: searchQuery, limit: 50, lang: activeLang },
  watch: [searchQuery, activeLang],
})

const products = computed(() => {
  const raw = results.value
  return Array.isArray(raw) ? raw : (raw as any)?.products ?? []
})

function onSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/recherche', query: { q: searchQuery.value.trim() } })
  }
}

useHead({
  title: computed(() => {
    const suffix = _brand ? ` — ${_brand}` : ''
    return searchQuery.value ? `Recherche : ${searchQuery.value}${suffix}` : `Recherche${suffix}`
  }),
})
useListingBodyId('search')
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        
        <form class="max-w-2xl mx-auto mb-10" @submit.prevent="onSearch">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('catalogue.search_placeholder')"
              class="w-full px-5 py-4 pr-14 border border-gray-200 rounded-2xl text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
            <button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>
        </form>

        
        <div v-if="pending" class="text-center py-10">
          <p class="text-gray-400 text-sm">{{ t('catalogue.search_loading') }}</p>
        </div>

        <div v-else-if="products.length">
          <p class="text-sm text-gray-500 mb-6">{{ t('catalogue.catalogue_search_results_count', '{count} résultat(s) pour « {q} »').replace('{count}', String(products.length)).replace('{q}', String(route.query.q || '')) }}</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            <NuxtLink
              v-for="product in products"
              :key="product.id"
              :to="product.url || `/produit/${product.id}`"
              class="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-600/30 transition-all"
            >
              <div class="aspect-square bg-gray-50 overflow-hidden">
                <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">{{ product.name }}</h3>
                <p v-if="product.ref" class="text-[10px] text-gray-400 mb-2">{{ t('catalogue.label_ref') }} {{ product.ref }}</p>
                <p v-if="showPrices" class="text-base font-bold text-primary-600">{{ product.price }} <span class="text-xs font-normal text-gray-400">{{ t('catalogue.label_ht') }}</span></p>
                <p v-else class="text-xs text-gray-400 italic mb-1">{{ t('catalogue.price_on_quote') }}</p>
                <div class="flex items-center gap-2 mt-2" @click.stop @click.prevent>
                  <div class="flex items-center border border-gray-200 rounded-md">
                    <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs" @click="setQty(product.id, getQty(product.id) - 1)">−</button>
                    <span class="w-6 h-6 flex items-center justify-center text-[11px] font-semibold">{{ getQty(product.id) }}</span>
                    <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs" @click="setQty(product.id, getQty(product.id) + 1)">+</button>
                  </div>
                  <button
                    v-if="showPrices"
                    class="flex-1 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                    @click="quickCart(product)"
                  >{{ t('catalogue.add_to_cart') }}</button>
                  <button
                    v-else
                    class="flex-1 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                    @click="quickQuote(product)"
                  >{{ t('catalogue.add_to_quote') }}</button>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <div v-else-if="route.query.q" class="text-center py-20">
          <p class="text-gray-400 text-sm">{{ t('catalogue.catalogue_search_no_results_for', 'Aucun résultat pour « {q} »').replace('{q}', String(route.query.q || '')) }}</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
