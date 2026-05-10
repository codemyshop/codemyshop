<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Encours B2B</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total ? `${total} client${total > 1 ? 's' : ''} avec encours autorisé` : 'Chargement…' }}</p>
      </div>
      <button @click="load" :disabled="loading" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Rafraîchir</button>
    </header>

    <!-- Total encours -->
    <div v-if="totalOutstanding > 0" class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-2.5 flex items-center gap-6 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Encours total autorisé</span>
        <span class="text-sm font-bold text-primary-600">{{ formatEur(totalOutstanding) }}</span>
      </div>
    </div>

    <div class="flex-1 overflow-auto px-6 py-4">
      <div v-if="loading && !customers.length" class="space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!customers.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun encours B2B configuré</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-3 font-medium">Client</th>
              <th class="px-4 py-3 font-medium">Société</th>
              <th class="px-4 py-3 font-medium">Email</th>
              <th class="px-4 py-3 font-medium text-right">Encours autorisé</th>
              <th class="px-4 py-3 font-medium text-right">Délai paiement</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers" :key="c.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">{{ c.firstname }} {{ c.lastname }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.company || '—' }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ c.email }}</td>
              <td class="px-4 py-3 text-right font-bold text-primary-600">{{ formatEur(c.outstandingAllowAmount) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">{{ c.maxPaymentDays ? `${c.maxPaymentDays}j` : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()
const customers = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const totalOutstanding = computed(() => customers.value.reduce((sum, c) => sum + c.outstandingAllowAmount, 0))

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/outstanding', { query: { limit: 100 } })
    customers.value = data.customers ?? []
    total.value = data.total ?? 0
  } finally { loading.value = false }
}

function formatEur(n: number) { return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(load)
</script>
