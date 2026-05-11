
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Paiements & Rapprochements</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Breakdown par méthode de paiement, derniers encaissements</p>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button v-for="p in [7,30,90,365]" :key="p" @click="period = p; load()"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="period === p ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            {{ p === 365 ? '1 an' : `${p} j` }}
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Encaissements TTC</p>
          <p class="text-2xl font-extrabold">{{ fmtEur(data?.totalRevenue ?? 0) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ data?.totalCount ?? 0 }} paiement(s)</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Méthodes distinctes</p>
          <p class="text-2xl font-extrabold">{{ data?.byMethod.length ?? 0 }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold">Répartition par méthode</h2>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-slate-800">
          <div v-if="loading" v-for="i in 4" :key="i" class="px-6 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></div>
          <template v-else-if="data?.byMethod.length">
            <div v-for="m in data.byMethod" :key="m.method" class="px-6 py-3">
              <div class="flex items-center justify-between mb-1.5">
                <div><p class="text-sm font-semibold">{{ m.method }}</p><p class="text-xs text-gray-500">{{ m.count }} paiement(s) · panier moyen {{ fmtEur(m.avgAmount) }}</p></div>
                <div class="text-right"><p class="text-sm font-bold tabular-nums">{{ fmtEur(m.revenue) }}</p><p class="text-xs text-gray-400">{{ m.share }}%</p></div>
              </div>
              <div class="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-primary-500 rounded-full" :style="{ width: `${m.share}%` }" />
              </div>
            </div>
          </template>
          <div v-else class="px-6 py-10 text-center text-sm text-gray-400">Aucun paiement sur la période.</div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800"><h2 class="text-sm font-bold">Derniers encaissements</h2></div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr><th class="px-4 py-2 text-left font-semibold text-gray-500">Référence</th><th class="px-4 py-2 text-left font-semibold text-gray-500">Client</th><th class="px-4 py-2 text-left font-semibold text-gray-500">Méthode</th><th class="px-4 py-2 text-right font-semibold text-gray-500">Montant</th><th class="px-4 py-2 text-right font-semibold text-gray-500">Date</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="!loading && !data?.recentPayments.length"><td colspan="5" class="px-4 py-8 text-center text-gray-400">Aucun encaissement récent.</td></tr>
              <tr v-for="p in data?.recentPayments" :key="p.id">
                <td class="px-4 py-2 font-mono text-[11px]">{{ p.reference }}</td>
                <td class="px-4 py-2">{{ p.customerName || '—' }}</td>
                <td class="px-4 py-2">{{ p.method }}</td>
                <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(p.amount) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(p.dateAdd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const period = ref(30)
const data = ref<any>(null)
const loading = ref(true)
const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/finance/payments', { query: { period: period.value } }) } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
