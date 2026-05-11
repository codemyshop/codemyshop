
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Bons de Commande Achat</h1>
          <p class="text-xs text-gray-500 mt-0.5">Commandes fournisseurs · workflow États · réception</p>
        </div>
        <NuxtLink to="/hub/procurement/purchase-orders/create"
          class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau BC
        </NuxtLink>
      </div>
    </header>

    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total BC</p><p class="text-2xl font-extrabold">{{ data?.total ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valeur cumulée TTC</p><p class="text-2xl font-extrabold">{{ fmtEur(data?.totalValue ?? 0) }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">En attente réception</p><p class="text-2xl font-extrabold text-amber-600">{{ pendingCount }}</p></div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
          <span class="text-xs font-semibold text-gray-500">Filtrer :</span>
          <button @click="stateFilter = null; load()"
            class="text-[11px] font-semibold px-2.5 py-1 rounded-md"
            :class="!stateFilter ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'">
            Tous
          </button>
          <button v-for="s in data?.states" :key="s.id" @click="stateFilter = s.id; load()"
            class="text-[11px] font-semibold px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
            :class="stateFilter === s.id ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: s.color }" />
            {{ s.name }}
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Référence</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Fournisseur</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">État</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Lignes</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Total HT</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Total TTC</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Création</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Livraison</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="loading" v-for="i in 4" :key="`sk-${i}`"><td colspan="8" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
              <tr v-else-if="!data?.orders.length"><td colspan="8" class="px-4 py-10 text-center text-gray-400">Aucun bon de commande. Créez-en un via le bouton en haut.</td></tr>
              <tr v-for="o in data?.orders" :key="o.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer" @click="navigateTo(`/hub/procurement/purchase-orders/${o.id}`)">
                <td class="px-4 py-2 font-mono text-[11px]">{{ o.reference }}</td>
                <td class="px-4 py-2 font-semibold">{{ o.supplierName }}</td>
                <td class="px-4 py-2">
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: o.stateColor }" />
                    {{ o.stateName }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-slate-400">{{ o.lineCount }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(o.totalHT) }}</td>
                <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(o.totalTTC) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(o.dateAdd) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ o.deliveryDate ? fmtDate(o.deliveryDate) : '—' }}</td>
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

const data = ref<any>(null)
const loading = ref(true)
const stateFilter = ref<number | null>(null)

const pendingCount = computed(() =>
  data.value?.orders.filter((o: any) => [2, 3].includes(o.stateId)).length ?? 0,
)

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''

async function load() {
  loading.value = true
  try {
    data.value = await $fetch('/api/bo/procurement/purchase-orders', {
      query: stateFilter.value ? { state: stateFilter.value } : {},
    })
  } catch { data.value = null }
  finally { loading.value = false }
}

onMounted(load)
</script>
