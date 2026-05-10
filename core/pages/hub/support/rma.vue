<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <h1 class="text-lg font-bold">Retours produits (RMA)</h1>
      <p class="text-xs text-gray-500 mt-0.5">Demandes de retour client — ps_order_return PrestaShop</p>
    </header>
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm col-span-2 md:col-span-1">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p>
          <p class="text-2xl font-extrabold">{{ data?.total ?? 0 }}</p>
        </div>
        <div v-for="s in data?.byState?.slice(0, 3)" :key="s.stateId" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">{{ s.stateName }}</p>
          <p class="text-2xl font-extrabold">{{ s.count }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr><th class="px-4 py-3 text-left font-semibold text-gray-500">Commande</th><th class="px-4 py-3 text-left font-semibold text-gray-500">Client</th><th class="px-4 py-3 text-left font-semibold text-gray-500">Motif</th><th class="px-4 py-3 text-left font-semibold text-gray-500">État</th><th class="px-4 py-3 text-right font-semibold text-gray-500">Demandé le</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="!loading && !data?.returns.length"><td colspan="5" class="px-4 py-10 text-center text-gray-400">Aucune demande de retour.</td></tr>
              <tr v-for="r in data?.returns" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <td class="px-4 py-2 font-mono text-[11px]"><NuxtLink :to="`/hub/orders/${r.orderId}`" class="text-primary-600 hover:underline">{{ r.orderRef || '—' }}</NuxtLink></td>
                <td class="px-4 py-2"><p class="font-medium">{{ r.customerName || '—' }}</p><p class="text-[10px] text-gray-400">{{ r.customerEmail }}</p></td>
                <td class="px-4 py-2 max-w-xs"><p class="truncate text-gray-600 dark:text-slate-400" :title="r.question">{{ r.question || '—' }}</p></td>
                <td class="px-4 py-2"><span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-100 text-primary-700">{{ r.stateName }}</span></td>
                <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(r.dateAdd) }}</td>
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
const data = ref<any>(null); const loading = ref(true)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/support/rma') } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
