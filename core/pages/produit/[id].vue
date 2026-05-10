<!--
  Fiche produit unifiée — /produit/[id] (core).

  Comportement :
    1. Résout l'URL canonique via /api/product-url-by-id. Si un path SEO existe
       (ex. Example Shop : /grossiste/fruit-sec/datte/medjool-premium-1kg), redirect
       301 vers cette URL canonique pour consolider le jus SEO.
    2. Sinon, render direct <ProductDetail> (cas SMOKE v2 qui n'a pas encore
       de structure canonique sous /{pilier}/{cat}/{slug}).

  Les liens legacy (blocs New/Bestseller/recherche qui fallback sur /produit/{id})
  continuent de fonctionner pendant la transition.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
// URL legacy /produit/{id} OU SEO /produit/{id}-{slug} — parseInt extrait l'id.
const productId = Number.parseInt(String(route.params.id ?? ''), 10)

if (!productId || Number.isNaN(productId)) {
  throw createError({ statusCode: 404, statusMessage: 'Produit introuvable', fatal: true })
}

const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const { activeLang } = useRouteLang()

// 1. Attempt canonical redirect (tenants with structured SEO URLs).
const { data: urlLookup } = await useFetch<{ found: boolean; path?: string }>('/api/product-url-by-id', {
  query: { id: productId, lang: activeLang },
  key: `product-url-${productId}`,
  watch: [activeLang],
})

if (urlLookup.value?.found && urlLookup.value.path) {
  await navigateTo(urlLookup.value.path, { redirectCode: 301, external: false })
}

// 2. Fallback: direct render (tenants without canonical structure).
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
