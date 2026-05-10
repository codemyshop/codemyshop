<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold">TVA & Export FEC</h1>
          <p class="text-xs text-gray-500 mt-0.5">TVA collectée mensuelle · Export CSV pour déclaration</p>
        </div>
        <button @click="exportCsv" class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          Export CSV
        </button>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CA HT — YTD</p>
          <p class="text-2xl font-extrabold">{{ fmtEur(data?.ytd.revenueHT ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CA TTC — YTD</p>
          <p class="text-2xl font-extrabold">{{ fmtEur(data?.ytd.revenueTTC ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">TVA collectée — YTD</p>
          <p class="text-2xl font-extrabold text-primary-600">{{ fmtEur(data?.ytd.tva ?? 0) }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800"><h2 class="text-sm font-bold">Détail mensuel — 12 derniers mois</h2></div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr><th class="px-4 py-2 text-left font-semibold text-gray-500">Mois</th><th class="px-4 py-2 text-right font-semibold text-gray-500">Commandes</th><th class="px-4 py-2 text-right font-semibold text-gray-500">CA HT</th><th class="px-4 py-2 text-right font-semibold text-gray-500">CA TTC</th><th class="px-4 py-2 text-right font-semibold text-gray-500">TVA collectée</th><th class="px-4 py-2 text-right font-semibold text-gray-500">Taux moyen</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="!loading && !data?.monthly.length"><td colspan="6" class="px-4 py-8 text-center text-gray-400">Aucune donnée TVA.</td></tr>
              <tr v-for="m in data?.monthly" :key="m.ym" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <td class="px-4 py-2 font-semibold">{{ m.label }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ m.orders }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(m.revenueHT) }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(m.revenueTTC) }}</td>
                <td class="px-4 py-2 text-right tabular-nums font-bold text-primary-600">{{ fmtEur(m.tva) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ m.rate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
        <p class="font-bold mb-1">⚠️ Note légale</p>
        <p>Cet export est une pré-calculation à partir des commandes validées. L'export FEC au format officiel (DGFiP) sera disponible dans une version ultérieure. Contactez votre expert-comptable pour validation.</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const data = ref<any>(null)
const loading = ref(true)
const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/finance/tva') } catch { data.value = null } finally { loading.value = false } }
function exportCsv() {
  if (!data.value?.monthly.length) return
  const headers = ['Mois', 'Commandes', 'CA HT', 'CA TTC', 'TVA collectee', 'Taux moyen %']
  const rows = data.value.monthly.map((m: any) => [m.label, m.orders, m.revenueHT, m.revenueTTC, m.tva, m.rate])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `tva_${new Date().toISOString().slice(0,10)}.csv`
  link.click()
}
onMounted(load)
</script>
