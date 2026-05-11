
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Ventes & CA</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Performance commerciale, évolution du chiffre d'affaires et top produits
          </p>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            v-for="p in periods"
            :key="p.value"
            @click="period = p.value; load()"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="period === p.value
              ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="kpi in kpiCards" :key="kpi.key" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-1">{{ kpi.label }}</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white">
            <template v-if="loading"><span class="inline-block h-7 w-24 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></template>
            <template v-else>{{ kpi.value }}</template>
          </p>
          <p v-if="!loading" class="text-xs mt-1 flex items-center gap-1" :class="kpi.trend > 0 ? 'text-success-600 dark:text-success-400' : kpi.trend < 0 ? 'text-danger-600 dark:text-danger-400' : 'text-gray-400'">
            <svg v-if="kpi.trend !== 0" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path v-if="kpi.trend > 0" stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
            {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}% vs {{ periodLabelShort }} précédent{{ periodDays > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Évolution du CA — 12 derniers mois</h2>
            <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Chiffre d'affaires TTC par mois</p>
          </div>
          <p v-if="!loading && monthlyTotal > 0" class="text-xs text-gray-500 dark:text-slate-500">
            Total 12 mois : <span class="font-bold text-gray-800 dark:text-slate-200">{{ fmtEur(monthlyTotal) }}</span>
          </p>
        </div>
        <div class="px-6 py-5">
          <div v-if="loading" class="h-56 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <HubSimpleChart v-else-if="data?.monthly?.length" :data="data.monthly" unit="€" />
          <div v-else class="h-56 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            Aucune donnée sur les 12 derniers mois.
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Top 10 produits</h2>
            <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Sur la période sélectionnée</p>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-slate-800">
            <template v-if="loading">
              <div v-for="i in 5" :key="i" class="px-6 py-3">
                <div class="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </template>
            <template v-else-if="data?.topProducts?.length">
              <div v-for="(p, idx) in data.topProducts" :key="p.productId" class="px-6 py-3 flex items-center gap-3">
                <span class="text-xs font-bold text-gray-400 dark:text-slate-500 w-5 text-right">{{ idx + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{{ p.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-slate-500">{{ p.qty }} unité{{ p.qty > 1 ? 's' : '' }} vendue{{ p.qty > 1 ? 's' : '' }}</p>
                </div>
                <p class="text-sm font-bold text-gray-800 dark:text-slate-200 shrink-0">{{ fmtEur(p.revenue) }}</p>
              </div>
            </template>
            <div v-else class="px-6 py-10 text-center text-sm text-gray-400">Aucun produit vendu sur la période.</div>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Répartition par statut</h2>
            <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ statusTotalCount }} commande{{ statusTotalCount > 1 ? 's' : '' }} sur la période</p>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-slate-800">
            <template v-if="loading">
              <div v-for="i in 4" :key="i" class="px-6 py-3">
                <div class="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </template>
            <template v-else-if="data?.byStatus?.length">
              <div v-for="s in data.byStatus" :key="s.statusId" class="px-6 py-3">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: s.color || '#9ca3af' }" />
                    <p class="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{{ s.name }}</p>
                  </div>
                  <p class="text-sm font-bold text-gray-800 dark:text-slate-200 shrink-0 tabular-nums">{{ s.count }}</p>
                </div>
                <div class="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: `${statusPct(s.count)}%`, backgroundColor: s.color || '#9ca3af' }" />
                </div>
              </div>
            </template>
            <div v-else class="px-6 py-10 text-center text-sm text-gray-400">Aucune commande sur la période.</div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface KpiBlock  { current: number; previous: number; trend: number }
interface SalesData {
  period: number
  kpis: { revenue: KpiBlock; revenueHT: KpiBlock; orders: KpiBlock; avgCart: KpiBlock }
  monthly: { label: string; ym: string; orders: number; value: number }[]
  topProducts: { productId: number; name: string; qty: number; revenue: number }[]
  byStatus: { statusId: number; name: string; color: string | null; count: number; revenue: number }[]
}

const periods = [
  { value: 7,   label: '7 j' },
  { value: 30,  label: '30 j' },
  { value: 90,  label: '90 j' },
  { value: 365, label: '1 an' },
]
const period  = ref(30)
const data    = ref<SalesData | null>(null)
const loading = ref(true)

const periodDays       = computed(() => period.value)
const periodLabelShort = computed(() => {
  if (period.value === 7)   return '7 j'
  if (period.value === 30)  return '30 j'
  if (period.value === 90)  return '90 j'
  return '1 an'
})

const fmtEur = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtInt = (v: number) => v.toLocaleString('fr-FR')

const kpiCards = computed(() => {
  const k = data.value?.kpis
  return [
    { key: 'revenue',   label: "Chiffre d'affaires TTC",   value: fmtEur(k?.revenue.current   ?? 0), trend: k?.revenue.trend   ?? 0 },
    { key: 'revenueHT', label: "Chiffre d'affaires HT",    value: fmtEur(k?.revenueHT.current ?? 0), trend: k?.revenueHT.trend ?? 0 },
    { key: 'orders',    label: 'Commandes payées',         value: fmtInt(k?.orders.current    ?? 0), trend: k?.orders.trend    ?? 0 },
    { key: 'avgCart',   label: 'Panier moyen TTC',         value: fmtEur(k?.avgCart.current   ?? 0), trend: k?.avgCart.trend   ?? 0 },
  ]
})

const monthlyTotal = computed(() => data.value?.monthly.reduce((s, m) => s + m.value, 0) ?? 0)
const statusTotalCount = computed(() => data.value?.byStatus.reduce((s, x) => s + x.count, 0) ?? 0)
const statusPct = (count: number) => statusTotalCount.value > 0 ? (count / statusTotalCount.value) * 100 : 0

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<SalesData>('/api/bo/bi/sales', { query: { period: period.value } })
  } catch (e) {
    console.error('[hub/bi/sales] fetch error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
