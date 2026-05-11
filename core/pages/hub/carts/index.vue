<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Paniers</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} panier{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" placeholder="Client, email…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
      </div>
    </header>

    
    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="paniers"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !carts.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!carts.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun panier trouvé</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">
              ID <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">Client</th>
            <th class="px-4 py-2.5 font-medium">Email</th>
            <th class="px-4 py-2.5 font-medium text-center">Articles</th>
            <th class="px-4 py-2.5 font-medium text-center">Qté</th>
            <th class="px-4 py-2.5 font-medium text-center">Converti</th>
            <th class="px-4 py-2.5 font-medium text-center" title="Nombre de relances envoyées (cs_cart_recovery)">Relances</th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('date')">
              Créé le <span v-if="sortBy === 'date'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-4 py-2.5 font-medium">Mis à jour</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in carts" :key="c.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" @click="$router.push(`/hub/carts/${c.id}`)">
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ c.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 truncate max-w-[160px]">{{ c.customerName }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-400 truncate max-w-[160px]">{{ c.customerEmail || '—' }}</td>
            <td class="px-4 py-2.5 text-center font-medium">{{ c.nbItems }}</td>
            <td class="px-4 py-2.5 text-center">{{ c.totalProducts }}</td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="c.hasOrder > 0" class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">Oui</span>
              <span v-else class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Non</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="Number(c.recoveriesCount) > 0" class="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                {{ c.recoveriesCount }}
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(c.dateAdd) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(c.dateUpd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="paniers" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const carts = ref<any[]>([])
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
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')

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
    const data = await $fetch<any>('/api/bo/carts', { query: { page: page.value, perPage: perPage.value, search: search.value, sort: sortBy.value, dir: sortDir.value } })
    carts.value = data.carts ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

onMounted(load)
</script>
