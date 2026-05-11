<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">SAV — Tickets clients</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} ticket{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          type="text"
          placeholder="Email, nom, commande…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <select
          v-model="statusFilter"
          @change="applyFilter"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">Tous</option>
          <option value="open">Ouverts</option>
          <option value="pending1">En attente</option>
          <option value="closed">Fermés</option>
        </select>
      </div>
    </header>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-2.5 flex items-center gap-4 shrink-0">
      <button
        type="button"
        @click="setStatus('open')"
        class="flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-colors"
        :class="statusFilter === 'open'
          ? 'bg-red-50 text-red-600 font-medium'
          : 'text-gray-500 hover:bg-gray-50'"
      >
        <span class="w-2 h-2 rounded-full bg-red-400" />
        Ouverts
        <span class="font-bold">{{ counts.open }}</span>
      </button>
      <button
        type="button"
        @click="setStatus('pending1')"
        class="flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-colors"
        :class="statusFilter === 'pending1'
          ? 'bg-amber-50 text-amber-600 font-medium'
          : 'text-gray-500 hover:bg-gray-50'"
      >
        <span class="w-2 h-2 rounded-full bg-amber-400" />
        En attente
        <span class="font-bold">{{ counts.pending1 + counts.pending2 }}</span>
      </button>
      <button
        type="button"
        @click="setStatus('closed')"
        class="flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-colors"
        :class="statusFilter === 'closed'
          ? 'bg-emerald-50 text-emerald-600 font-medium'
          : 'text-gray-500 hover:bg-gray-50'"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-400" />
        Fermés
        <span class="font-bold">{{ counts.closed }}</span>
      </button>
      <button
        v-if="statusFilter"
        type="button"
        @click="setStatus('')"
        class="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
      >
        Réinitialiser le filtre
      </button>
    </div>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="tickets"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto px-6 py-4">
      <div v-if="loading && !threads.length" class="space-y-2">
        <div v-for="i in 8" :key="i" class="h-16 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!threads.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun ticket trouvé</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="t in threads"
          :key="t.id"
          class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
          @click="openThread(t.id)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono text-gray-400">#{{ t.id }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :class="statusClass(t.status)">
                  {{ statusLabel(t.status) }}
                </span>
                <span v-if="t.orderId" class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  Commande {{ t.orderReference || `#${t.orderId}` }}
                </span>
              </div>
              <p class="text-sm font-medium text-gray-800 dark:text-slate-100 mt-1 truncate">
                {{ t.customerName }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">
                {{ t.email }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-gray-500">{{ formatDate(t.dateUpd || t.dateAdd) }}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">
                {{ t.messagesCount }} message{{ t.messagesCount > 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="tickets" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('crm_sav')) {
  navigateTo('/hub/dashboard')
}

const router = useRouter()

const threads = ref<any[]>([])
const counts = ref({ open: 0, closed: 0, pending1: 0, pending2: 0 })
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

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

function setStatus(s: string) {
  statusFilter.value = statusFilter.value === s ? '' : s
  page.value = 1
  load()
}

function applyFilter() {
  page.value = 1
  load()
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

function openThread(id: number) {
  router.push(`/hub/sav/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/sav', {
      query: { page: page.value, perPage: perPage.value, search: search.value, status: statusFilter.value },
    })
    threads.value = data.threads ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
    counts.value = data.counts ?? { open: 0, closed: 0, pending1: 0, pending2: 0 }
  } finally { loading.value = false }
}

function statusClass(s: string) {
  if (s === 'open') return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  if (s === 'closed') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
  return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
}

function statusLabel(s: string) {
  if (s === 'open') return 'Ouvert'
  if (s === 'closed') return 'Fermé'
  if (s === 'pending1') return 'En attente'
  if (s === 'pending2') return 'En attente (2)'
  return s
}

function formatDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>
