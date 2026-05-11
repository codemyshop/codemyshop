
<script setup lang="ts">
import type { OrderData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const brand = String((_cfg.public as any).brandName ?? '')
const { customer, checkSession } = useCustomerAuth()
const orders = ref<OrderData[]>([])
const loading = ref(true)
const selectedIds = ref<Set<number>>(new Set())
const downloading = ref(false)

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

const invoiceOrders = computed(() => orders.value.filter(o => o.invoiceNumber))
const allSelected = computed(() => invoiceOrders.value.length > 0 && invoiceOrders.value.every(o => selectedIds.value.has(o.id)))

function toggleSelect(orderId: number) {
  const s = new Set(selectedIds.value)
  if (s.has(orderId)) s.delete(orderId)
  else s.add(orderId)
  selectedIds.value = s
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(invoiceOrders.value.map(o => o.id))
  }
}

async function downloadInvoices() {
  if (!customer.value || !selectedIds.value.size) return
  downloading.value = true
  try {
    const ids = [...selectedIds.value].join(',')
    const zip = await $fetch<Blob>('/api/orders/invoices', {
      query: { clientId, customerId: customer.value.customerId, ids },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url
    a.download = brand ? `factures-${brand.toLowerCase()}.zip` : 'factures.zip'
    a.click()
    URL.revokeObjectURL(url)
  } catch {  }
  finally { downloading.value = false }
}

async function downloadAllInvoices() {
  if (!customer.value) return
  downloading.value = true
  try {
    const zip = await $fetch<Blob>('/api/orders/invoices', {
      query: { clientId, customerId: customer.value.customerId },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url
    a.download = brand ? `factures-${brand.toLowerCase()}.zip` : 'factures.zip'
    a.click()
    URL.revokeObjectURL(url)
  } catch {  }
  finally { downloading.value = false }
}

async function loadOrders() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion')
  }
  loading.value = true
  try {
    orders.value = await $fetch<OrderData[]>('/api/orders', {
      query: { customerId: customer.value!.customerId, clientId, limit: 50 },
    })
  } catch {  }
  finally { loading.value = false }
}

onMounted(loadOrders)
useHead({ title: brand ? `Mes commandes — ${brand}` : 'Mes commandes' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <NuxtLink to="/mon-compte" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">{{ t('account.orders_title') }}</h1>
          </div>

          
          <div v-if="!loading && invoiceOrders.length" class="flex items-center gap-2">
            <button
              v-if="selectedIds.size > 0"
              :disabled="downloading"
              class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              @click="downloadInvoices"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
              {{ downloading ? t('account.orders_downloading') : `${selectedIds.size} facture${selectedIds.size > 1 ? 's' : ''} (ZIP)` }}
            </button>
            <button
              v-else
              :disabled="downloading"
              class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-600 hover:text-white transition-colors disabled:opacity-50"
              @click="downloadAllInvoices"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
              {{ downloading ? t('account.orders_downloading') : t('account.orders_all_invoices') }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading') }}</div>

        <div v-else-if="orders.length" class="space-y-3">

          
          <div v-if="invoiceOrders.length" class="flex items-center gap-2 px-2 pb-2">
            <input
              type="checkbox"
              :checked="allSelected"
              class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
              @change="toggleAll"
            />
            <span class="text-xs text-gray-400">{{ t('account.orders_select_all') }} ({{ invoiceOrders.length }})</span>
          </div>

          
          <div
            v-for="order in orders"
            :key="order.id"
            class="flex items-center gap-3"
          >
            
            <div class="shrink-0 w-6 flex justify-center">
              <input
                v-if="order.invoiceNumber"
                type="checkbox"
                :checked="selectedIds.has(order.id)"
                class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                @change="toggleSelect(order.id)"
              />
            </div>

            <NuxtLink
              :to="`/mon-compte/commandes/${order.id}`"
              class="flex-1 bg-white rounded-xl p-5 border border-gray-100 hover:border-primary-600 transition-colors"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <span class="text-sm font-bold text-gray-900">#{{ order.reference }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ formatDate(order.dateAdd) }}</span>
                </div>
                <span class="text-sm font-bold text-primary-600">{{ formatPrice(order.totalPaidTTC) }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500">{{ order.status }}</span>
                <span class="text-xs text-gray-400">{{ order.items.length }} article{{ order.items.length > 1 ? 's' : '' }}</span>
                <span class="text-xs text-gray-400">{{ order.payment }}</span>
                <span v-if="order.invoiceNumber" class="text-[10px] text-primary-600 font-medium">{{ t('account.orders_invoice_number') }}{{ order.invoiceNumber }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <div v-else class="text-center py-16">
          <p class="text-gray-500 text-sm mb-4">{{ t('account.orders_empty') }}</p>
          <NuxtLink to="/" class="inline-flex px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl text-sm">{{ t('account.orders_discover') }}</NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
