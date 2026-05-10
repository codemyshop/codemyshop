<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/hub/orders" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </NuxtLink>
      <div v-if="order" class="flex-1 min-w-0">
        <div class="flex items-center gap-3">
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Commande #{{ order.id }} — {{ order.reference }}</h1>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" :style="{ backgroundColor: (order.statusColor || '#999') + '20', color: order.statusColor || '#999' }">{{ order.status }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(order.dateAdd) }} — {{ order.payment }}</p>
      </div>
      <div v-if="order && invoice" class="flex items-center gap-2">
        <a :href="`/api/bo/invoices/pdf?id=${invoice.id}`" target="_blank" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Facture PDF
        </a>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8 space-y-4">
      <div v-for="i in 4" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="order" class="px-6 py-6 space-y-6">

      <!-- Row 1: Status + Financial summary -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Changement de statut -->
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Modifier le statut</h2>
          <select v-model="newStatusId" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-3">
            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <button @click="updateStatus" :disabled="newStatusId === order.statusId || updatingStatus" class="w-full text-xs py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">
            {{ updatingStatus ? 'Mise à jour…' : 'Appliquer' }}
          </button>
        </div>

        <!-- Financial summary -->
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Montants</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">Produits HT</dt><dd class="font-medium">{{ formatEur(order.totalProducts) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Livraison TTC</dt><dd class="font-medium">{{ formatEur(order.totalShippingTTC) }}</dd></div>
            <div v-if="order.totalDiscounts > 0" class="flex justify-between"><dt class="text-gray-500">Remises</dt><dd class="font-medium text-green-600">-{{ formatEur(order.totalDiscounts) }}</dd></div>
            <div class="flex justify-between border-t border-gray-100 dark:border-slate-800 pt-2">
              <dt class="text-gray-800 dark:text-slate-100 font-bold">Total TTC</dt>
              <dd class="font-bold text-lg">{{ formatEur(order.totalPaidTTC) }}</dd>
            </div>
          </dl>
        </div>

        <!-- Client -->
        <div v-if="customer" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Client</h2>
          <p class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ customer.firstname }} {{ customer.lastname }}</p>
          <p v-if="customer.company" class="text-xs text-gray-500">{{ customer.company }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ customer.email }}</p>
          <p v-if="customer.siret" class="text-xs text-gray-400">SIRET : {{ customer.siret }}</p>
          <p class="text-[10px] text-gray-300 mt-2">Client depuis {{ formatDate(customer.dateAdd) }}</p>
        </div>
      </div>

      <!-- Row 2 : Produits -->
      <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Produits ({{ items.length }})</h2>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
              <th class="px-5 py-2.5 font-medium">Produit</th>
              <th class="px-5 py-2.5 font-medium">Réf.</th>
              <th class="px-5 py-2.5 font-medium text-center">Qté</th>
              <th class="px-5 py-2.5 font-medium text-right">Prix unit. HT</th>
              <th class="px-5 py-2.5 font-medium text-right">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-b border-gray-50 dark:border-slate-800/50">
              <td class="px-5 py-3 text-gray-800 dark:text-slate-100">{{ item.name }}</td>
              <td class="px-5 py-3 font-mono text-xs text-gray-400">{{ item.reference }}</td>
              <td class="px-5 py-3 text-center font-medium">{{ item.quantity }}</td>
              <td class="px-5 py-3 text-right">
                <div class="flex items-baseline justify-end gap-1.5 flex-wrap">
                  <span>{{ formatEur(item.priceHT) }}</span>
                  <span
                    v-if="item.priceHTBeforeDiscount && item.priceHTBeforeDiscount > item.priceHT"
                    class="text-[11px] text-red-600 line-through"
                  >{{ formatEur(item.priceHTBeforeDiscount) }}</span>
                  <span
                    v-if="item.reductionPercent > 0"
                    class="text-[10px] font-bold text-white bg-red-600 rounded-full px-1.5 py-0.5"
                  >-{{ Math.round(item.reductionPercent * 100) }}%</span>
                </div>
              </td>
              <td class="px-5 py-3 text-right font-bold">{{ formatEur(item.totalTTC) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Row 3 : Adresses + Historique -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Adresse livraison -->
        <div v-if="addrDelivery" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">Adresse de livraison</h2>
          <div class="text-xs text-gray-600 leading-relaxed">
            <p class="font-medium">{{ addrDelivery.firstname }} {{ addrDelivery.lastname }}</p>
            <p v-if="addrDelivery.company">{{ addrDelivery.company }}</p>
            <p>{{ addrDelivery.address1 }}</p>
            <p v-if="addrDelivery.address2">{{ addrDelivery.address2 }}</p>
            <p>{{ addrDelivery.postcode }} {{ addrDelivery.city }}</p>
            <p>{{ addrDelivery.countryName }}</p>
            <p v-if="addrDelivery.phone" class="mt-1 text-gray-400">{{ addrDelivery.phone }}</p>
          </div>
        </div>

        <!-- Adresse facturation -->
        <div v-if="addrInvoice" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">Adresse de facturation</h2>
          <div class="text-xs text-gray-600 leading-relaxed">
            <p class="font-medium">{{ addrInvoice.firstname }} {{ addrInvoice.lastname }}</p>
            <p v-if="addrInvoice.company">{{ addrInvoice.company }}</p>
            <p>{{ addrInvoice.address1 }}</p>
            <p v-if="addrInvoice.address2">{{ addrInvoice.address2 }}</p>
            <p>{{ addrInvoice.postcode }} {{ addrInvoice.city }}</p>
            <p>{{ addrInvoice.countryName }}</p>
          </div>
        </div>

        <!-- Historique -->
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Historique</h2>
          <div class="space-y-2 max-h-60 overflow-auto">
            <div v-for="h in history" :key="h.id" class="flex items-start gap-2">
              <span class="w-2 h-2 rounded-full mt-1 shrink-0" :style="{ backgroundColor: h.statusColor || '#999' }" />
              <div class="min-w-0">
                <p class="text-xs font-medium" :style="{ color: h.statusColor || '#999' }">{{ h.status }}</p>
                <p class="text-[10px] text-gray-400">{{ formatDateTime(h.dateAdd) }}<span v-if="h.employeeName"> — {{ h.employeeName }}</span></p>
              </div>
            </div>
            <p v-if="!history.length" class="text-xs text-gray-400">Aucun historique</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const route = useRoute()
const { user } = useAuth()

const order = ref<any>(null)
const customer = ref<any>(null)
const items = ref<any[]>([])
const history = ref<any[]>([])
const addrDelivery = ref<any>(null)
const addrInvoice = ref<any>(null)
const invoice = ref<any>(null)
const statuses = ref<any[]>([])
const newStatusId = ref(0)
const loading = ref(true)
const updatingStatus = ref(false)

async function load() {
  loading.value = true
  try {
    const [data, statusData] = await Promise.all([
      $fetch<any>(`/api/bo/orders/${route.params.id}`),
      $fetch<any>('/api/bo/orders/statuses'),
    ])
    order.value = data.order
    customer.value = data.customer
    items.value = data.items ?? []
    history.value = data.history ?? []
    addrDelivery.value = data.addrDelivery
    addrInvoice.value = data.addrInvoice
    invoice.value = data.invoice
    statuses.value = statusData.statuses ?? []
    newStatusId.value = order.value?.statusId ?? 0
  } finally { loading.value = false }
}

async function updateStatus() {
  if (!order.value || newStatusId.value === order.value.statusId) return
  updatingStatus.value = true
  try {
    await $fetch(`/api/bo/orders/${route.params.id}/status`, {
      method: 'PUT',
      body: { statusId: newStatusId.value, employeeId: user.value?.id },
    })
    await load()
  } finally { updatingStatus.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatDateTime(d: string) { return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(load)
</script>
