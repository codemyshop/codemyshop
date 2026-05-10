<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <h1 class="text-lg font-bold">Tickets & Helpdesk</h1>
      <p class="text-xs text-gray-500 mt-0.5">Threads SAV (ps_customer_thread) — status, âge, contact</p>
    </header>
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p><p class="text-2xl font-extrabold">{{ data?.stats.total ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ouverts</p><p class="text-2xl font-extrabold text-primary-600">{{ data?.stats.open ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attente client</p><p class="text-2xl font-extrabold text-amber-600">{{ data?.stats.pending1 ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attente équipe</p><p class="text-2xl font-extrabold text-amber-600">{{ data?.stats.pending2 ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fermés</p><p class="text-2xl font-extrabold text-gray-500">{{ data?.stats.closed ?? 0 }}</p></div>
      </div>

      <div v-if="data?.byContact.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Répartition par contact</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="c in data.byContact" :key="c.contactName" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-800 text-xs">
            <span class="font-medium text-gray-700 dark:text-slate-200">{{ c.contactName }}</span>
            <span class="font-bold text-primary-600">{{ c.count }}</span>
          </span>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">#</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Client</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Contact</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Commande</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Messages</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Âge</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Mis à jour</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="!loading && !data?.tickets.length"><td colspan="8" class="px-4 py-10 text-center text-gray-400">Aucun ticket.</td></tr>
              <tr v-for="t in data?.tickets" :key="t.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <td class="px-4 py-2 font-mono text-[11px] text-gray-500">#{{ t.id }}</td>
                <td class="px-4 py-2"><span :class="statusClass(t.status)" class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold">{{ statusLabel(t.status) }}</span></td>
                <td class="px-4 py-2"><p class="font-medium">{{ t.customerName || '—' }}</p><p class="text-[10px] text-gray-400">{{ t.email }}</p></td>
                <td class="px-4 py-2 text-gray-600 dark:text-slate-400">{{ t.contactName || '—' }}</td>
                <td class="px-4 py-2"><NuxtLink v-if="t.orderRef" :to="`/hub/orders/${t.orderId}`" class="text-primary-600 hover:underline font-mono text-[11px]">{{ t.orderRef }}</NuxtLink><span v-else class="text-gray-400">—</span></td>
                <td class="px-4 py-2 text-right font-semibold">{{ t.msgCount }}</td>
                <td class="px-4 py-2 text-right" :class="ageClass(t.ageHours, t.status)">{{ fmtAge(t.ageHours) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(t.dateUpd) }}</td>
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
const fmtAge = (h: number) => h < 24 ? `${h} h` : `${Math.floor(h / 24)} j`
const statusLabel = (s: string) => ({ open: 'Ouvert', closed: 'Fermé', pending1: 'Att. client', pending2: 'Att. équipe' }[s] || s)
const statusClass = (s: string) => ({
  open:     'bg-primary-100 text-primary-700',
  closed:   'bg-gray-100 text-gray-600',
  pending1: 'bg-amber-100 text-amber-700',
  pending2: 'bg-amber-100 text-amber-700',
}[s] || 'bg-gray-100 text-gray-600')
const ageClass = (h: number, status: string) => {
  if (status === 'closed') return 'text-gray-400'
  if (h > 72) return 'text-red-600 font-semibold'
  if (h > 24) return 'text-amber-600 font-semibold'
  return 'text-gray-500'
}
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/support/tickets') } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
