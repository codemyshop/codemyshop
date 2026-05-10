<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Commandes</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} commande{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" @change="goPage(1)" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option value="">Tous les statuts</option>
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <input v-model="search" type="text" placeholder="Réf, client, email…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
      </div>
    </header>

    <!-- Pagination top -->
    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="commandes"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <div v-if="loading && !orders.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!orders.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune commande trouvée</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">
              # <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('customer')">
              Client <span v-if="sortBy === 'customer'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">Société</th>
            <th class="px-4 py-2.5 font-medium">Statut</th>
            <th class="px-4 py-2.5 font-medium">Paiement</th>
            <th class="px-4 py-2.5 font-medium text-right cursor-pointer hover:text-gray-600" @click="toggleSort('total')">
              Total TTC <span v-if="sortBy === 'total'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('date')">
              Date <span v-if="sortBy === 'date'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-4 py-2.5">
              <NuxtLink :to="`/hub/orders/${o.id}`" class="font-mono text-xs text-primary-600 hover:underline font-medium">#{{ o.id }}</NuxtLink>
              <span class="ml-1 text-[10px] text-gray-400">{{ o.reference }}</span>
            </td>
            <td class="px-4 py-2.5">
              <p class="text-gray-800 dark:text-slate-100 text-sm truncate max-w-[160px]">{{ o.customerName }}</p>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[140px]">{{ o.customerCompany || '—' }}</td>
            <td class="px-4 py-2.5">
              <select
                :value="o.statusId"
                @change="changeStatus(o, Number(($event.target as HTMLSelectElement).value))"
                class="text-[11px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer"
                :style="{ backgroundColor: (o.statusColor || '#999') + '20', color: o.statusColor || '#999' }"
              >
                <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[120px]">{{ o.payment }}</td>
            <td class="px-4 py-2.5 text-right font-bold text-sm">{{ formatEur(o.totalPaidTTC) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(o.dateAdd) }}</td>
            <td class="px-4 py-2.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <a v-if="o.invoiceId" :href="`/api/bo/invoices/pdf?id=${o.invoiceId}`" target="_blank" title="Facture PDF" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </a>
                <NuxtLink :to="`/hub/orders/${o.id}`" title="Voir détail" class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination bottom -->
    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="commandes" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const orders = ref<any[]>([])
const statuses = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')

const { user } = useAuth()

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  else { sortBy.value = col; sortDir.value = 'DESC' }
  goPage(1)
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/orders', {
      query: { page: page.value, perPage: perPage.value, search: search.value, status: statusFilter.value, sort: sortBy.value, dir: sortDir.value },
    })
    orders.value = data.orders ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

async function changeStatus(order: any, newStatusId: number) {
  if (order.statusId === newStatusId) return
  try {
    await $fetch(`/api/bo/orders/${order.id}/status`, {
      method: 'PUT',
      body: { statusId: newStatusId, employeeId: user.value?.id },
    })
    order.statusId = newStatusId
    const s = statuses.value.find(s => s.id === newStatusId)
    if (s) { order.status = s.name; order.statusColor = s.color }
  } catch (err: any) {
    console.error('Status update error:', err)
  }
}

async function loadStatuses() {
  try {
    const data = await $fetch<any>('/api/bo/orders/statuses')
    statuses.value = data.statuses ?? []
  } catch { /* silent */ }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(() => { loadStatuses(); load() })
</script>
