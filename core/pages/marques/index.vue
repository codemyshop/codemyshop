<!--
  Page listing des marques — /marques/
  Données : GET /api/catalogue/manufacturers (ps_manufacturer).

  Tenant-neutre : titre et meta dérivés de brandName (runtimeConfig).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { t } = useHubT()
const { localePath } = useLocalePath()
definePageMeta({ layout: false })

const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const { activeLang } = useRouteLang()
const { data } = await useFetch<{ manufacturers: any[] }>('/api/catalogue/manufacturers', {
  query: { lang: activeLang },
  watch: [activeLang],
  default: () => ({ manufacturers: [] }),
})
const brands = computed(() => data.value?.manufacturers ?? [])

useHead({
  title: `${t('brands.heading', 'Nos Marques')} — ${brandName}`,
  meta: [
    { name: 'description', content: t('brands.meta_description', `Découvrez toutes les marques distribuées par ${brandName}.`) },
  ],
})
</script>

<template>
  <NuxtLayout name="white-label">
    <section class="py-12 bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">

        <!-- Breadcrumb -->
        <nav class="text-xs text-gray-400 mb-6" :aria-label="t('silo.breadcrumb_aria', 'Fil d\x27Ariane')">
          <NuxtLink :to="localePath('/')" class="hover:text-primary-600 transition-colors">{{ t('silo.breadcrumb_home', 'Accueil') }}</NuxtLink>
          <span class="mx-1.5">/</span>
          <span class="text-gray-700 font-medium">{{ t('brands.heading', 'Nos Marques') }}</span>
        </nav>

        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ t('brands.heading', 'Nos Marques') }}</h1>
        <p class="text-gray-500 mb-10">{{ brands.length }} {{ t('brands.distributed_by_short', 'marques distribuées') }}</p>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <NuxtLink
            v-for="brand in brands"
            :key="brand.id"
            :to="localePath(`/marques/${brand.slug}/`)"
            class="group flex flex-col items-center text-center bg-white border border-gray-100 rounded-xl p-6 hover:shadow-lg hover:border-primary-300 transition-all"
          >
            <div class="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4 overflow-hidden group-hover:bg-primary-50 transition-colors">
              <img
                :src="brand.logo || '/img/c/_default.webp'"
                :alt="brand.name"
                class="w-14 h-14 object-contain"
                loading="lazy"
                @error="($event.target as HTMLImageElement).src = '/img/c/_default.webp'"
              />
            </div>
            <h2 class="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors mb-1">
              {{ brand.name }}
            </h2>
            <p class="text-xs text-gray-400">{{ brand.nbProducts }} produit{{ brand.nbProducts > 1 ? 's' : '' }}</p>
          </NuxtLink>
        </div>

      </div>
    </section>
  </NuxtLayout>
</template>
