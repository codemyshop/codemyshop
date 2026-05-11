
<script setup lang="ts">
const { t } = useT()
const { resolvedClientId } = useClientDetection()
const { isOpen, close } = useCartDrawer()
const { loggedIn, customer, checkSession } = useCustomerAuth()

const _runtimeCfg = useRuntimeConfig()
const isFoodVertical = computed(() => String((_runtimeCfg.public as any)?.vertical || '') === 'food')

const {
  items,
  updateQuantity,
  removeFromCart,
  totalHT,
  totalTTC,
  totalItems,
  subtotalHT,
  subtotalFormatted,
  totalFormatted,
  totalTTCFormatted,
  cartLoading,
  discountCode,
  discountHT,
  applyPromoCode,
  removePromoCode,
  isServerMode,
  initServerCart,
} = useServerCart(resolvedClientId.value)

async function ensureServerCartInit() {
  if (loggedIn.value && customer.value?.customerId && !isServerMode.value) {
    await initServerCart(customer.value.customerId)
  }
}
onMounted(async () => {
  await checkSession()
  await ensureServerCartInit()
})
watch([isOpen, loggedIn], async ([open]) => {
  if (open) {
    await checkSession()
    await ensureServerCartInit()
  }
})

const promoInput = ref('')
const promoError = ref<string | null>(null)
const promoApplying = ref(false)

async function submitPromo() {
  const code = promoInput.value.trim()
  if (!code) return
  promoError.value = null
  promoApplying.value = true
  try {
    await applyPromoCode(code)
    promoInput.value = ''
  } catch (err: any) {
    promoError.value = err?.data?.message || err?.message || t('cart.drawer.promo_invalid')
  } finally {
    promoApplying.value = false
  }
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const itemsCountLabel = computed(() => {
  if (!totalItems.value) return ''
  const key = totalItems.value === 1 ? 'cart.drawer.items_count_one' : 'cart.drawer.items_count_other'
  return t(key, { count: totalItems.value })
})

function boxLabel(quantity: number): string {
  return quantity === 1
    ? t('cart.drawer.box_one')
    : t('cart.drawer.box_other', { count: quantity })
}

function taxLineHtml(item: { taxRate?: number; quantity: number; priceRaw: number }): string {
  return t('cart.drawer.tax_line_html', {
    rate: (item.taxRate ?? 5.5).toString().replace('.', ','),
    qtyLabel: boxLabel(item.quantity),
    amount: formatPrice(item.priceRaw * item.quantity),
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  if (import.meta.client) document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
})

watch(isOpen, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cart-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        @click="close"
      />
    </Transition>

    <Transition name="cart-slide">
      <aside
        v-if="isOpen"
        class="fixed inset-y-0 right-0 z-[101] w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        
        <header class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2
            id="cart-drawer-title"
            class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            {{ t('cart.drawer.title') }}
            <span
              v-if="totalItems"
              class="text-xs font-semibold text-gray-400 dark:text-gray-500"
            >{{ itemsCountLabel }}</span>
          </h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            :aria-label="t('cart.drawer.close_aria')"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="cartLoading" class="text-center py-12 text-gray-400 text-sm">
            {{ t('common.loading') }}
          </div>

          <div v-else-if="items.length" class="space-y-3">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-slate-800 last:border-b-0"
            >
              <div class="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0">
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.name"
                  class="w-full h-full object-contain p-1.5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                  {{ item.name }}
                </h3>

                
                <div
                  v-if="item.format || item.packaging || item.caliber"
                  class="mt-1 flex flex-wrap gap-1"
                >
                  <span
                    v-if="item.format"
                    class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >{{ item.format }}</span>
                  <span
                    v-if="item.packaging"
                    class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  >{{ item.packaging }}</span>
                  <span
                    v-if="item.caliber"
                    class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >{{ item.caliber }}</span>
                </div>

                <p v-if="item.ref" class="text-[10px] text-gray-400 mt-0.5">
                  {{ t('common.item_ref', { ref: item.ref }) }}
                </p>

                
                <template v-if="item.pricePerKgFormatted">
                  <div class="mt-1 flex items-baseline gap-1.5">
                    <span class="text-sm font-bold text-primary-600 dark:text-primary-400">{{ item.pricePerKgFormatted }}</span>
                    <span class="text-[10px] font-semibold text-primary-600 dark:text-primary-400">{{ item.unitLabel || 'HT/K' }}</span>
                    <span
                      v-if="item.pricePerKgFormattedBeforeDiscount"
                      class="text-[10px] text-red-600 line-through"
                    >{{ item.pricePerKgFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[9px] font-bold text-white bg-red-600 rounded-full px-1.5 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                  <p
                    class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight"
                    v-html="taxLineHtml(item)"
                  />
                </template>
                <template v-else>
                  <div class="mt-1 flex items-baseline gap-1.5">
                    <span class="text-xs font-bold text-primary-600 dark:text-primary-400">{{ item.price }} {{ t('common.price_ht_suffix') }}</span>
                    <span
                      v-if="item.priceFormattedBeforeDiscount"
                      class="text-[10px] text-red-600 line-through"
                    >{{ item.priceFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[9px] font-bold text-white bg-red-600 rounded-full px-1.5 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                </template>
                <div class="flex items-center justify-between mt-2">
                  <div class="flex items-center border border-gray-200 dark:border-slate-700 rounded-md">
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white text-sm"
                      :aria-label="t('cart.drawer.item_quantity_decrease_aria', { name: item.name })"
                      @click="updateQuantity(item.id, item.quantity - 1)"
                    >−</button>
                    <span class="w-7 h-7 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-white">
                      {{ item.quantity }}
                    </span>
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white text-sm"
                      :aria-label="t('cart.drawer.item_quantity_increase_aria', { name: item.name })"
                      @click="updateQuantity(item.id, item.quantity + 1)"
                    >+</button>
                  </div>
                  <button
                    type="button"
                    class="text-gray-300 hover:text-red-500 transition-colors"
                    :aria-label="t('cart.drawer.item_remove_aria', { name: item.name })"
                    @click="removeFromCart(item.id)"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          
          <div v-else class="text-center py-16">
            <svg class="w-14 h-14 mx-auto text-gray-200 dark:text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path v-if="isFoodVertical" stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-1">{{ t('cart.drawer.empty_title') }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('cart.drawer.empty_subtitle') }}</p>
          </div>
        </div>

        
        <footer
          v-if="items.length"
          class="border-t border-gray-100 dark:border-slate-800 px-5 py-4 shrink-0 bg-gray-50/50 dark:bg-slate-900"
        >
          
          <CartFirstOrderBanner :enabled="isOpen" compact class="mb-3" />

          
          <div class="mb-3">
            <div v-if="discountCode" class="flex items-center justify-between px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-xs">
              <span class="flex items-center gap-1.5 text-primary-700 dark:text-primary-300 font-semibold min-w-0">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z"/>
                </svg>
                <span class="truncate">{{ t('cart.drawer.promo_code_label', { code: discountCode }) }}</span>
              </span>
              <span class="flex items-center gap-2 shrink-0">
                <span class="font-bold text-primary-700 dark:text-primary-300">−{{ formatPrice(discountHT) }}</span>
                <button
                  type="button"
                  class="p-0.5 rounded text-primary-600/70 hover:text-red-500 hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
                  :aria-label="t('cart.drawer.promo_remove_aria')"
                  @click="removePromoCode"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
            <form v-else class="flex gap-1.5" @submit.prevent="submitPromo">
              <input
                v-model="promoInput"
                type="text"
                :placeholder="t('cart.drawer.promo_placeholder')"
                autocomplete="off"
                class="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                :disabled="promoApplying"
              />
              <button
                type="submit"
                :disabled="promoApplying || !promoInput.trim()"
                class="px-3 py-2 text-xs font-semibold bg-gray-900 dark:bg-slate-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {{ promoApplying ? '…' : t('cart.drawer.promo_apply') }}
              </button>
            </form>
            <p v-if="promoError" class="mt-1 text-[11px] text-red-500">{{ promoError }}</p>
          </div>

          <div class="space-y-1.5 mb-4 text-sm">
            <div class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>{{ t('cart.drawer.subtotal_ht') }}</span>
              <span class="font-semibold text-gray-900 dark:text-white">{{ subtotalFormatted }}</span>
            </div>
            <div v-if="discountCode && discountHT > 0" class="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>{{ t('cart.drawer.discount_label', { code: discountCode }) }}</span>
              <span class="font-semibold">−{{ formatPrice(discountHT) }}</span>
            </div>
            <div v-if="discountCode && discountHT > 0" class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>{{ t('cart.drawer.total_ht') }}</span>
              <span class="font-semibold text-gray-900 dark:text-white">{{ totalFormatted }}</span>
            </div>
            <div class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>{{ t('cart.drawer.tax_estimated') }}</span>
              <span>{{ formatPrice(totalTTC - totalHT) }}</span>
            </div>
            <div class="flex justify-between font-bold text-base pt-1.5 border-t border-gray-100 dark:border-slate-800">
              <span class="text-gray-900 dark:text-white">{{ t('cart.drawer.total_ttc') }}</span>
              <span class="text-primary-600 dark:text-primary-400">{{ totalTTCFormatted }}</span>
            </div>
          </div>

          <NuxtLink
            to="/commander"
            class="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm text-center transition-colors"
            @click="close"
          >
            {{ t('cart.drawer.cta_checkout') }}
          </NuxtLink>
          <NuxtLink
            to="/panier"
            class="block w-full mt-2 py-2 text-center text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            @click="close"
          >
            {{ t('cart.drawer.cta_full_cart') }}
          </NuxtLink>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cart-fade-enter-active,
.cart-fade-leave-active {
  transition: opacity 250ms ease;
}
.cart-fade-enter-from,
.cart-fade-leave-to {
  opacity: 0;
}

.cart-slide-enter-active,
.cart-slide-leave-active {
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
.cart-slide-enter-from,
.cart-slide-leave-to {
  transform: translateX(100%);
}
</style>
