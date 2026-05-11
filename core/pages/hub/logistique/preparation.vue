<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Préparation de commandes</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} commande{{ total > 1 ? 's' : '' }} à traiter</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setFilter(2)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 2 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            Payées ({{ counts.paid }})
          </button>
          <button @click="setFilter(3)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 3 ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'">
            En préparation ({{ counts.preparing }})
          </button>
          <button @click="setFilter(0)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 0 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            Toutes
          </button>
        </div>
        <input v-model="search" type="text" placeholder="Réf, client…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-40" @keyup.enter="load" />
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">Actualiser</button>
      </div>
    </header>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="commandes"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!orders.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune commande à préparer</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">Réf</th>
            <th class="px-4 py-2.5 font-medium">Client</th>
            <th class="px-4 py-2.5 font-medium">Société</th>
            <th class="px-4 py-2.5 font-medium text-right">Total TTC</th>
            <th class="px-4 py-2.5 font-medium">Paiement</th>
            <th class="px-4 py-2.5 font-medium">Date</th>
            <th class="px-4 py-2.5 font-medium">Statut</th>
            <th class="px-4 py-2.5 font-medium text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-4 py-2.5 font-mono text-xs font-medium text-primary-600">{{ o.reference }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ o.customerName }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ o.customerCompany || '—' }}</td>
            <td class="px-4 py-2.5 text-right font-bold">{{ formatEur(o.totalPaidTTC) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ o.payment }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(o.dateAdd) }}</td>
            <td class="px-4 py-2.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :style="{ backgroundColor: (o.statusColor || '#999') + '20', color: o.statusColor || '#999' }">
                {{ o.status }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <button v-if="o.statusId === 2" @click="changeStatus(o, 3)" :disabled="updating === o.id"
                  class="text-[11px] px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40">
                  Préparer
                </button>
                <button v-if="o.statusId === 3" @click="changeStatus(o, 4)" :disabled="updating === o.id"
                  class="text-[11px] px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40">
                  Expédier
                </button>
                <NuxtLink :to="`/hub/orders/${o.id}`" class="text-[11px] px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                  Détail
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="commandes" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  load()
}
const loading = ref(false)
const search = ref('')
const statusFilter = ref(0) 
const updating = ref<number | null>(null)
const counts = reactive({ paid: 0, preparing: 0 })

function setFilter(s: number) {
  statusFilter.value = s
  page.value = 1
  load()
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function changeStatus(order: any, newStatus: number) {
  updating.value = order.id
  try {
    await $fetch(`/api/bo/orders/${order.id}/status`, { method: 'PUT', body: { statusId: newStatus } })
    await load()
    await loadCounts()
  } finally { updating.value = null }
}

async function load() {
  loading.value = true
  try {
    
    if (statusFilter.value === 0) {
      const [r2, r3] = await Promise.all([
        $fetch<any>('/api/bo/orders', { query: { page: page.value, perPage: perPage.value, search: search.value, status: 2, sort: 'date', dir: 'DESC' } }),
        $fetch<any>('/api/bo/orders', { query: { page: 1, perPage: 100, status: 3, sort: 'date', dir: 'DESC' } }),
      ])
      
      const allOrders = [...(r3.orders || []), ...(r2.orders || [])]
      orders.value = allOrders.slice(0, perPage.value)
      total.value = (r2.total || 0) + (r3.total || 0)
      totalPages.value = Math.ceil(total.value / perPage.value)
    } else {
      const data = await $fetch<any>('/api/bo/orders', { query: { page: page.value, perPage: perPage.value, search: search.value, status: statusFilter.value, sort: 'date', dir: 'DESC' } })
      orders.value = data.orders ?? []
      total.value = data.total ?? 0
      totalPages.value = data.totalPages ?? 0
    }
  } finally { loading.value = false }
}

async function loadCounts() {
  const [c2, c3] = await Promise.all([
    $fetch<any>('/api/bo/orders', { query: { page: 1, perPage: 1, status: 2 } }).catch(() => ({ total: 0 })),
    $fetch<any>('/api/bo/orders', { query: { page: 1, perPage: 1, status: 3 } }).catch(() => ({ total: 0 })),
  ])
  counts.paid = c2.total ?? 0
  counts.preparing = c3.total ?? 0
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(() => { load(); loadCounts() })
</script>
