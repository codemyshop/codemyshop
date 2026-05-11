
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Relevé bancaire</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Lignes de compte — sync quotidienne via <span class="font-mono">ac_bank_sync</span> ·
            <NuxtLink to="/hub/finance/ae" class="text-primary-600 hover:underline">jauge AE →</NuxtLink>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button v-for="p in [30, 90, 365]" :key="p" @click="period = p; load()"
              class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              :class="period === p ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
              {{ p === 365 ? '1 an' : `${p} j` }}
            </button>
          </div>
          <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button v-for="s in statusOptions" :key="s.value" @click="status = s.value; load()"
              class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              :class="status === s.value ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-7xl mx-auto space-y-5">

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lignes</p>
          <p class="text-2xl font-extrabold">{{ data?.totals.total ?? 0 }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Crédits</p>
          <p class="text-2xl font-extrabold text-emerald-600">{{ fmtEur(data?.totals.credits ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Débits</p>
          <p class="text-2xl font-extrabold text-rose-600">{{ fmtEur(data?.totals.debits ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Non rapprochées</p>
          <p class="text-2xl font-extrabold" :class="(data?.totals.unreconciledCount ?? 0) > 0 ? 'text-amber-600' : ''">
            {{ data?.totals.unreconciledCount ?? 0 }}
          </p>
        </div>
      </div>

      <div v-if="data?.accounts.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm">
        <div class="flex items-center flex-wrap gap-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comptes :</p>
          <div v-for="a in data.accounts" :key="a.id" class="flex items-center gap-2 text-xs">
            <span class="font-semibold">{{ a.label }}</span>
            <span class="text-gray-400">({{ a.provider }})</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
              :class="a.lastStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' : a.lastStatus === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-500'">
              {{ a.lastStatus === 'ok' ? '✓' : a.lastStatus === 'error' ? '✗' : '·' }}
              {{ a.lastSync ? fmtDate(a.lastSync) : 'jamais' }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Date</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Contrepartie</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Description</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Montant</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Catégorie</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-500">OK</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="loading" v-for="i in 10" :key="'s' + i">
                <td colspan="6" class="px-4 py-2"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td>
              </tr>
              <tr v-else-if="!data?.rows.length">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  Aucune ligne sur la période. Le cron <span class="font-mono">ac_bank_sync</span> tourne 1×/jour à 06:00 UTC.
                </td>
              </tr>
              <tr v-else v-for="r in data.rows" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                <td class="px-4 py-2 whitespace-nowrap text-gray-500">{{ fmtDay(r.bookingDate) }}</td>
                <td class="px-4 py-2 font-semibold max-w-[200px] truncate">{{ r.counterparty || '—' }}</td>
                <td class="px-4 py-2 max-w-[360px] truncate text-gray-500">{{ r.description }}</td>
                <td class="px-4 py-2 text-right font-bold tabular-nums"
                  :class="r.amount > 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ fmtSigned(r.amount) }}
                </td>
                <td class="px-4 py-2">
                  <select :value="r.category" @change="e => setCategory(r, (e.target as HTMLSelectElement).value)"
                    class="text-xs bg-transparent border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                    <option value="">—</option>
                    <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td class="px-4 py-2 text-center">
                  <button @click="toggleReconciled(r)"
                    class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition"
                    :class="r.reconciled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'">
                    <svg v-if="r.reconciled" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
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

const period = ref(90)
const status = ref<'all' | 'unreconciled' | 'reconciled'>('unreconciled')
const data = ref<any>(null)
const loading = ref(true)

const statusOptions = [
  { value: 'unreconciled', label: 'À rapprocher' },
  { value: 'reconciled',   label: 'Rapprochées' },
  { value: 'all',          label: 'Toutes' },
]

const categories = ['charges', 'ventes', 'tjm', 'urssaf', 'tva', 'impots', 'banque', 'perso', 'autre']

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtSigned = (v: number) => `${v > 0 ? '+' : ''}${(v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}`
const fmtDay = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

async function load() {
  loading.value = true
  try {
    data.value = await $fetch('/api/bo/finance/bank', { query: { period: period.value, status: status.value } })
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

async function setCategory(row: any, category: string) {
  const prev = row.category
  row.category = category
  try {
    await $fetch(`/api/bo/finance/bank/${row.id}`, { method: 'PUT', body: { category } })
  } catch {
    row.category = prev
  }
}

async function toggleReconciled(row: any) {
  const prev = row.reconciled
  row.reconciled = !row.reconciled
  try {
    await $fetch(`/api/bo/finance/bank/${row.id}`, { method: 'PUT', body: { reconciled: row.reconciled } })
    if (status.value !== 'all') await load()
  } catch {
    row.reconciled = prev
  }
}

onMounted(load)
</script>
