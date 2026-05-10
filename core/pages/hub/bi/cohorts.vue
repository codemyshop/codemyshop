<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  BI — Cohortes clients. Matrice de rétention 12 mois, LTV par cohorte,
  segmentation RFM (Champions, Loyaux, Nouveaux, À risque, Dormants, Perdus).
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Cohortes Clients</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Rétention mensuelle, LTV par cohorte d'acquisition, segmentation RFM
          </p>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- Segmentation RFM -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Segmentation RFM</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Récence / Fréquence / Montant — {{ data?.rfm.total ?? 0 }} client{{ (data?.rfm.total ?? 0) > 1 ? 's' : '' }} classifié{{ (data?.rfm.total ?? 0) > 1 ? 's' : '' }}
          </p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-800">
          <div v-for="seg in rfmSegments" :key="seg.key" class="px-5 py-4">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2.5 h-2.5 rounded-full" :class="seg.dotClass" />
              <p class="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wide">{{ seg.label }}</p>
            </div>
            <p class="text-2xl font-extrabold text-gray-900 dark:text-white">
              <template v-if="loading"><span class="inline-block h-7 w-12 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></template>
              <template v-else>{{ seg.value }}</template>
            </p>
            <p v-if="!loading" class="text-xs text-gray-400 mt-0.5">{{ seg.hint }}</p>
          </div>
        </div>
      </div>

      <!-- LTV par cohorte -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">LTV par cohorte</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Revenu cumulé moyen par client (depuis acquisition)</p>
        </div>
        <div class="px-6 py-5">
          <div v-if="loading" class="h-44 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <HubSimpleChart v-else-if="ltvChart.length" :data="ltvChart" unit="€" />
          <div v-else class="h-44 flex items-center justify-center text-sm text-gray-400">Pas encore assez de cohortes pour mesurer la LTV.</div>
        </div>
      </div>

      <!-- Retention matrix -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Matrice de rétention</h2>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Pourcentage de clients de la cohorte ayant racheté N mois après l'acquisition
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 sticky left-0 bg-gray-50 dark:bg-slate-800/50">Cohorte</th>
                <th class="px-3 py-3 text-right font-semibold text-gray-500 dark:text-slate-400">Size</th>
                <th v-for="m in maxMonths" :key="m" class="px-2 py-3 text-center font-semibold text-gray-500 dark:text-slate-400 min-w-[52px]">M+{{ m }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <template v-if="loading">
                <tr v-for="i in 6" :key="i">
                  <td class="px-4 py-3"><div class="h-4 w-16 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                  <td class="px-3 py-3"><div class="h-4 w-8 bg-gray-100 dark:bg-slate-800 rounded animate-pulse ml-auto" /></td>
                  <td v-for="m in maxMonths" :key="m" class="px-2 py-3"><div class="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              </template>
              <template v-else-if="data?.cohorts.length">
                <tr v-for="row in data.cohorts" :key="row.cohort" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-medium text-gray-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900">{{ formatCohort(row.cohort) }}</td>
                  <td class="px-3 py-3 text-right font-semibold text-gray-700 dark:text-slate-300 tabular-nums">{{ row.size }}</td>
                  <td v-for="m in maxMonths" :key="m" class="px-2 py-3 text-center tabular-nums"
                      :style="cellStyle(row, m)">
                    <template v-if="getCell(row, m)">
                      {{ getCell(row, m)!.retention }}%
                    </template>
                    <span v-else class="text-gray-300 dark:text-slate-700">·</span>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td :colspan="maxMonths + 2" class="px-6 py-12 text-center text-sm text-gray-400">
                  Pas encore assez de commandes pour construire les cohortes.
                </td>
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

interface CohortCell { monthDelta: number; active: number; retention: number; revenue: number }
interface CohortRow  { cohort: string; size: number; cells: CohortCell[] }
interface LtvRow     { cohort: string; size: number; totalRevenue: number; ltv: number }
interface Rfm        { champions: number; loyal: number; newbies: number; atRisk: number; dormant: number; lost: number; total: number }
interface CohortsData { cohorts: CohortRow[]; ltv: LtvRow[]; rfm: Rfm }

const data    = ref<CohortsData | null>(null)
const loading = ref(true)

const fmtEur = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const formatCohort = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${MONTHS_FR[Number(m) - 1] ?? m} ${y.slice(2)}`
}

// Max number of month columns to display (based on the oldest cohort)
const maxMonths = computed(() => {
  if (!data.value?.cohorts.length) return 11
  return Math.max(...data.value.cohorts.map(c =>
    c.cells.length ? Math.max(...c.cells.map(x => x.monthDelta)) : 0,
  ))
})

const getCell = (row: CohortRow, m: number) => row.cells.find(c => c.monthDelta === m)

// Heatmap: color based on retention (0 = transparent, 100 = dark primary)
function cellStyle(row: CohortRow, m: number): Record<string, string> {
  const c = getCell(row, m)
  if (!c) return {}
  const alpha = Math.min(1, c.retention / 80)
  const weight = c.retention > 60 ? 700 : c.retention > 30 ? 500 : 400
  return {
    backgroundColor: `rgba(79, 70, 229, ${alpha * 0.35})`,
    color: c.retention > 50 ? '#312e81' : '#1f2937',
    fontWeight: String(weight),
  }
}

const ltvChart = computed(() =>
  (data.value?.ltv || [])
    .filter(l => l.size > 0)
    .map(l => ({ label: formatCohort(l.cohort), value: l.ltv })),
)

const rfmSegments = computed(() => {
  const r = data.value?.rfm
  return [
    { key: 'champions', label: 'Champions',  value: r?.champions ?? 0, hint: 'R≤30j · F≥3 · M≥200€',  dotClass: 'bg-success-500' },
    { key: 'loyal',     label: 'Loyaux',     value: r?.loyal     ?? 0, hint: 'R≤90j · F≥2',            dotClass: 'bg-primary-500' },
    { key: 'newbies',   label: 'Nouveaux',   value: r?.newbies   ?? 0, hint: 'R≤30j · F=1',            dotClass: 'bg-sky-500' },
    { key: 'atRisk',    label: 'À risque',   value: r?.atRisk    ?? 0, hint: '91-180j · F≥2',          dotClass: 'bg-amber-500' },
    { key: 'dormant',   label: 'Dormants',   value: r?.dormant   ?? 0, hint: '31-90j · F=1',           dotClass: 'bg-gray-400' },
    { key: 'lost',      label: 'Perdus',     value: r?.lost      ?? 0, hint: 'R>180j',                 dotClass: 'bg-danger-500' },
  ]
})

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<CohortsData>('/api/bo/bi/cohorts')
  } catch (e) {
    console.error('[hub/bi/cohorts] fetch error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
