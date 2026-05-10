<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Demandes de devis</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} devis</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" @change="goPage(1)" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option value="">Tous</option>
          <option value="pending">En attente</option>
          <option value="processing">En cours</option>
          <option value="sent">Envoyé</option>
          <option value="accepted">Accepté</option>
          <option value="refused">Refusé</option>
          <option value="expired">Expiré</option>
        </select>
        <input v-model="search" type="text" placeholder="Client, email, société…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
        <button @click="showCreate = true" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau devis
        </button>
      </div>
    </header>

    <HubCreateModal v-model="showCreate" title="Nouveau devis" :loading="creating" @submit="createQuote">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Prénom</label><input v-model="newQuote.firstname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Nom</label><input v-model="newQuote.lastname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        </div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Email</label><input v-model="newQuote.email" type="email" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Société</label><input v-model="newQuote.company" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Téléphone</label><input v-model="newQuote.phone" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Message</label><textarea v-model="newQuote.message" rows="3" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none" /></div>
      </div>
    </HubCreateModal>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="devis"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !quotes.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!quotes.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun devis trouvé</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">#</th>
            <th class="px-4 py-2.5 font-medium">Client</th>
            <th class="px-4 py-2.5 font-medium">Société</th>
            <th class="px-4 py-2.5 font-medium">Activité</th>
            <th class="px-4 py-2.5 font-medium text-center">Articles</th>
            <th class="px-4 py-2.5 font-medium">Statut</th>
            <th class="px-4 py-2.5 font-medium text-center" title="Nombre de relances envoyées (cs_quote_recovery)">Relances</th>
            <th class="px-4 py-2.5 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in quotes" :key="q.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" @click="$router.push(`/hub/quotes/${q.id}`)">
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ q.id }}</td>
            <td class="px-4 py-2.5">
              <p class="text-gray-800 dark:text-slate-100">{{ q.firstname }} {{ q.lastname }}</p>
              <p class="text-[10px] text-gray-400">{{ q.email }}</p>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ q.company || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ q.activite || '—' }}</td>
            <td class="px-4 py-2.5 text-center font-medium">{{ q.totalItems }}</td>
            <td class="px-4 py-2.5">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusClass(q.status)">{{ statusLabel(q.status) }}</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="Number(q.recoveriesCount) > 0" class="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                {{ q.recoveriesCount }}
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(q.dateAdd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="devis" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const quotes = ref<any[]>([])
const showCreate = ref(false)
const creating = ref(false)
const newQuote = reactive({ firstname: '', lastname: '', email: '', company: '', phone: '', message: '' })

async function createQuote() {
  creating.value = true
  try {
    await $fetch('/api/quote/submit', { method: 'POST', body: { ...newQuote, items: [] } })
    showCreate.value = false
    Object.assign(newQuote, { firstname: '', lastname: '', email: '', company: '', phone: '', message: '' })
    await load()
  } finally { creating.value = false }
}
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

function statusClass(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600', processing: 'bg-blue-50 text-blue-600',
    sent: 'bg-indigo-50 text-indigo-600', accepted: 'bg-green-50 text-green-600',
    refused: 'bg-red-50 text-red-600', expired: 'bg-gray-100 text-gray-500',
  }
  return map[s] || 'bg-gray-100 text-gray-500'
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'En attente', processing: 'En cours', sent: 'Envoyé',
    accepted: 'Accepté', refused: 'Refusé', expired: 'Expiré',
  }
  return map[s] || s
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/quotes', { query: { page: page.value, perPage: perPage.value, search: search.value, status: statusFilter.value } })
    quotes.value = data.quotes ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(load)
</script>
