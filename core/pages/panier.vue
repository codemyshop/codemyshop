<!--
  Panier B2B — /panier
  Hybride : localStorage (visiteur) + panier serveur PS (client connecté).
  clientId via useRuntimeConfig().public.clientId.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const _cfg = useRuntimeConfig()
const _clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')

const { items, updateQuantity, removeFromCart, totalHT, totalTTC, totalFormatted, totalTTCFormatted, subtotalHT, subtotalFormatted, totalItems, cartLoading, discountCode, discountHT, applyPromoCode, isServerMode, initServerCart, loadCartById, appliedCorseTva } = useServerCart(_clientId)
const { t } = useHubT()
const { loggedIn, customer, checkSession } = useCustomerAuth()

// `?recover=<id>` — CTA for abandoned cart recovery email (cart_recovery).
// We force loading of THIS specific cart (not the last cart) if the user
// is logged in; otherwise we redirect to /login?next=… to preserve
// l'intent post-login.
const route = useRoute()
const router = useRouter()
const recoverCartId = computed(() => {
  const n = Number(route.query.recover)
  return Number.isFinite(n) && n > 0 ? n : null
})

async function bootstrapCart() {
  if (!loggedIn.value || !customer.value) return
  if (recoverCartId.value) {
    await loadCartById(recoverCartId.value, customer.value.customerId)
  } else if (!isServerMode.value) {
    await initServerCart(customer.value.customerId)
  }
}

// Initialize server cart on mount if client is logged in — otherwise applyPromoCode
// throw "Login required" because isServerMode remains false (see
// order.vue which does the same).
onMounted(async () => {
  await checkSession()
  if (!loggedIn.value && recoverCartId.value) {
    // Cart recovery email + logged-out visitor → redirect to login preserving intent.
    const next = `/panier?recover=${recoverCartId.value}`
    router.push(`/connexion?next=${encodeURIComponent(next)}`)
    return
  }
  await bootstrapCart()
})
watch(loggedIn, async (v) => {
  if (v && customer.value) await bootstrapCart()
})

const promoInput = ref('')
const promoError = ref('')
const promoLoading = ref(false)

async function onApplyPromo() {
  if (!promoInput.value.trim()) return
  promoError.value = ''
  promoLoading.value = true
  try {
    await applyPromoCode(promoInput.value.trim())
    promoInput.value = ''
  } catch (err: any) {
    promoError.value = err?.data?.message || err?.message || t('cart.cart_promo_invalid')
  } finally {
    promoLoading.value = false
  }
}

const freeShipping = computed(() => totalHT.value >= 300)

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

// Convention PS : <body id="cart" class="cart">
useListingBodyId('cart')

useHead({ title: _brand ? `Panier — ${_brand}` : 'Panier' })
</script>

<template>
  <NuxtLayout name="checkout">
    <div class="min-h-screen bg-white">

      <!-- Breadcrumb -->
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <NuxtLink to="/" class="hover:text-primary-600">{{ t('cart.breadcrumb_home') }}</NuxtLink>
            <span>/</span>
            <span class="text-gray-700 font-medium">{{ t('cart.breadcrumb_cart') }}</span>
          </nav>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-8">{{ t('cart.cart_title') }} <span v-if="totalItems" class="text-gray-400 font-normal text-base">({{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }})</span></h1>

        <!-- Loading -->
        <div v-if="cartLoading" class="text-center py-12 text-gray-400 text-sm">{{ t('cart.cart_loading') }}</div>

        <div v-else-if="items.length" class="grid lg:grid-cols-3 gap-8">
          <!-- Liste articles -->
          <div class="lg:col-span-2 space-y-4">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-start gap-4 p-4 border border-gray-100 rounded-xl"
            >
              <div class="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-contain p-2" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ item.name }}</h3>

                <!-- Pills format / packaging / size — parity with `ProductCard.vue`. -->
                <div
                  v-if="item.format || item.packaging || item.caliber"
                  class="mt-1 flex flex-wrap gap-1"
                >
                  <span
                    v-if="item.format"
                    class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                  >{{ item.format }}</span>
                  <span
                    v-if="item.packaging"
                    class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                  >{{ item.packaging }}</span>
                  <span
                    v-if="item.caliber"
                    class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                  >{{ item.caliber }}</span>
                </div>

                <p v-if="item.ref" class="text-[10px] text-gray-400 mt-0.5">{{ t('cart.label_ref') }} {{ item.ref }}</p>

                <!-- Hiérarchie inversée Aude P2 : HT/K en gros + mention TVA pour
                     N colis. Si promo (specific_price) active : HT/K barré +
                     label "-X%" en badge. Fallback sans pricePerKg : prix colis. -->
                <template v-if="item.pricePerKgFormatted">
                  <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-base font-bold text-primary-600">{{ item.pricePerKgFormatted }}</span>
                    <span class="text-xs font-semibold text-primary-600">{{ item.unitLabel || 'HT/K' }}</span>
                    <span
                      v-if="item.pricePerKgFormattedBeforeDiscount"
                      class="text-xs text-red-600 line-through"
                    >{{ item.pricePerKgFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                  <p class="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    {{ t('cart.label_vat_at', 'TVA à') }} {{ (item.taxRate ?? 5.5).toString().replace('.', ',') }} %, {{ t('cart.label_for_a_pack', 'soit pour') }} {{ item.quantity === 1 ? t('cart.label_one_pack', 'un colis') : `${item.quantity} ${t('cart.label_packs', 'colis')}` }} :
                    <span class="font-semibold text-gray-700">{{ formatPrice(item.priceRaw * item.quantity) }} {{ t('cart.label_ht') }}</span>
                  </p>
                </template>
                <template v-else>
                  <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-primary-600">{{ item.price }} {{ t('cart.label_ht') }}</span>
                    <span
                      v-if="item.priceFormattedBeforeDiscount"
                      class="text-xs text-red-600 line-through"
                    >{{ item.priceFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                  <p class="text-xs text-gray-400">{{ formatPrice(item.priceRaw * 1.20) }} {{ t('cart.label_ttc') }}</p>
                </template>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center border border-gray-200 rounded-lg">
                  <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.id, item.quantity - 1)">−</button>
                  <span class="w-8 h-8 flex items-center justify-center text-sm font-semibold">{{ item.quantity }}</span>
                  <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.id, item.quantity + 1)">+</button>
                </div>
                <button class="text-gray-300 hover:text-red-500 transition-colors" @click="removeFromCart(item.id)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="lg:col-span-1">
            <div class="bg-gray-50 rounded-2xl p-6 sticky top-24">
              <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('cart.cart_summary') }}</h2>

              <!-- Banner "First order 5% discount" — visible if client is logged in + 0 validated orders -->
              <CartFirstOrderBanner class="mb-4" />

              <!-- Bandeau TVA Corse 2,1 % — adresse de livraison 20xxx -->
              <div v-if="appliedCorseTva" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                <p class="font-semibold text-blue-900">TVA Corse appliquée — 2,1 %</p>
                <p class="text-xs text-blue-800 mt-1">
                  Votre adresse en Corse bénéficie automatiquement du taux de TVA réduit applicable aux produits alimentaires.
                </p>
              </div>

              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">{{ t('cart.cart_subtotal_ht') }}</span>
                  <span class="font-semibold text-gray-900">{{ subtotalFormatted }}</span>
                </div>
                <div v-if="discountCode && discountHT > 0" class="flex justify-between text-emerald-700">
                  <span>Remise « {{ discountCode }} »</span>
                  <span class="font-semibold">−{{ formatPrice(discountHT) }} {{ t('cart.label_ht') }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">{{ t('cart.cart_vat_estimated') }}</span>
                  <span class="text-gray-600">{{ formatPrice(totalTTC - totalHT) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">{{ t('cart.cart_shipping') }}</span>
                  <span :class="freeShipping ? 'text-primary-600 font-semibold' : 'text-gray-900'">
                    {{ freeShipping ? t('cart.cart_shipping_free') : t('cart.cart_shipping_next_step') }}
                  </span>
                </div>
                <div v-if="!freeShipping" class="text-xs text-gray-400">
                  {{ t('cart.cart_free_shipping_threshold') }}
                </div>
              </div>

              <!-- Code promo (la ligne « Remise » du récap au-dessus indique
                   déjà le code appliqué + montant déduit). On garde uniquement
                   le formulaire de saisie, masqué dès qu'un code est actif. -->
              <div v-if="!discountCode" class="border-t border-gray-200 mt-4 pt-4">
                <div class="flex gap-2">
                  <input
                    v-model="promoInput"
                    type="text"
                    :placeholder="t('cart.cart_promo_placeholder')"
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-600 focus:border-primary-600 outline-none"
                    @keyup.enter="onApplyPromo"
                  />
                  <button
                    :disabled="!promoInput || promoLoading"
                    class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    @click="onApplyPromo"
                  >
                    {{ promoLoading ? '...' : 'OK' }}
                  </button>
                </div>
                <p v-if="promoError" class="text-red-500 text-xs mt-1">{{ promoError }}</p>
              </div>

              <CartLoyaltyBlock :total-ttc="totalTTC" />

              <div class="border-t border-gray-200 mt-4 pt-4">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">{{ t('cart.cart_total_ht') }}</span>
                  <span class="font-bold text-gray-900">{{ totalFormatted }}</span>
                </div>
                <div class="flex justify-between text-lg font-bold mt-1">
                  <span class="text-gray-900">{{ t('cart.cart_total_ttc') }}</span>
                  <span class="text-primary-600">{{ totalTTCFormatted }}</span>
                </div>
              </div>

              <NuxtLink
                to="/commander"
                class="block w-full mt-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm text-center transition-colors"
              >
                {{ t('cart.cart_checkout_button') }}
              </NuxtLink>

              <NuxtLink to="/" class="block mt-3 text-center text-xs text-gray-400 hover:text-primary-600">
                {{ t('cart.cart_continue_shopping') }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Panier vide -->
        <div v-else class="text-center py-20">
          <svg class="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <p class="text-gray-500 text-sm mb-2">{{ t('cart.cart_empty') }}</p>
          <NuxtLink to="/" class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl text-sm">
            {{ t('cart.cart_discover_products') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
