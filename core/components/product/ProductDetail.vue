<!--
  Fiche produit unifiée B2B — galerie + prix + panier + attachments + specs MDM.
  Utilisée par /grossiste/[...path] (route SEO canonique) et /produit/[id] (legacy,
  transformée en 301). Source de vérité UI pour le single-product B2B.

  clientId / cartTenant : fallback sur runtimeConfig.public.clientId si non fournis.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { localePath } = useLocalePath()
interface AttachmentRow {
  id: number
  name: string
  fileName: string
  mime: string
  fileSize: number
}

interface ProductSpec {
  countryOrigin?: string | null
  shelfLifeMonths?: number | null
  processProduction?: string | null
  storageTemperature?: string | null
  storageHumidity?: string | null
  ingredients?: Array<{ name: string; pct?: number; origin?: string | null }>
  allergens?: string[]
  nutri?: {
    energyKj?: number | null
    energyKcal?: number | null
    fatG?: number | null
    satFatG?: number | null
    carbsG?: number | null
    sugarsG?: number | null
    proteinsG?: number | null
    saltG?: number | null
  }
  compliance?: { isIonised: boolean | null; hasNanomaterials: boolean | null; isNonGmo: boolean | null }
  pack?: {
    container?: string | null
    unitWeight?: string | null
    unitsPerCarton?: number | null
    cartonWeight?: string | null
    cartonsPerPallet?: number | null
    gencod?: string | null
    material?: string | null
  }
}

interface ProductLike {
  id: number
  name: string
  reference?: string
  price?: number | string
  priceFormatted?: string
  priceRaw?: number
  weight?: number | string
  description?: string
  descriptionShort?: string
  description_short?: string
  images?: string[]
  imageSets?: Array<{ src: string; srcset: string; fallback: string; slug: string }>
  features?: Array<{ id?: number; name: string; value: string }>
  attachments?: AttachmentRow[]
  spec?: ProductSpec
  // Promo + product card parity (see ProductCard.vue / cart)
  priceFormattedBeforeDiscount?: string
  priceRawBeforeDiscount?: number
  pricePerKgRaw?: number
  pricePerKgFormatted?: string
  pricePerKgFormattedBeforeDiscount?: string
  reductionLabel?: string
  taxRate?: number
  /** Suffixe court prix unitaire (HT/K, HT/L, HT/U) — DB-First. */
  unitLabel?: string
  /** Variants (size, color…) with stock per variant. */
  combinations?: Array<{
    id: number
    reference?: string
    price?: number
    quantity?: number
    defaultOn?: boolean
    attributes?: Array<{ groupId: number; group: string; attributeId: number; value: string }>
  }>
}

interface BreadcrumbItem { label: string; path: string }

const props = withDefaults(defineProps<{
  product: ProductLike
  breadcrumb?: BreadcrumbItem[] | null
  pilier?: string
  clientId?: string
  cartTenant?: string
}>(), {
  breadcrumb: () => null,
  pilier: '',
  clientId: () => String((useRuntimeConfig().public as any).clientId ?? ''),
  cartTenant: () => String((useRuntimeConfig().public as any).clientId ?? ''),
})

const { t } = useT()
const { showPrices } = useB2bVisibility()

// Quantity + cart
const quantity = ref(1)
function increment() { quantity.value++ }
function decrement() { if (quantity.value > 1) quantity.value-- }

// ── Variants (sizes, colors…) ─────────────────────────────────────
// If the product has combinations, we constrain add to cart to a
// selected variant and we display available stock live.
const combinations = computed(() => Array.isArray(props.product.combinations) ? props.product.combinations : [])
const hasCombinations = computed(() => combinations.value.length > 0)
const selectedCombinationId = ref<number | null>(null)

// Initial selection: default_on if it exists and has stock, otherwise first
// variant in stock, otherwise the first one.
watchEffect(() => {
  if (!hasCombinations.value) return
  if (selectedCombinationId.value !== null) return
  const inStock = combinations.value.find(c => (c.quantity ?? 0) > 0)
  const def = combinations.value.find(c => c.defaultOn && (c.quantity ?? 0) > 0)
  selectedCombinationId.value = (def ?? inStock ?? combinations.value[0])?.id ?? null
})

const selectedCombination = computed(() => combinations.value.find(c => c.id === selectedCombinationId.value) ?? null)
const selectedStock = computed(() => selectedCombination.value?.quantity ?? 0)
const isOutOfStock = computed(() => hasCombinations.value && selectedStock.value <= 0)

// Groups variants by attribute group ("Size: 36 / 37 / ...").
// For the skate demo: 1 single group (Shoe size). Multi-group (color + size)
// is supported in read mode but the selector remains flat — to extend later.
const attributeGroups = computed(() => {
  const map = new Map<number, { id: number; name: string; values: Array<{ id: number; value: string; combinationId: number; quantity: number }> }>()
  for (const c of combinations.value) {
    for (const a of (c.attributes ?? [])) {
      if (!map.has(a.groupId)) map.set(a.groupId, { id: a.groupId, name: a.group, values: [] })
      map.get(a.groupId)!.values.push({
        id: a.attributeId,
        value: a.value,
        combinationId: c.id,
        quantity: c.quantity ?? 0,
      })
    }
  }
  return Array.from(map.values())
})

const { addToCart: cartAdd, totalItems } = useServerCart(props.cartTenant)
const { open: openCartDrawer } = useCartDrawer()
const addedToCart = ref(false)

const { addToQuote, totalItems: quoteTotalItems } = useQuoteCart()
const { open: openQuoteDrawer } = useQuoteDrawer()
const addedToQuote = ref(false)

async function addToCart() {
  await cartAdd({
    id: props.product.id,
    name: props.product.name,
    price: props.product.priceFormatted ?? String(props.product.price ?? ''),
    priceRaw: unitPriceRaw.value,
    image: props.product.images?.[0],
    ref: props.product.reference,
  }, quantity.value)
  addedToCart.value = true
  openCartDrawer()
  setTimeout(() => { addedToCart.value = false }, 2000)
}

// Cross-selling : qty + add par accessoire (Map id → qty)
const accessoryQty = ref<Record<number, number>>({})
const accessoryAdded = ref<Record<number, boolean>>({})
function getAccessoryQty(id: number): number { return accessoryQty.value[id] ?? 1 }
function setAccessoryQty(id: number, v: number) {
  accessoryQty.value = { ...accessoryQty.value, [id]: Math.max(1, Number(v) || 1) }
}
async function addAccessoryToCartOrQuote(acc: any) {
  const qty = getAccessoryQty(acc.id)
  if (showPrices.value) {
    await cartAdd({
      id: acc.id, name: acc.name, price: acc.priceFormatted, priceRaw: acc.price,
      image: acc.image, ref: '',
    }, qty)
    openCartDrawer()
  } else {
    addToQuote({ id: acc.id, name: acc.name, reference: '', image: acc.image }, qty)
    openQuoteDrawer()
  }
  accessoryAdded.value = { ...accessoryAdded.value, [acc.id]: true }
  setTimeout(() => { accessoryAdded.value = { ...accessoryAdded.value, [acc.id]: false } }, 2000)
}

function addProductToQuote() {
  addToQuote({
    id: props.product.id,
    name: props.product.name,
    reference: props.product.reference,
    image: props.product.images?.[0],
  }, quantity.value)
  addedToQuote.value = true
  openQuoteDrawer()
  setTimeout(() => { addedToQuote.value = false }, 2000)
}

const selectedImage = ref(0)

const features = computed(() => Array.isArray(props.product.features) ? props.product.features : [])
const calibrageFeature = computed(() =>
  features.value.find(f => /calibr|caliber/i.test(f.name)),
)
// "Unit price or per kilo" — commercial feature: we extract it to
// display it under the price (if customer logged in) and we remove it from specs
// generic (hidden for non-logged-in visitors).
const unitPriceFeature = computed(() =>
  features.value.find(f => /prix.*(unit|kilo|kg)/i.test(f.name)),
)
const otherFeatures = computed(() =>
  features.value.filter(f => f !== calibrageFeature.value && f !== unitPriceFeature.value),
)

const weightDisplay = computed(() => {
  const w = parseFloat(String(props.product.weight ?? ''))
  if (!w || Number.isNaN(w)) return ''
  return Number.isInteger(w) ? `${w} kg` : `${w.toFixed(2).replace(/\.?0+$/, '')} kg`
})

const unitPriceDisplay = computed(() => {
  const raw = unitPriceFeature.value?.value?.trim()
  if (!raw) return ''
  // Accepte "6.85", "6,85", "6.85 €/kg" — normalise en "6,85 €/kg"
  const m = raw.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return raw
  const n = parseFloat(m[1].replace(',', '.'))
  if (Number.isNaN(n)) return raw
  return `${n.toString().replace('.', ',')} €/kg`
})

const lightboxOpen = ref(false)
function openLightbox() {
  if (props.product.images?.length) lightboxOpen.value = true
}

// HD Zoom: PrestaShop exposes the source image at the URL without format suffix.
// `…/img/p/1/8/2/9/1829-large_default.jpg` → `…/img/p/1/8/2/9/1829.jpg`.
function toOriginalImage(url?: string): string {
  if (!url) return ''
  return url.replace(/-(?:[a-z_]+_)?default(?:_?2x)?(\.[a-zA-Z]+)(\?.*)?$/, '$1$2')
}
const zoomImage = computed(() => {
  const src = props.product.images?.[selectedImage.value] ?? props.product.images?.[0]
  return toOriginalImage(src)
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const descShort = computed(() => props.product.descriptionShort ?? props.product.description_short ?? '')
const descLong = computed(() => props.product.description ?? '')

const hasLongDescription = computed(() => {
  const long = stripHtml(descLong.value)
  const short = stripHtml(descShort.value)
  if (!long) return false
  if (props.product?.name && long === props.product.name) return false
  return long.length > short.length + 40
})

// Display the product Specifications block only if at least one field
// useful from cs_product_food is filled (avoids the phantom h2 seen when
// the nutrient PDF extraction failed).
const hasSpecContent = computed(() => {
  const s = props.product.spec
  if (!s) return false
  return Boolean(
    s.ingredients?.length
    || s.allergens?.length
    || s.nutri?.energyKcal != null
    || s.nutri?.energyKj != null
    || s.pack?.container
    || s.pack?.unitWeight
    || s.pack?.unitsPerCarton
    || s.pack?.cartonsPerPallet
    || s.description
    || s.usageConditions
    || s.consumerWarnings
    || s.isIonised != null
    || s.isNonGmo != null,
  )
})

const priceDisplay = computed(() => props.product.priceFormatted ?? props.product.price ?? '')

// Dynamic net price = unit price × quantity, recalculated live when
// the user changes the qty.
function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const unitPriceRaw = computed((): number => {
  const raw = props.product.priceRaw
  if (raw != null && !Number.isNaN(Number(raw))) return Number(raw)
  const str = String(props.product.priceFormatted ?? props.product.price ?? '')
    .replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = parseFloat(str)
  return Number.isFinite(n) ? n : 0
})

const lineTotal = computed(() => unitPriceRaw.value * Math.max(1, quantity.value || 0))
const lineTotalFormatted = computed(() => unitPriceRaw.value > 0 ? formatEur(lineTotal.value) : priceDisplay.value)
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumb -->
    <div class="bg-gray-50 border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <nav class="flex items-center gap-2 text-xs text-gray-400">
          <NuxtLink to="/" class="hover:text-primary-600">{{ t('catalogue.breadcrumb_home') }}</NuxtLink>
          <template v-if="breadcrumb?.length && pilier">
            <template v-for="(bc, i) in breadcrumb" :key="i">
              <span>/</span>
              <NuxtLink :to="localePath(`/${pilier}${bc.path ? '/' + bc.path : ''}/`)" class="hover:text-primary-600">
                {{ bc.label }}
              </NuxtLink>
            </template>
          </template>
          <span>/</span>
          <span class="text-gray-700 font-medium">{{ product?.name ?? t('catalogue.product_breadcrumb') }}</span>
        </nav>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid lg:grid-cols-2 gap-10">
        <!-- Galerie images -->
        <div>
          <button
            type="button"
            :disabled="!product.images?.length"
            class="relative group aspect-[4/3] sm:aspect-square w-full bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4 block disabled:cursor-default"
            :class="product.images?.length ? 'cursor-zoom-in' : ''"
            :aria-label="t('catalogue.image_zoom')"
            @click="openLightbox"
          >
            <img
              v-if="product.images?.length"
              :src="product.images[selectedImage] ?? product.images[0]"
              :srcset="product.imageSets?.[selectedImage]?.srcset ?? product.imageSets?.[0]?.srcset"
              sizes="(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw"
              :alt="product.name"
              class="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-200">
              <svg class="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
            <span
              v-if="product.images?.length"
              class="absolute bottom-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              aria-hidden="true"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M19.5 10.5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3v6m-3-3h6" />
              </svg>
            </span>
          </button>
          <div v-if="product.images && product.images.length > 1" class="flex gap-2">
            <button
              v-for="(img, i) in product.images"
              :key="i"
              class="w-16 h-16 rounded-lg border overflow-hidden"
              :class="selectedImage === i ? 'border-primary-600 ring-2 ring-primary-600/20' : 'border-gray-200'"
              @click="selectedImage = i"
            >
              <img :src="img" :alt="`${product.name} - ${i + 1}`" class="w-full h-full object-contain p-1" />
            </button>
          </div>
        </div>

        <!-- Infos produit -->
        <div>
          <h1 class="text-[22px] sm:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2">{{ product.name }}</h1>
          <p v-if="product.reference" class="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">{{ t('catalogue.label_ref') }} {{ product.reference }}</p>
          <div class="mb-5">
            <WishlistButton :product-id="product.id" variant="full" />
          </div>

          <!-- Bloc prix : showPrices session-dépendant → ClientOnly pour cache
               SSR Redis sur /produit/**. Fallback skeleton h-20 pour éviter CLS. -->
          <div class="bg-gray-50 rounded-xl p-5 mb-6">
            <ClientOnly>
              <template v-if="showPrices">
                <!-- Hiérarchie inversée Aude 04/05 P2 : prix HT/K en gros + mention
                     TVA. Source de vérité prix au kilo : pricePerKgFormatted
                     (dérivé Poids net × Unités par colis, parité ProductCard) si
                     dispo, sinon feature PS « prix à l'unité ou kilo » legacy.
                     Si une `ps_specific_price` est active : badge "-X%", HT/K
                     barré, prix colis barré sous la mention TVA. -->
                <template v-if="product.pricePerKgFormatted || unitPriceDisplay">
                  <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <p class="text-3xl font-extrabold text-primary-600">
                      {{ product.pricePerKgFormatted ? product.pricePerKgFormatted : `${unitPriceDisplay.replace(' €/kg', '')} €` }}
                      <span class="text-base font-bold text-primary-600">{{ product.unitLabel || 'HT/K' }}</span>
                    </p>
                    <span
                      v-if="product.pricePerKgFormattedBeforeDiscount"
                      class="text-base text-red-600 line-through"
                    >{{ product.pricePerKgFormattedBeforeDiscount }}</span>
                    <span
                      v-if="product.reductionLabel"
                      class="text-xs font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ product.reductionLabel }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    TVA à {{ (product.taxRate ?? 5.5).toString().replace('.', ',') }} %, soit pour {{ quantity === 1 ? 'un colis' : `${quantity} colis` }} :
                    <span class="font-semibold text-gray-900">{{ lineTotalFormatted }} HT</span>
                    <span
                      v-if="product.priceFormattedBeforeDiscount && quantity === 1"
                      class="ml-1 text-red-600 line-through"
                    >{{ product.priceFormattedBeforeDiscount }}</span>
                  </p>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p v-if="quantity > 1 && unitPriceRaw > 0" class="text-xs text-gray-500">
                      {{ quantity }} × {{ priceDisplay }}
                    </p>
                    <p v-if="weightDisplay" class="text-xs text-gray-500">{{ t('catalogue.product_weight') }} {{ weightDisplay }}</p>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <p class="text-3xl font-extrabold text-primary-600">
                      {{ lineTotalFormatted }}
                      <span class="text-sm font-normal text-gray-400">{{ t('catalogue.label_ht') }}</span>
                    </p>
                    <span
                      v-if="product.priceFormattedBeforeDiscount && quantity === 1"
                      class="text-base text-red-600 line-through"
                    >{{ product.priceFormattedBeforeDiscount }}</span>
                    <span
                      v-if="product.reductionLabel"
                      class="text-xs font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ product.reductionLabel }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p v-if="quantity > 1 && unitPriceRaw > 0" class="text-xs text-gray-500">
                      {{ quantity }} × {{ priceDisplay }}
                    </p>
                    <p v-if="weightDisplay" class="text-xs text-gray-500">{{ t('catalogue.product_weight') }} {{ weightDisplay }}</p>
                  </div>
                </template>
              </template>
              <div v-else class="text-center py-2">
                <p class="text-sm text-gray-500">{{ t('catalogue.price_pro_only') }}</p>
              </div>
              <template #fallback>
                <div class="h-8 w-40 rounded bg-slate-200 animate-pulse" />
                <div class="h-3 w-64 rounded bg-slate-100 animate-pulse mt-2" />
              </template>
            </ClientOnly>
          </div>

          <div
            v-if="calibrageFeature"
            class="flex items-center gap-3 mb-6 p-3 border border-primary-600/20 bg-primary-600/5 rounded-xl"
          >
            <span class="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{{ calibrageFeature.name }}</span>
            <span class="text-sm font-bold text-gray-900">{{ calibrageFeature.value }}</span>
          </div>

          <!-- Quick-info Origin / Expiry / EAN — pulled from the Specs block to densify the top of the product page -->
          <div v-if="product.spec" class="flex flex-wrap gap-2 mb-6">
            <div v-if="product.spec.countryOrigin" class="flex items-center gap-2 px-3 py-1.5 bg-primary-600/5 border border-primary-600/20 rounded-lg">
              <svg class="w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.origin') }}</span>
              <span class="text-xs font-semibold text-gray-900">{{ product.spec.countryOrigin }}</span>
            </div>
            <div v-if="product.spec.shelfLifeMonths" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <svg class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.shelf_life') }}</span>
              <span class="text-xs font-semibold text-gray-900">{{ product.spec.shelfLifeMonths }} {{ t('product.months') }}</span>
            </div>
            <div v-if="product.spec.pack?.gencod" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <svg class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.5v15m3-15v15m3-15v15m3-15v15m3-15v15m3-15v15M4.5 4.5h15M4.5 19.5h15"/></svg>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ t('product.ean13') }}</span>
              <span class="text-xs font-mono font-semibold text-gray-900">{{ product.spec.pack.gencod }}</span>
            </div>
          </div>

          <!-- Variant selector (Shoe size / Size / Color) — displayed if ps_product_attribute exists -->
          <div v-for="group in attributeGroups" :key="group.id" class="mb-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{{ group.name }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="v in group.values"
                :key="v.id"
                type="button"
                @click="selectedCombinationId = v.combinationId"
                :disabled="v.quantity <= 0"
                :class="[
                  'h-10 min-w-[3rem] px-3 rounded-lg border text-sm font-semibold transition-all',
                  v.combinationId === selectedCombinationId
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : v.quantity <= 0
                      ? 'border-gray-200 text-gray-300 line-through cursor-not-allowed bg-gray-50'
                      : 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600',
                ]"
                :title="v.quantity <= 0 ? t('product.out_of_stock') : `${v.quantity} ${t('product.in_stock_short')}`"
              >{{ v.value }}</button>
            </div>
            <p v-if="selectedCombination" class="text-xs text-gray-500 mt-2">
              <span v-if="selectedStock > 5" class="text-emerald-600 font-medium">● {{ t('product.in_stock') }}</span>
              <span v-else-if="selectedStock > 0" class="text-amber-600 font-medium">● {{ t('product.low_stock') }} — {{ selectedStock }} {{ t('product.in_stock_short') }}</span>
              <span v-else class="text-red-600 font-medium">● {{ t('product.out_of_stock') }}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
            <div class="flex items-center border border-gray-200 rounded-lg">
              <button class="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900" @click="decrement">−</button>
              <input v-model.number="quantity" type="number" min="1" class="w-14 h-10 text-center text-sm font-semibold border-x border-gray-200 focus:outline-none" />
              <button class="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900" @click="increment">+</button>
            </div>
            <ClientOnly>
              <button
                v-if="showPrices"
                class="flex-1 min-w-0 h-12 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap px-4"
                :class="addedToCart ? 'bg-emerald-500 text-white' : isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                :disabled="isOutOfStock"
                @click="addToCart"
              >
                {{ isOutOfStock ? t('product.out_of_stock') : addedToCart ? t('catalogue.added_to_cart') : t('catalogue.add_to_cart') }}
              </button>
              <button
                v-else
                class="flex-1 min-w-0 h-12 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap px-4"
                :class="addedToQuote ? 'bg-emerald-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                @click="addProductToQuote"
              >
                {{ addedToQuote ? t('catalogue.added_to_quote') : t('catalogue.add_to_quote') }}
              </button>
              <template #fallback>
                <div class="flex-1 min-w-0 h-12 rounded-xl bg-slate-100 animate-pulse" />
              </template>
            </ClientOnly>
            <ChatbotProductButton :product-id="product.id" :qty="quantity" variant="detail" class="flex-1 min-w-0 h-12 rounded-xl whitespace-nowrap px-4" />
          </div>

          <!-- Description courte (teaser commercial) sous le CTA. À réécrire via
               automate dédié pour éviter la redite avec les tableaux Specs/Features. -->
          <div
            v-if="descShort"
            class="prose prose-sm max-w-none text-gray-700 mb-6"
            v-html="descShort"
          />
          <div
            v-else-if="descLong"
            class="prose prose-sm max-w-none text-gray-700 mb-6"
            v-html="descLong"
          />


          <ClientOnly>
            <NuxtLink
              v-if="showPrices && totalItems > 0"
              to="/panier"
              class="block text-center text-xs text-primary-600 hover:underline mb-4"
            >
              {{ t('catalogue.product_view_cart') }} ({{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }})
            </NuxtLink>
            <NuxtLink
              v-if="!showPrices && quoteTotalItems > 0"
              to="/devis"
              class="block text-center text-xs text-primary-600 hover:underline mb-4"
            >
              {{ t('catalogue.product_view_quote') }} ({{ quoteTotalItems }} {{ quoteTotalItems > 1 ? t('cart.articles') : t('cart.article') }})
            </NuxtLink>
          </ClientOnly>

          <!-- Cross-selling : produits associés (ps_accessory) — sous le CTA.
               Layout horizontal : image à gauche (carrée), contenu à droite
               (nom + prix + stepper qty + CTA Ajouter sur la même ligne).
               3 cards visibles + scroll vertical pour le reste (max-h calé sur
               3 × image-h-24 + 2 × gap-3 = 312px). -->
          <section v-if="product.accessories?.length" class="mb-6 border-t border-gray-200 pt-6">
            <h2 class="text-sm font-bold text-gray-900 mb-4">
              {{ t('product.related_title') }}
              <span v-if="product.accessories.length > 3" class="ml-1 text-[10px] font-normal text-gray-400">({{ product.accessories.length }})</span>
            </h2>
            <div
              :class="product.accessories.length > 3
                ? 'space-y-3 max-h-[312px] overflow-y-auto pr-1 scroll-smooth [scrollbar-width:thin]'
                : 'space-y-3'"
            >
              <div
                v-for="acc in product.accessories"
                :key="acc.id"
                class="group flex items-stretch gap-3 rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-primary-500 hover:shadow-md transition"
              >
                <NuxtLink :to="acc.url" class="shrink-0 w-24 h-24 bg-gray-50 overflow-hidden">
                  <img
                    v-if="acc.image"
                    :src="acc.image"
                    :alt="acc.name"
                    width="200"
                    height="200"
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                </NuxtLink>
                <div class="flex-1 min-w-0 flex flex-col justify-between py-2 pr-2">
                  <NuxtLink :to="acc.url" class="block">
                    <h3 class="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-primary-700">{{ acc.name }}</h3>
                    <ClientOnly>
                      <p v-if="showPrices && acc.priceFormatted" class="mt-0.5 text-xs font-semibold text-gray-900">{{ acc.priceFormatted }}</p>
                    </ClientOnly>
                  </NuxtLink>
                  <div class="flex items-stretch gap-1 mt-2">
                    <div class="flex items-center border border-gray-200 rounded-md overflow-hidden">
                      <button
                        type="button"
                        class="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 text-sm"
                        :aria-label="t('catalogue.qty_decrease')"
                        @click="setAccessoryQty(acc.id, getAccessoryQty(acc.id) - 1)"
                      >−</button>
                      <input
                        :value="getAccessoryQty(acc.id)"
                        type="number"
                        min="1"
                        class="w-9 h-8 text-center text-xs font-semibold border-x border-gray-200 focus:outline-none"
                        @input="(e) => setAccessoryQty(acc.id, Number((e.target as HTMLInputElement).value))"
                      />
                      <button
                        type="button"
                        class="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 text-sm"
                        :aria-label="t('catalogue.qty_increase')"
                        @click="setAccessoryQty(acc.id, getAccessoryQty(acc.id) + 1)"
                      >+</button>
                    </div>
                    <button
                      type="button"
                      class="flex-1 h-8 rounded-md text-xs font-semibold whitespace-nowrap px-2 transition-colors border"
                      :class="accessoryAdded[acc.id]
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-primary-600 text-primary-700 hover:bg-primary-50'"
                      @click="addAccessoryToCartOrQuote(acc)"
                    >
                      <template v-if="accessoryAdded[acc.id]">{{ t('catalogue.added_short') }}</template>
                      <ClientOnly v-else>
                        <template v-if="showPrices">{{ t('catalogue.add_short') }}</template>
                        <template v-else>{{ t('catalogue.quote_short') }}</template>
                        <template #fallback>{{ t('catalogue.add_short') }}</template>
                      </ClientOnly>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.25 2.25 0 0 0-.659-1.591l-2.56-2.56a2.25 2.25 0 0 0-1.591-.659H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
              {{ t('catalogue.free_shipping') }}
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              {{ t('catalogue.secure_payment') }}
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>
              {{ t('catalogue.drive_collect') }}
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
              {{ t('catalogue.quality_premium') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Long description — first paragraph highlighted (lead), rest in standard prose -->
      <div v-if="hasLongDescription" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.description') }}</h2>
        <div
          class="prose prose-sm sm:prose-base max-w-none text-gray-600
                 prose-headings:text-gray-900 prose-headings:font-bold
                 prose-p:my-3 prose-p:leading-relaxed
                 prose-p:first:text-base prose-p:first:sm:text-[17px] prose-p:first:font-medium prose-p:first:text-gray-900 prose-p:first:leading-relaxed prose-p:first:mt-0 prose-p:first:mb-4
                 prose-ul:my-4 prose-ul:pl-5 prose-li:my-1.5 prose-li:marker:text-primary-600
                 prose-strong:text-gray-900 prose-strong:font-semibold
                 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
          v-html="descLong"
        />
      </div>

      <!-- Fiches techniques (attachments PDF/XLSX) -->
      <div v-if="product.attachments?.length" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.datasheets') }}</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          <a
            v-for="att in product.attachments"
            :key="att.id"
            :href="`/api/catalogue/product/attachment/${att.id}?clientId=${clientId}`"
            target="_blank"
            class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-600 hover:bg-primary-600/5 transition-colors group"
          >
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :class="att.mime?.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'"
            >
              <svg v-if="att.mime?.includes('pdf')" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 0 1-1 0V13a.5.5 0 0 1 .5-.5h1zm4 0h1.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5H12a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5zm.5 1v2h.5v-2H13zm-7.5 0H6a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1 0 1h.5v1a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5z"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate">{{ att.name }}</p>
              <p class="text-xs text-gray-400">
                {{ att.mime?.includes('pdf') ? 'PDF' : att.mime?.includes('spreadsheet') ? 'Excel' : att.fileName?.split('.').pop()?.toUpperCase() }}
                <span v-if="att.fileSize"> · {{ (att.fileSize / 1024).toFixed(0) }} Ko</span>
              </p>
            </div>
            <svg class="w-4 h-4 text-gray-300 group-hover:text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </a>
        </div>
      </div>

      <!-- Specifications -->
      <div v-if="otherFeatures.length" class="mt-12 pt-8 border-t border-gray-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ t('catalogue.features') }}</h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div
            v-for="f in otherFeatures"
            :key="f.id ?? f.name"
            class="flex items-baseline justify-between gap-4 py-2 border-b border-gray-50"
          >
            <dt class="text-xs font-semibold uppercase tracking-wider text-gray-400">{{ f.name }}</dt>
            <dd class="text-sm font-medium text-gray-900 text-right">{{ f.value }}</dd>
          </div>
        </dl>
      </div>

      <!-- Spécifications MDM (cs_product_food : Example Shop V2)
           Masquée si tous les champs utiles sont NULL (extraction PDF nutri ratée). -->
      <div v-if="hasSpecContent" class="mt-12 pt-8 border-t border-gray-100 space-y-10">
        <h2 class="text-xl font-bold text-gray-900">{{ t('product.specs_heading') }}</h2>

        <div class="grid md:grid-cols-2 gap-8">
          <div v-if="product.spec.ingredients?.length">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.ingredients') }}</h3>
            <ul class="space-y-2">
              <li
                v-for="(ing, i) in product.spec.ingredients"
                :key="i"
                class="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 text-sm"
              >
                <span class="text-gray-900">
                  {{ ing.name }}
                  <span v-if="ing.origin" class="text-[10px] text-gray-400 ml-1">({{ ing.origin }})</span>
                </span>
                <span v-if="ing.pct != null" class="text-gray-500 font-mono text-xs shrink-0">{{ ing.pct }}%</span>
              </li>
            </ul>
          </div>

          <div v-if="product.spec.nutri?.energyKcal != null">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.nutri_heading') }} <span class="text-[10px] text-gray-300">{{ t('product.nutri_per_100g') }}</span></h3>
            <dl class="space-y-1.5 text-sm">
              <div v-if="product.spec.nutri.energyKj" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_energy') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.energyKj }} Kj / {{ product.spec.nutri.energyKcal }} Kcal</dd>
              </div>
              <div v-if="product.spec.nutri.fatG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_fat') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.fatG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.satFatG != null" class="flex justify-between py-1 border-b border-gray-50 pl-3 text-xs text-gray-500">
                <dt>{{ t('product.nutri_satfat') }}</dt>
                <dd>{{ product.spec.nutri.satFatG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.carbsG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_carbs') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.carbsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.sugarsG != null" class="flex justify-between py-1 border-b border-gray-50 pl-3 text-xs text-gray-500">
                <dt>{{ t('product.nutri_sugars') }}</dt>
                <dd>{{ product.spec.nutri.sugarsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.proteinsG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_proteins') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.proteinsG }} g</dd>
              </div>
              <div v-if="product.spec.nutri.saltG != null" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.nutri_salt') }}</dt>
                <dd class="font-medium">{{ product.spec.nutri.saltG }} g</dd>
              </div>
            </dl>
          </div>
        </div>

        <div v-if="product.spec.allergens?.length">
          <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.allergens') }} <span class="text-[10px] text-gray-300">{{ t('product.allergens_inco') }}</span></h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="a in product.spec.allergens"
              :key="a"
              class="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800"
            >
              {{ a }}
            </span>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <div v-if="product.spec.pack?.unitsPerCarton">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.pack_heading') }}</h3>
            <dl class="space-y-1.5 text-sm">
              <div v-if="product.spec.pack.container" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_container') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.container }}</dd>
              </div>
              <div v-if="product.spec.pack.unitWeight" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_unit_weight') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.unitWeight }}</dd>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_units_per_carton') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.unitsPerCarton }}</dd>
              </div>
              <div v-if="product.spec.pack.cartonWeight" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_carton_weight') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.cartonWeight }}</dd>
              </div>
              <div v-if="product.spec.pack.cartonsPerPallet" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_cartons_per_pallet') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.cartonsPerPallet }}</dd>
              </div>
              <div v-if="product.spec.pack.material" class="flex justify-between py-1 border-b border-gray-50">
                <dt class="text-gray-600">{{ t('product.pack_material') }}</dt>
                <dd class="font-medium">{{ product.spec.pack.material }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="product.spec.compliance">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{{ t('product.compliance_heading') }}</h3>
            <div class="flex flex-wrap gap-2">
              <span v-if="product.spec.compliance.isNonGmo === true" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_non_gmo') }}
              </span>
              <span v-if="product.spec.compliance.isIonised === false" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_non_ionised') }}
              </span>
              <span v-if="product.spec.compliance.hasNanomaterials === false" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.42 0l-4-4a1 1 0 1 1 1.42-1.42L8 12.59l7.29-7.29a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>
                {{ t('product.compliance_no_nano') }}
              </span>
            </div>
            <div v-if="product.spec.processProduction" class="mt-4 text-xs text-gray-500 leading-relaxed">
              <span class="font-semibold text-gray-600">{{ t('product.process') }} :</span> {{ product.spec.processProduction }}
            </div>
            <div v-if="product.spec.storageTemperature" class="mt-2 text-xs text-gray-500">
              <span class="font-semibold text-gray-600">{{ t('product.storage') }} :</span>
              {{ product.spec.storageTemperature }}
              <span v-if="product.spec.storageHumidity"> · {{ t('product.humidity') }} {{ product.spec.storageHumidity }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Lightbox zoom image produit -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxOpen && product.images?.length"
          class="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-4 py-6 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          @click="lightboxOpen = false"
          @keydown.esc="lightboxOpen = false"
        >
          <img
            :src="zoomImage || product.images[selectedImage] || product.images[0]"
            :alt="product.name"
            class="max-w-[95vw] max-h-[90vh] object-contain"
            @click.stop
          />
          <button
            type="button"
            class="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-lg"
            :aria-label="t('catalogue.image_close')"
            @click.stop="lightboxOpen = false"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
