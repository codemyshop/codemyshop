<!--
  @author CodeMyShop | FIN — Trésorerie & Prévisionnel 13 semaines
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Trésorerie</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Prévisionnel cashflow 13 semaines glissantes — historique réel + projection</p>
        </div>
        <button @click="exportCsv" :disabled="!data?.weeks.length"
          class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/></svg>
          Export CSV
        </button>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Solde estimé</p>
          <p class="text-2xl font-extrabold tabular-nums" :class="(data?.currentBalance ?? 0) < 0 ? 'text-danger-600' : ''">{{ fmtEur(data?.currentBalance ?? 0) }}</p>
          <p class="text-[10px] text-gray-400 mt-1">YTD net (encaissements − avoirs)</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Encaissé YTD</p>
          <p class="text-2xl font-extrabold tabular-nums text-emerald-600">{{ fmtEur(data?.ytdInflow ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Avoirs YTD</p>
          <p class="text-2xl font-extrabold tabular-nums text-danger-600">{{ fmtEur(data?.ytdOutflow ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Carnet à encaisser</p>
          <p class="text-2xl font-extrabold tabular-nums text-primary-600">{{ fmtEur(data?.pendingOrders.amount ?? 0) }}</p>
          <p class="text-[10px] text-gray-400 mt-1">{{ data?.pendingOrders.count ?? 0 }} commande(s) non finalisée(s)</p>
        </div>
      </div>

      <!-- Alertes -->
      <div v-if="data?.alerts.length" class="space-y-2">
        <div v-for="a in data.alerts" :key="a.week"
          class="rounded-xl border px-4 py-3 flex items-center gap-3 text-sm"
          :class="a.severity === 'critical'
            ? 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/30 text-danger-800 dark:text-danger-300'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'">
          <span class="text-lg">{{ a.severity === 'critical' ? '⛔' : '⚠️' }}</span>
          <p class="flex-1">
            <span class="font-bold">{{ a.label }}</span> — solde projeté
            <span class="font-bold tabular-nums">{{ fmtEur(a.balance) }}</span>
            <span v-if="a.severity === 'critical'"> (négatif)</span>
            <span v-else> sous le seuil de 4 semaines de décaissements</span>
          </p>
        </div>
      </div>

      <!-- Graphe (barres + ligne solde) -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold">Cashflow hebdomadaire</h2>
            <p class="text-[11px] text-gray-500 mt-0.5">Médiane d'encaissements projetée : <span class="font-semibold tabular-nums">{{ fmtEur(data?.weeklyInflowMedian ?? 0) }}/sem</span></p>
          </div>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500"/> Encaissements</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-danger-400"/> Décaissements</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-3 h-0.5 bg-primary-600"/> Solde glissant</span>
          </div>
        </div>
        <div v-if="loading" class="px-6 py-12 text-center text-sm text-gray-400">Chargement…</div>
        <div v-else-if="!data?.weeks.length" class="px-6 py-12 text-center text-sm text-gray-400">Aucune donnée disponible.</div>
        <div v-else class="px-6 py-5">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full h-64" preserveAspectRatio="none">
            <line :x1="histDividerX" :y1="0" :x2="histDividerX" :y2="chartH - 22"
              stroke="currentColor" stroke-dasharray="3 3" class="text-gray-300 dark:text-slate-700" />
            <text :x="histDividerX - 4" y="12" text-anchor="end" class="fill-gray-400 text-[9px]">Historique</text>
            <text :x="histDividerX + 4" y="12" text-anchor="start" class="fill-primary-600 text-[9px] font-semibold">Projection</text>
            <line :x1="0" :y1="zeroY" :x2="chartW" :y2="zeroY" stroke="currentColor" class="text-gray-200 dark:text-slate-800" stroke-width="1"/>
            <g v-for="(w, i) in data.weeks" :key="w.key">
              <rect
                :x="barX(i)"
                :y="barY(w.inflow)"
                :width="barW"
                :height="barH(w.inflow)"
                :class="w.isHistory ? 'fill-emerald-500' : 'fill-emerald-400/60'"
                rx="1.5"
              />
              <rect
                :x="barX(i) + barW + 1"
                :y="zeroY"
                :width="barW"
                :height="barH(w.outflow)"
                :class="w.isHistory ? 'fill-danger-400' : 'fill-danger-300/60'"
                rx="1.5"
              />
            </g>
            <polyline :points="balancePath" fill="none" stroke="currentColor" stroke-width="2" class="text-primary-600" stroke-linejoin="round"/>
            <g v-for="(w, i) in data.weeks" :key="`pt-${w.key}`">
              <circle :cx="balanceX(i)" :cy="balanceY(w.balance)" r="2.5" class="fill-primary-600"/>
            </g>
            <g v-for="(w, i) in data.weeks" :key="`lbl-${w.key}`">
              <text v-if="i % 2 === 0" :x="balanceX(i)" :y="chartH - 6" text-anchor="middle"
                class="fill-gray-400 text-[8px]">{{ w.label.split(' · ')[0] }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Detailed table -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold">Détail semaine par semaine</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Semaine</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Type</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Encaissements</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Décaissements</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Net</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Solde</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="loading"><td colspan="6" class="px-4 py-8 text-center text-gray-400">Chargement…</td></tr>
              <tr v-else-if="!data?.weeks.length"><td colspan="6" class="px-4 py-8 text-center text-gray-400">Aucune donnée.</td></tr>
              <tr v-for="w in data?.weeks" :key="w.key" class="hover:bg-gray-50 dark:hover:bg-slate-800/40"
                :class="w.balance < 0 ? 'bg-danger-50/50 dark:bg-danger-500/5' : ''">
                <td class="px-4 py-2">
                  <p class="font-semibold">{{ w.label }}</p>
                  <p class="text-[10px] text-gray-400">{{ w.startDate }}</p>
                </td>
                <td class="px-4 py-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                    :class="w.isHistory
                      ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'">
                    {{ w.isHistory ? 'Réel' : 'Projection' }}{{ w.isPending ? ' + carnet' : '' }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums text-emerald-600">{{ fmtEur(w.inflow) }}</td>
                <td class="px-4 py-2 text-right tabular-nums text-danger-600">{{ fmtEur(w.outflow) }}</td>
                <td class="px-4 py-2 text-right tabular-nums font-semibold" :class="w.net < 0 ? 'text-danger-600' : ''">{{ fmtEur(w.net) }}</td>
                <td class="px-4 py-2 text-right tabular-nums font-bold" :class="w.balance < 0 ? 'text-danger-600' : 'text-primary-600'">{{ fmtEur(w.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Methodological note -->
      <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
        <p class="font-bold mb-1">⚠️ Méthodologie</p>
        <p>Projection basée sur la médiane glissante des 13 dernières semaines de la boutique PrestaShop. Le carnet de commandes non finalisées (60 derniers jours) est injecté en S+1. Salaires, charges sociales et paiements fournisseurs ne sont pas inclus — à intégrer via votre logiciel de comptabilité.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface TreasuryWeek {
  key: string
  label: string
  startDate: string
  isHistory: boolean
  inflow: number
  outflow: number
  net: number
  balance: number
  orders?: number
  isPending?: boolean
}
interface TreasuryData {
  currentBalance: number
  ytdInflow: number
  ytdOutflow: number
  weeklyInflowMedian: number
  weeklyOutflowMedian: number
  pendingOrders: { count: number; amount: number }
  pendingRefunds: { count: number; amount: number }
  weeks: TreasuryWeek[]
  alerts: Array<{ week: string; label: string; balance: number; severity: 'critical' | 'warning' }>
}

const data = ref<TreasuryData | null>(null)
const loading = ref(true)

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

async function load() {
  loading.value = true
  try { data.value = await $fetch<TreasuryData>('/api/bo/finance/treasury') }
  catch { data.value = null }
  finally { loading.value = false }
}
onMounted(load)

/* ─── Chart geometry ─────────────────────────────────────────────── */
const chartW = 800
const chartH = 240
const padTop = 18
const padBottom = 22

const weeks = computed(() => data.value?.weeks ?? [])
const histCount = computed(() => weeks.value.filter(w => w.isHistory).length)
const slotW = computed(() => weeks.value.length ? chartW / weeks.value.length : 0)
const barW = computed(() => Math.max(4, (slotW.value - 4) / 2))

const yMax = computed(() => {
  const vals = weeks.value.flatMap(w => [w.inflow, Math.abs(w.outflow), Math.abs(w.balance)])
  return Math.max(1, ...vals)
})
const yMin = computed(() => {
  const minBal = Math.min(0, ...weeks.value.map(w => w.balance))
  const maxOut = Math.max(0, ...weeks.value.map(w => w.outflow))
  return Math.min(minBal, -maxOut)
})
const range = computed(() => yMax.value - yMin.value || 1)
const zeroY = computed(() => padTop + ((yMax.value) / range.value) * (chartH - padTop - padBottom))

const barX = (i: number) => i * slotW.value + (slotW.value - barW.value * 2 - 1) / 2
const barH = (v: number) => Math.abs(v) / range.value * (chartH - padTop - padBottom)
const barY = (v: number) => zeroY.value - barH(v)

const balanceX = (i: number) => i * slotW.value + slotW.value / 2
const balanceY = (v: number) => padTop + ((yMax.value - v) / range.value) * (chartH - padTop - padBottom)
const balancePath = computed(() => weeks.value.map((w, i) => `${balanceX(i)},${balanceY(w.balance)}`).join(' '))

const histDividerX = computed(() => histCount.value * slotW.value)

/* ─── Export CSV ─────────────────────────────────────────────────── */
function exportCsv() {
  if (!data.value?.weeks.length) return
  const headers = ['Semaine', 'Date début', 'Type', 'Encaissements', 'Décaissements', 'Net', 'Solde']
  const rows = data.value.weeks.map(w => [
    w.label, w.startDate,
    w.isHistory ? 'Réel' : 'Projection',
    w.inflow, w.outflow, w.net, w.balance,
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `tresorerie_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}
</script>
