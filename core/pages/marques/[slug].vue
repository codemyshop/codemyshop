
<script setup lang="ts">
const { t } = useHubT()
const { localePath } = useLocalePath()
definePageMeta({ layout: false })

const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const route = useRoute()
const slug = computed(() => (route.params.slug as string) || '')

const { showPrices } = useB2bVisibility()
const { activeLang } = useRouteLang()

const { data, error } = await useFetch<{ manufacturer: any; products: any[] }>(`/api/catalogue/manufacturers/${slug.value}`, {
  query: { lang: activeLang },
  watch: [activeLang],
  default: () => ({ manufacturer: null, products: [] }),
})

if (error.value) {
  throw createError({ statusCode: 404, message: `Marque "${slug.value}" introuvable` })
}

const brand = computed(() => data.value?.manufacturer)
const products = computed(() => data.value?.products ?? [])

useHead(() => ({
  title: brand.value ? `${brand.value.metaTitle || brand.value.name} — ${brandName}` : `Marque — ${brandName}`,
  meta: [
    { name: 'description', content: brand.value?.metaDescription || `Découvrez tous les produits ${brand.value?.name} chez ${brandName}.` },
  ],
}))
useListingBodyId('manufacturer', () => brand.value?.id_manufacturer ?? null)
</script>

<template>
  <NuxtLayout name="white-label">
    <section v-if="brand" class="py-12 bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">

        
        <nav class="text-xs text-gray-400 mb-6" :aria-label="t('silo.breadcrumb_aria', 'Fil d\\x27Ariane')">
          <NuxtLink :to="localePath('/')" class="hover:text-primary-600 transition-colors">{{ t('silo.breadcrumb_home', 'Accueil') }}</NuxtLink>
          <span class="mx-1.5">/</span>
          <NuxtLink to="/marques/" class="hover:text-primary-600 transition-colors">{{ t('brands.heading', 'Nos Marques') }}</NuxtLink>
          <span class="mx-1.5">/</span>
          <span class="text-gray-700 font-medium">{{ brand.name }}</span>
        </nav>

        
        <div class="flex items-center gap-6 mb-10">
          <div class="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            <img
              :src="brand.logo || '/img/c/_default.webp'"
              :alt="brand.name"
              class="w-16 h-16 object-contain"
              @error="($event.target as HTMLImageElement).src = '/img/c/_default.webp'"
            />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-1">{{ brand.name }}</h1>
            <p class="text-sm text-gray-500">{{ brand.nbProducts }} produit{{ brand.nbProducts > 1 ? 's' : '' }}</p>
            <p v-if="brand.description" class="text-sm text-gray-600 mt-2 max-w-2xl">{{ brand.description }}</p>
          </div>
        </div>

        
        <div v-if="products.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <NuxtLink
            v-for="product in products"
            :key="product.id"
            :to="localePath(product.url)"
            class="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
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
              <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors">
                {{ product.name }}
              </h3>
              <p v-if="product.ref" class="text-[10px] text-gray-400 mb-2">Réf. {{ product.ref }}</p>
              <div v-if="showPrices" class="flex items-baseline gap-1">
                <span class="text-base font-bold text-gray-900">{{ product.price }}</span>
                <span class="text-[10px] text-gray-400">HT</span>
              </div>
            </div>
          </NuxtLink>
        </div>

        <p v-else class="text-gray-400 text-center py-12">{{ t('brands.no_products', 'Aucun produit disponible pour cette marque.') }}</p>

      </div>
    </section>
  </NuxtLayout>
</template>
