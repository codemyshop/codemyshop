<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Expéditions</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} expédition{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setFilter(4)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 4 ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            Expédiées
          </button>
          <button @click="setFilter(5)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 5 ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            Livrées
          </button>
          <button @click="setFilter(0)" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 0 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            Toutes
          </button>
        </div>
        <input v-model="search" type="text" placeholder="Réf, client…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-40" @keyup.enter="load" />
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">Actualiser</button>
      </div>
    </header>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="expéditions"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!orders.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune expédition</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">Réf</th>
            <th class="px-4 py-2.5 font-medium">Client</th>
            <th class="px-4 py-2.5 font-medium">Société</th>
            <th class="px-4 py-2.5 font-medium text-right">Total TTC</th>
            <th class="px-4 py-2.5 font-medium text-right">Frais port</th>
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
            <td class="px-4 py-2.5 text-right text-xs text-gray-500">{{ formatEur(o.totalShipping) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(o.dateAdd) }}</td>
            <td class="px-4 py-2.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :style="{ backgroundColor: (o.statusColor || '#999') + '20', color: o.statusColor || '#999' }">
                {{ o.status }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <button v-if="o.statusId === 4" @click="markDelivered(o)" :disabled="updating === o.id"
                  class="text-[11px] px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40">
                  Livré
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

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="expéditions" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

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
const statusFilter = ref(4) // 4=expédié par défaut
const updating = ref<number | null>(null)

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

async function markDelivered(order: any) {
  updating.value = order.id
  try {
    await $fetch(`/api/bo/orders/${order.id}/status`, { method: 'PUT', body: { statusId: 5 } })
    await load()
  } finally { updating.value = null }
}

async function load() {
  loading.value = true
  try {
    if (statusFilter.value === 0) {
      // Fetch both shipped + delivered
      const data = await $fetch<any>('/api/bo/orders', { query: { page: page.value, perPage: perPage.value, search: search.value, sort: 'date', dir: 'DESC' } })
      // Filter client-side for status 4+5
      orders.value = (data.orders ?? []).filter((o: any) => o.statusId === 4 || o.statusId === 5)
      total.value = orders.value.length
      totalPages.value = 1
    } else {
      const data = await $fetch<any>('/api/bo/orders', { query: { page: page.value, perPage: perPage.value, search: search.value, status: statusFilter.value, sort: 'date', dir: 'DESC' } })
      orders.value = data.orders ?? []
      total.value = data.total ?? 0
      totalPages.value = data.totalPages ?? 0
    }
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(() => load())
</script>
