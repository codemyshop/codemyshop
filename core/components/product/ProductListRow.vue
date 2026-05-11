
<script setup lang="ts">
interface ProductRow {
  id: number
  ref?: string | null
  ean13?: string | null
  name: string
  url?: string
  image?: string | null
  imageSrcset?: string | null
  imageFallback?: string | null
  price: string
  priceRaw?: number
  format?: string
  netWeight?: string
  packaging?: string
  caliber?: string
  totalWeightKg?: number
  pricePerKgFormatted?: string
}

const props = defineProps<{ product: ProductRow }>()

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const { t } = useT()
const { showPrices, isB2b } = useB2bVisibility()
const { resolvedClientId } = useClientDetection()
const { addToCart } = useServerCart(resolvedClientId.value)
const { open: openCartDrawer } = useCartDrawer()
const { addToQuote } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()

const qty = ref(1)
function setQty(v: number) { qty.value = Math.max(1, v) }

const modalOpen = ref(false)
const modalImages = ref<number[]>([])
const modalLoading = ref(false)

async function openGallery() {
  if (modalLoading.value) return
  modalLoading.value = true
  try {
    const res = await $fetch<{ imageIds: number[] }>('/api/catalogue/product-images', {
      query: { id: props.product.id },
    })
    modalImages.value = res.imageIds.length
      ? res.imageIds
      : 
        (() => {
          const m = props.product.image?.match(/\/(\d+)-[^/]+\.(?:jpg|jpeg|png|webp)$/i)
          return m ? [Number(m[1])] : []
        })()
    if (modalImages.value.length > 0) modalOpen.value = true
  } finally {
    modalLoading.value = false
  }
}

const productUrl = computed(() => props.product.url || `/produit/${props.product.id}`)

async function quickCart() {
  const p = props.product
  await addToCart(
    {
      id: p.id,
      name: p.name,
      price: p.price,
      priceRaw: p.priceRaw ?? 0,
      image: p.image ?? undefined,
      ref: p.ref ?? '',
    },
    qty.value,
  )
  openCartDrawer()
}
function quickQuote() {
  const p = props.product
  addToQuote(
    { id: p.id, name: p.name, reference: p.ref ?? '', image: p.image ?? undefined },
    qty.value,
  )
  openQuoteDrawer()
}

const displayPrice = computed(() => {
  const p = props.product
  if (p.priceRaw != null) return fmtEur(p.priceRaw * qty.value)
  return p.price
})

const weightLabel = computed(() => {
  const w = props.product.totalWeightKg
  if (!w || w <= 0) return '—'
  if (w < 1) return `${Math.round(w * 1000)} g`
  return w < 10
    ? `${w.toFixed(w % 1 === 0 ? 0 : 2).replace('.', ',')} kg`
    : `${Math.round(w)} kg`
})
</script>

<template>
  <tr class="border-b border-slate-100 transition-colors hover:bg-primary-50/30 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
    
    <td class="w-16 px-3 py-2">
      <button
        v-if="product.image"
        type="button"
        class="block rounded-md ring-offset-2 ring-offset-white transition-all hover:ring-2 hover:ring-primary-400 dark:ring-offset-slate-900"
        :aria-label="t('product.zoom_image')"
        @click.prevent="openGallery"
      >
        <img
          :src="product.image"
          :srcset="product.imageSrcset"
          sizes="48px"
          :alt="product.name"
          class="h-12 w-12 cursor-zoom-in rounded-md object-contain bg-white p-1 dark:bg-slate-800"
          loading="lazy"
        />
      </button>
      <NuxtLink v-else :to="productUrl" class="block">
        <div class="h-12 w-12 rounded-md bg-slate-100 dark:bg-slate-800" />
      </NuxtLink>
    </td>

    
    <td class="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
      {{ product.ref || '—' }}
    </td>

    
    <td class="px-3 py-2">
      <NuxtLink
        :to="productUrl"
        class="block text-sm font-semibold text-slate-900 hover:text-primary-700 dark:text-slate-100 dark:hover:text-primary-400"
      >{{ product.name }}</NuxtLink>
      <div v-if="product.packaging || product.caliber" class="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span
          v-if="product.packaging"
          class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
        >{{ product.packaging }}</span>
        <span
          v-if="product.caliber"
          class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        >{{ product.caliber }}</span>
      </div>
    </td>

    
    <td class="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
      {{ product.ean13 || '—' }}
    </td>

    
    <td class="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
      {{ product.netWeight || '—' }}
    </td>

    
    <td class="px-3 py-2 text-right">
      <ClientOnly>
        <template v-if="showPrices">
          <span class="text-sm font-semibold text-primary-700 dark:text-primary-400">{{ displayPrice }}</span>
          <span class="ml-1 text-[10px] text-slate-400">{{ t('common.price_ht_suffix') }}</span>
        </template>
        <span v-else-if="isB2b" class="text-xs italic text-slate-400">{{ t('product.on_quote') }}</span>
        <template #fallback>
          <span class="inline-block h-4 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse align-middle" />
        </template>
      </ClientOnly>
    </td>

    
    <td class="px-3 py-2 text-right text-xs text-slate-500 dark:text-slate-400">
      {{ product.pricePerKgFormatted ? `${product.pricePerKgFormatted} /kg` : '—' }}
    </td>

    
    <td class="px-3 py-2 text-right text-xs text-slate-500 dark:text-slate-400">
      {{ weightLabel }}
    </td>

    
    <td v-if="isB2b" class="px-3 py-2">
      <div class="flex items-center justify-end gap-2">
        <div class="flex items-center rounded-md border border-slate-200 dark:border-slate-700">
          <button
            class="flex h-10 w-9 items-center justify-center text-sm text-slate-500 hover:text-slate-800"
            @click="setQty(qty - 1)"
          >−</button>
          <span class="flex h-10 w-10 items-center justify-center text-sm font-semibold text-slate-900 dark:text-white">{{ qty }}</span>
          <button
            class="flex h-10 w-9 items-center justify-center text-sm text-slate-500 hover:text-slate-800"
            @click="setQty(qty + 1)"
          >+</button>
        </div>
        <ClientOnly>
          <button
            v-if="showPrices"
            class="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            @click="quickCart"
          >{{ t('product.add_short') }}</button>
          <button
            v-else
            class="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            @click="quickQuote"
          >{{ t('product.to_quote_short') }}</button>
          <template #fallback>
            <div class="h-10 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </template>
        </ClientOnly>
      </div>
    </td>
    <td v-else class="px-3 py-2" />
  </tr>

  
  <HubProductImageModal
    :open="modalOpen"
    :images="modalImages"
    :client-id="resolvedClientId"
    :product-name="product.name"
    @close="modalOpen = false"
  />
</template>

