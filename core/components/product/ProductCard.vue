
<script setup lang="ts">
interface ProductCardData {
  id: number
  ref?: string | null
  name: string
  
  url?: string
  image?: string | null
  
  imageSrcset?: string | null
  
  imageFallback?: string | null
  
  imageLarge?: string | null
  
  descriptionShort?: string | null
  
  price: string
  
  priceRaw?: number
  
  pricePromo?: string
  pricePromoRaw?: number
  
  reductionLabel?: string
  
  format?: string
  packaging?: string
  caliber?: string
  

  pricePerKgFormatted?: string
  

  pricePerKgPromoFormatted?: string
  

  savingsFormatted?: string
  

  taxRate?: number
  

  unitLabel?: string
}

type BadgeVariant = 'promo' | 'top' | 'new' | 'custom'

const props = withDefaults(
  defineProps<{
    product: ProductCardData
    featured?: boolean
    showWishlist?: boolean
    
    badge?: { text: string; variant?: BadgeVariant } | null
  }>(),
  { featured: false, showWishlist: true, badge: null },
)

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

async function quickCart() {
  const p = props.product
  
  
  
  
  
  await addToCart(
    {
      id: p.id,
      name: p.name,
      price: p.pricePromo || p.price,
      priceRaw: p.pricePromoRaw ?? p.priceRaw ?? 0,
      image: p.image ?? undefined,
      ref: p.ref ?? '',
      format: p.format,
      packaging: p.packaging,
      caliber: p.caliber,
      pricePerKgFormatted: hasPromo.value
        ? (p.pricePerKgPromoFormatted ?? p.pricePerKgFormatted)
        : p.pricePerKgFormatted,
      taxRate: p.taxRate,
      priceFormattedBeforeDiscount: hasPromo.value ? p.price : undefined,
      pricePerKgFormattedBeforeDiscount: hasPromo.value ? p.pricePerKgFormatted : undefined,
      reductionLabel: hasPromo.value ? p.reductionLabel : undefined,
      unitLabel: p.unitLabel,
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

const productUrl = computed(() => props.product.url || `/produit/${props.product.id}`)

const effectiveBadge = computed(() => {
  if (props.badge) return props.badge
  if (props.product.reductionLabel) {
    return { text: props.product.reductionLabel, variant: 'promo' as BadgeVariant }
  }
  return null
})

const badgeClass = computed(() => {
  const v = effectiveBadge.value?.variant ?? 'custom'
  if (v === 'promo') return 'bg-red-600 text-white'
  if (v === 'top') return 'bg-primary-600 text-white uppercase tracking-wider'
  if (v === 'new') return 'bg-emerald-600 text-white'
  return 'bg-slate-900 text-white'
})

const hasPromo = computed(
  () => !!(props.product.pricePromo && props.product.pricePromoRaw != null),
)

const displayPrice = computed(() => {
  const p = props.product
  if (hasPromo.value) {
    if (p.pricePromoRaw != null) return fmtEur(p.pricePromoRaw * qty.value)
    return p.pricePromo
  }
  if (p.priceRaw != null) return fmtEur(p.priceRaw * qty.value)
  return p.price
})

const displayOriginalPrice = computed(() => {
  const p = props.product
  if (p.priceRaw != null) return fmtEur(p.priceRaw * qty.value)
  return p.price
})

const displaySavings = computed(() => {
  const p = props.product
  if (p.priceRaw != null && p.pricePromoRaw != null) {
    return fmtEur(Math.max(0, (p.priceRaw - p.pricePromoRaw) * qty.value))
  }
  return p.savingsFormatted
})
</script>

<template>
  
  <div :class="['group relative', featured ? 'lg:h-[800px]' : 'h-full']">
    <NuxtLink
      :to="productUrl"
      class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-primary-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      
      <ClientOnly>
        <span
          v-if="effectiveBadge && showPrices"
          :class="[
            'absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold shadow',
            badgeClass,
          ]"
        >
          {{ effectiveBadge.text }}
        </span>
      </ClientOnly>

      
      <div
        v-if="showWishlist"
        class="absolute right-2 top-2 z-10"
        @click.stop
        @click.prevent
      >
        <WishlistButton :product-id="product.id" variant="icon" />
      </div>

      
      <div
        :class="[
          'overflow-hidden bg-white dark:bg-slate-800',
          featured ? 'aspect-[2/1] lg:aspect-auto lg:h-[36rem]' : 'aspect-square',
        ]"
      >
        <img
          v-if="featured && product.imageLarge"
          :src="product.imageLarge"
          :srcset="product.imageSrcset"
          sizes="(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw"
          :alt="product.name"
          width="600"
          height="450"
          class="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <img
          v-else-if="product.image"
          :src="product.image"
          :srcset="product.imageSrcset"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          :alt="product.name"
          width="300"
          height="300"
          class="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
      </div>

      
      <div class="flex flex-1 flex-col p-4">
      <h3
        :class="[
          'mb-2 line-clamp-2 font-semibold text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-400',
          featured ? 'text-lg sm:text-xl' : 'text-sm',
        ]"
      >
        {{ product.name }}
      </h3>

      
      <div
        v-if="product.format || product.packaging || product.caliber"
        class="mb-2 flex flex-wrap gap-1"
      >
        <span
          v-if="product.format"
          class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >{{ product.format }}</span>
        <span
          v-if="product.packaging"
          class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
        >{{ product.packaging }}</span>
        <span
          v-if="product.caliber"
          class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        >{{ product.caliber }}</span>
      </div>

      <p v-if="product.ref" class="mb-2 text-[10px] text-slate-400">{{ t('product.ref') }} {{ product.ref }}</p>

      
      <p
        v-if="featured && product.descriptionShort"
        class="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
      >{{ product.descriptionShort }}</p>

      
      <ClientOnly>
        <template v-if="showPrices">
          
          <template v-if="product.pricePerKgFormatted">
            <div class="flex items-baseline gap-2">
              <span
                :class="[
                  'font-bold text-primary-700 dark:text-primary-400',
                  featured ? 'text-2xl sm:text-3xl' : 'text-xl',
                ]"
              >{{ hasPromo && product.pricePerKgPromoFormatted ? product.pricePerKgPromoFormatted : product.pricePerKgFormatted }}</span>
              <span class="text-xs font-semibold text-primary-700 dark:text-primary-400">{{ product.unitLabel || 'HT/K' }}</span>
              <span
                v-if="hasPromo && product.pricePerKgPromoFormatted"
                class="text-sm text-red-600 line-through"
              >{{ product.pricePerKgFormatted }}</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              TVA à {{ (product.taxRate ?? 5.5).toString().replace('.', ',') }} %, soit pour {{ qty === 1 ? 'un colis' : `${qty} colis` }} :<br>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ displayPrice }} HT</span>
              <template v-if="hasPromo">
                <span class="ml-1 text-red-600 line-through">{{ displayOriginalPrice }}</span>
                <span v-if="displaySavings" class="ml-1 font-semibold text-red-600">· Économisez {{ displaySavings }}</span>
              </template>
            </p>
          </template>
          <template v-else>
            <div class="flex items-baseline gap-2">
              <span
                :class="[
                  'font-bold text-primary-700 dark:text-primary-400',
                  featured ? 'text-xl sm:text-2xl' : 'text-base',
                ]"
              >{{ displayPrice }}</span>
              <span
                v-if="hasPromo"
                class="text-xs text-red-600 line-through"
              >{{ displayOriginalPrice }}</span>
              <span v-if="isB2b" class="text-xs font-normal text-slate-400">HT</span>
              <span
                v-if="hasPromo && displaySavings"
                class="text-xs font-semibold text-red-600"
              >· Économisez {{ displaySavings }}</span>
            </div>
          </template>
        </template>
        <p v-else-if="isB2b" class="mb-1 text-xs italic text-slate-400">{{ t('product.price_on_quote') }}</p>
        <template #fallback>
          <div class="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </template>
      </ClientOnly>

      
      <div
        class="mt-auto flex flex-col gap-2 pt-3"
        @click.stop
        @click.prevent
      >
        <div class="flex items-stretch gap-2">
          <div class="flex shrink-0 items-center rounded-md border border-slate-200 dark:border-slate-700">
            <button
              class="flex h-11 w-9 items-center justify-center text-sm text-slate-500 hover:text-slate-800"
              @click="setQty(qty - 1)"
            >−</button>
            <span class="flex h-11 w-8 items-center justify-center text-sm font-semibold text-slate-900 dark:text-white">{{ qty }}</span>
            <button
              class="flex h-11 w-9 items-center justify-center text-sm text-slate-500 hover:text-slate-800"
              @click="setQty(qty + 1)"
            >+</button>
          </div>
          <ClientOnly>
            <button
              v-if="showPrices"
              class="flex-1 h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 whitespace-nowrap"
              @click="quickCart"
            >{{ t('product.add_to_cart') }}</button>
            <button
              v-else
              class="flex-1 h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 whitespace-nowrap"
              @click="quickQuote"
            >{{ t('product.add_to_quote') }}</button>
            <template #fallback>
              <div class="flex-1 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </template>
          </ClientOnly>
        </div>
        <ChatbotProductButton :product-id="product.id" :qty="qty" variant="card" />
      </div>
      </div>
    </NuxtLink>
  </div>
</template>
