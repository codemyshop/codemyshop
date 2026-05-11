
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

const productId = Number.parseInt(String(route.params.id ?? ''), 10)

if (!productId || Number.isNaN(productId)) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable', fatal: true })
}

const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const { activeLang } = useRouteLang()

const { data: urlLookup } = await useFetch<{ found: boolean; path?: string }>('/api/product-url-by-id', {
  query: { id: productId, lang: activeLang },
  key: `product-url-${productId}`,
  watch: [activeLang],
})

if (urlLookup.value?.found && urlLookup.value.path) {
  await navigateTo(urlLookup.value.path, { redirectCode: 301, external: false })
}

const { data: product, error } = await useFetch<any>(`/api/catalogue/product/${productId}`, {
  query: { clientId, lang: activeLang },
  key: `product-${productId}`,
  watch: [activeLang],
})

if (error.value || !product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable', fatal: true })
}
</script>

<template>
  <NuxtLayout name="white-label">
    <ProductDetail :product="product" :client-id="clientId" />
  </NuxtLayout>
</template>
