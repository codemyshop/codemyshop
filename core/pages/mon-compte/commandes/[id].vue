
<script setup lang="ts">
import type { OrderData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const route = useRoute()
const { customer, checkSession } = useCustomerAuth()
const { addToCart } = useServerCart(clientId)
const { open: openCartDrawer } = useCartDrawer()
const order = ref<OrderData | null>(null)
const loading = ref(true)
const reordering = ref(false)

const downloading = ref(false)
const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

async function downloadInvoice() {
  if (!order.value) return
  downloading.value = true
  try {
    const pdf = await $fetch<Blob>(`/api/orders/${order.value.id}/invoice`, {
      query: { clientId },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(pdf)
    const a = document.createElement('a')
    a.href = url
    a.download = `facture-${order.value.invoiceNumber}-${order.value.reference}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {  }
  finally { downloading.value = false }
}

async function reorder() {
  if (!order.value || reordering.value) return
  reordering.value = true
  try {
    for (const it of order.value.items) {
      await addToCart({
        id: it.productId,
        name: it.name,
        price: formatPrice(it.priceTTC),
        priceRaw: it.priceTTC,
        ref: it.reference,
      }, it.quantity)
    }
    openCartDrawer()
  } catch (err) {
    console.error('[reorder] error:', err)
  } finally {
    reordering.value = false
  }
}

async function loadOrder() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion')
  }
  loading.value = true
  try {
    order.value = await $fetch<OrderData>(`/api/orders/${route.params.id}`, {
      query: { clientId },
    })
  } catch {  }
  finally { loading.value = false }
}

onMounted(loadOrder)
useHead({ title: computed(() => order.value ? `Commande #${order.value.reference}` : 'Commande') })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div class="flex items-center gap-3 mb-8">
          <NuxtLink to="/mon-compte/commandes" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('account.order_title') }} <span v-if="order">#{{ order.reference }}</span></h1>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading') }}</div>

        <div v-else-if="order" class="space-y-6">

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-500">{{ t('account.order_placed_on') }} {{ formatDate(order.dateAdd) }}</p>
                <p class="text-lg font-bold text-gray-900 mt-1">{{ order.status }}</p>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="order.invoiceNumber"
                  :disabled="downloading"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-600 hover:text-white transition-colors disabled:opacity-50"
                  @click="downloadInvoice"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                  {{ downloading ? t('account.orders_downloading') : t('account.order_invoice_pdf') }}
                </button>
                <span class="text-sm text-gray-400">{{ order.payment }}</span>
              </div>
            </div>
          </div>

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-gray-500">{{ t('account.order_articles') }}</h2>
              <button
                v-if="order.items.length"
                :disabled="reordering"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                @click="reorder"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {{ reordering ? 'Ajout en cours…' : 'Recommander ces produits' }}
              </button>
            </div>
            <div v-for="item in order.items" :key="item.productId" class="flex justify-between py-3 border-b border-gray-50 last:border-0">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ item.name }}</p>
                <p class="text-[10px] text-gray-400">{{ t('account.order_item_ref') }} {{ item.reference }} — {{ t('account.order_item_qty') }} {{ item.quantity }}</p>
                <div v-if="item.reductionLabel" class="mt-1 flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5">{{ item.reductionLabel }}</span>
                  <span v-if="item.priceHTBeforeDiscount" class="text-[11px] text-red-600 line-through">{{ formatPrice(item.priceHTBeforeDiscount) }} HT</span>
                </div>
              </div>
              <p class="text-sm font-semibold text-gray-900 shrink-0">{{ formatPrice(item.priceTTC * item.quantity) }}</p>
            </div>
          </div>

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">{{ t('account.order_subtotal_ht') }}</span><span>{{ formatPrice(order.totalProducts) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">{{ t('account.order_shipping') }}</span><span>{{ formatPrice(order.totalShipping) }}</span></div>
              <div class="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-2">
                <span>{{ t('account.order_total_ttc') }}</span>
                <span class="text-primary-600">{{ formatPrice(order.totalPaidTTC) }}</span>
              </div>
            </div>
          </div>

          
          <div v-if="order.addressDelivery" class="bg-white rounded-xl p-6 border border-gray-100">
            <h2 class="text-sm font-semibold text-gray-500 mb-2">{{ t('account.order_delivery_address') }}</h2>
            <div class="text-sm text-gray-700">
              <p class="font-semibold">{{ order.addressDelivery.company || `${order.addressDelivery.firstname} ${order.addressDelivery.lastname}` }}</p>
              <p>{{ order.addressDelivery.address1 }}</p>
              <p>{{ order.addressDelivery.postcode }} {{ order.addressDelivery.city }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
