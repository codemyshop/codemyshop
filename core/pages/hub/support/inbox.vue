<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <h1 class="text-lg font-bold">Inbox SAV</h1>
      <p class="text-xs text-gray-500 mt-0.5">Conversations clients (ps_customer_thread) — dernière activité en premier</p>
    </header>
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p><p class="text-2xl font-extrabold">{{ data?.stats.total ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ouvertes</p><p class="text-2xl font-extrabold text-primary-600">{{ data?.stats.open ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">En attente</p><p class="text-2xl font-extrabold text-amber-600">{{ data?.stats.pending ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fermées</p><p class="text-2xl font-extrabold text-gray-500">{{ data?.stats.closed ?? 0 }}</p></div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm divide-y divide-gray-100 dark:divide-slate-800">
        <div v-if="!loading && !data?.threads.length" class="px-6 py-10 text-center text-sm text-gray-400">Aucune conversation.</div>
        <div v-for="t in data?.threads" :key="t.id" class="p-5 hover:bg-gray-50 dark:hover:bg-slate-800/40">
          <div class="flex items-start justify-between gap-4 mb-1.5">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span :class="statusClass(t.status)" class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold">{{ statusLabel(t.status) }}</span>
                <span v-if="t.contactName" class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{{ t.contactName }}</span>
                <span v-if="t.msgCount > 1" class="text-[10px] text-gray-400">· {{ t.msgCount }} messages</span>
              </div>
              <p class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                {{ t.customerName || t.email }}
                <span v-if="t.customerName" class="font-normal text-gray-400">· {{ t.email }}</span>
              </p>
              <NuxtLink v-if="t.orderRef" :to="`/hub/orders/${t.orderId}`" class="text-xs text-primary-600 hover:underline">Commande {{ t.orderRef }}</NuxtLink>
            </div>
            <span class="text-[11px] text-gray-400 shrink-0">{{ fmtDate(t.lastDate) }}</span>
          </div>
          <p v-if="t.lastMessage" class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{{ t.lastMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const data = ref<any>(null); const loading = ref(true)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
const statusLabel = (s: string) => ({ open: 'Ouvert', closed: 'Fermé', pending1: 'Attente client', pending2: 'Attente équipe' }[s] || s)
const statusClass = (s: string) => ({
  open:     'bg-primary-100 text-primary-700',
  closed:   'bg-gray-100 text-gray-600',
  pending1: 'bg-amber-100 text-amber-700',
  pending2: 'bg-amber-100 text-amber-700',
}[s] || 'bg-gray-100 text-gray-600')
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/support/inbox') } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
