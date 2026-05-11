
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const brand = String((_cfg.public as any).brandName ?? '')
const route = useRoute()
const cmsId = computed(() => Number(route.params.id))

const { activeLang } = useRouteLang()
const { data: pageData } = await useFetch(`/api/catalogue/cms/${cmsId.value}`, {
  query: { clientId, lang: activeLang },
  watch: [activeLang],
})

const page = computed(() => pageData.value ?? null)

useListingBodyId('cms', () => cmsId.value || null)

useHead({
  title: computed(() => {
    const suffix = brand ? ` — ${brand}` : ''
    return page.value ? `${page.value.title}${suffix}` : (brand || '')
  }),
  meta: [
    { name: 'description', content: computed(() => page.value?.meta_description ?? '') },
  ],
})
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-white">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 v-if="page" class="text-3xl font-bold text-gray-900 mb-8">{{ page.title }}</h1>
        <div v-if="page" class="prose prose-sm max-w-none text-gray-600" v-html="page.content" />
        <div v-else class="text-center py-20">
          <p class="text-gray-400">{{ t('page.page_not_found') }}</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
