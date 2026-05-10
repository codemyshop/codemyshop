<template>
  <div class="flex-1 overflow-auto">

    <!-- Header -->
    <header class="sticky top-0 z-10 px-8 py-5 border-b border-white/5 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Dashboard</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ todayLabel }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
            <button
              v-for="p in periods" :key="p.value" @click="activePeriod = p.value"
              :class="activePeriod === p.value
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'"
              class="px-4 py-2 transition-all duration-300 ease-out font-medium"
            >{{ p.label }}</button>
          </div>
          <button @click="refresh" :class="refreshing ? 'animate-spin' : ''"
            class="p-2 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300 active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="p-8 space-y-8 max-w-7xl mx-auto">

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-6">
        <div
          v-for="card in statCards" :key="card.label"
          class="group relative rounded-2xl border p-6 transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5 cursor-default
                 bg-white border-white/5 dark:bg-slate-800/80 dark:border-slate-700/50"
        >
          <div class="flex items-start gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                 :class="card.iconBg">
              <component :is="card.svgIcon" class="w-5 h-5" :class="card.iconColor" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-3xl font-extrabold tracking-tight tabular-nums leading-none mb-1.5
                        text-gray-900 dark:text-slate-100">
                {{ card.value }}
              </p>
              <p class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-3">{{ card.label }}</p>
              <span
                :class="card.trend >= 0
                  ? 'bg-green-500/10 text-green-500 dark:bg-green-500/15 dark:text-green-400'
                  : 'bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400'"
                class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    :d="card.trend >= 0
                      ? 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941'
                      : 'M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181'" />
                </svg>
                {{ card.trend >= 0 ? '+' : '' }}{{ card.trend }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart + Status -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 rounded-2xl border p-6
                    bg-white border-white/5 dark:bg-slate-800/80 dark:border-slate-700/50">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Évolution du CA</h2>
              <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ activePeriodLabel }}</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-500 dark:text-green-400">
              +{{ caGrowth }}%
            </span>
          </div>
          <HubSimpleChart :data="chartData" unit="€" />
        </div>

        <div class="rounded-2xl border p-6
                    bg-white border-white/5 dark:bg-slate-800/80 dark:border-slate-700/50">
          <h2 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-5">Répartition</h2>
          <div class="space-y-4">
            <div v-for="s in statusBreakdown" :key="s.label" class="flex items-center gap-3">
              <span class="w-2 h-2 rounded-full shrink-0" :style="`background-color:${s.color || '#94a3b8'}`" />
              <span class="text-xs text-gray-600 dark:text-slate-400 flex-1">{{ s.label }}</span>
              <div class="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[80px]">
                <div class="h-1.5 rounded-full transition-all duration-700" :style="`width: ${s.pct}%; background-color: ${s.color || '#94a3b8'}`" />
              </div>
              <span class="text-xs font-semibold tabular-nums text-gray-700 dark:text-slate-300 w-8 text-right">{{ s.count }}</span>
            </div>
          </div>

          <div class="border-t border-white/5 dark:border-slate-700 mt-6 pt-6">
            <h2 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-3">Conversion</h2>
            <div class="flex items-end gap-2">
              <span class="text-4xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-slate-100">{{ stats.conversionRate }}%</span>
              <span class="text-xs text-green-500 font-semibold mb-1.5">+0.4 pts</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-500 mt-1">Visites → Commandes</p>
            <div class="mt-4 bg-gray-100 dark:bg-slate-700 rounded-full h-2">
              <div class="h-2 rounded-full bg-primary-500 transition-all duration-700" :style="`width: ${stats.conversionRate}%`" />
            </div>
          </div>
        </div>
      </div>

      <!-- CRM Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          v-for="card in crmCards" :key="card.label"
          class="group rounded-2xl border p-6 transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5
                 bg-white border-white/5 dark:bg-slate-800/80 dark:border-slate-700/50"
        >
          <div class="flex items-start gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110" :class="card.iconBg">
              <svg class="w-5 h-5" :class="card.iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" :d="card.svgPath" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-3xl font-extrabold tracking-tight tabular-nums leading-none mb-1.5 text-gray-900 dark:text-slate-100">{{ card.value }}</p>
              <p class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-3">{{ card.label }}</p>
              <span
                :class="card.trend >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'"
                class="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg"
              >
                {{ card.trend >= 0 ? '▲' : '▼' }} {{ Math.abs(card.trend) }}{{ card.trendUnit ?? '%' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Leads + Tasks -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6" style="min-height: 380px;">
        <HubRecentLeads :leads="recentLeads" @quote-created="onQuoteCreated" />
        <HubTeamTasks :tasks="teamTasks" @task-created="onTaskCreated" @task-toggled="onTaskToggled" />
      </div>

      <!-- Recent Orders -->
      <div class="rounded-2xl border overflow-hidden
                  bg-white border-white/5 dark:bg-slate-800/80 dark:border-slate-700/50">
        <div class="px-6 py-5 border-b border-white/5 dark:border-slate-700 flex items-center justify-between">
          <h2 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Dernières commandes</h2>
          <NuxtLink to="/hub/orders" class="text-xs text-primary-500 hover:text-primary-400 font-semibold transition-colors duration-300">
            Voir tout →
          </NuxtLink>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-white/5 dark:border-slate-700">
                <th class="text-left px-6 py-3 text-[10px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">Réf.</th>
                <th class="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">Client</th>
                <th class="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest hidden md:table-cell">Date</th>
                <th class="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">Montant</th>
                <th class="text-center px-6 py-3 text-[10px] font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 dark:divide-slate-700/50">
              <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors duration-200">
                <td class="px-6 py-4 font-mono text-xs text-gray-500 dark:text-slate-500 font-medium">#{{ order.id }}</td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-primary-500/15 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0">
                      {{ order.client.charAt(0) }}
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-slate-300">{{ order.client }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-xs text-gray-500 dark:text-slate-500 hidden md:table-cell">{{ order.date }}</td>
                <td class="px-4 py-4 text-right font-semibold tabular-nums text-gray-800 dark:text-slate-200">
                  {{ order.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) }} €
                </td>
                <td class="px-6 py-4 text-center">
                  <span :class="statusBadge(order.status)" class="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {{ order.status }}
                  </span>
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
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const periods = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
  { value: '1y', label: '1 an' },
  { value: 'all', label: 'Tout' },
]
const activePeriod = ref('1y')
const activePeriodLabel = computed(() => ({
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  '1y': '12 derniers mois',
  'all': 'Tout l\'historique',
}[activePeriod.value] ?? ''))

interface DashboardStats {
  revenue: number; orders: number; avgBasket: number; visits: number; conversionRate: number
  trends: { revenue: number; orders: number; avgBasket: number; visits: number }
}

const stats = ref<DashboardStats>({
  revenue: 0, orders: 0, avgBasket: 0, visits: 0, conversionRate: 0,
  trends: { revenue: 0, orders: 0, avgBasket: 0, visits: 0 },
})
const caGrowth = ref(0)
const liveChart = ref<{ label: string; value: number }[]>([])
const liveStatusBreakdown = ref<{ label: string; count: number; pct: number; color: string }[]>([])
const liveRecentOrders = ref<{ id: string; client: string; date: string; amount: number; status: string }[]>([])

async function fetchDashboardStats() {
  const data = await $fetch<any>('/api/hub/dashboard/stats', { query: { period: activePeriod.value } })
  stats.value = data.stats
  caGrowth.value = data.caGrowth
  liveChart.value = data.chart || []
  liveStatusBreakdown.value = data.statusBreakdown || []
  liveRecentOrders.value = data.recentOrders || []
  return stats.value
}

// Stat Cards with inline SVG paths for cleaner templates
const statCards = computed(() => [
  { iconBg: 'bg-primary-500/10', iconColor: 'text-primary-500', label: 'Ventes du jour', value: `${stats.value.revenue.toLocaleString('fr-FR')} \u20ac`, trend: stats.value.trends.revenue, svgIcon: 'svg', svgPath: 'M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', label: 'Commandes', value: stats.value.orders, trend: stats.value.trends.orders, svgIcon: 'svg', svgPath: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z' },
  { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', label: 'Panier moyen', value: `${stats.value.avgBasket.toFixed(2).replace('.', ',')} \u20ac`, trend: stats.value.trends.avgBasket, svgIcon: 'svg', svgPath: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' },
  { iconBg: 'bg-sky-500/10', iconColor: 'text-sky-500', label: 'Visites', value: stats.value.visits.toLocaleString('fr-FR'), trend: stats.value.trends.visits, svgIcon: 'svg', svgPath: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z' },
])

const chartData = computed(() => liveChart.value)
const statusBreakdown = computed(() => liveStatusBreakdown.value)
const recentOrders = computed(() => liveRecentOrders.value)

function statusBadge(status: string): string {
  return {
    'Livré': 'bg-green-500/10 text-green-500',
    'En attente': 'bg-amber-500/10 text-amber-500',
    'Annulé': 'bg-red-500/10 text-red-500',
    'En cours': 'bg-primary-500/10 text-primary-500',
  }[status] ?? 'bg-gray-500/10 text-gray-500'
}

const crmCards = computed(() => [
  { label: 'Leads entrants', value: 18, trend: 20, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', svgPath: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
  { label: 'Devis générés', value: 7, trend: 16, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-500', svgPath: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z' },
  { label: 'Taux Lead → Client', value: '38.9%', trend: 3, trendUnit: ' pts', iconBg: 'bg-green-500/10', iconColor: 'text-green-500', svgPath: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941' },
])

import type { Lead } from '~/components/hub/RecentLeads.vue'
import type { Task } from '~/components/hub/TeamTasks.vue'

const recentLeads = ref<Lead[]>([
  { id: 1, name: 'Sophie Martin', email: 'sophie.martin@gmail.com', source: 'Formulaire', date: '16/03/2026', status: 'Nouveau', avatarShade: '600' },
  { id: 2, name: 'Jean-Paul Dubois', email: 'jpdubois@pro.fr', source: 'LinkedIn', date: '15/03/2026', status: 'Contacté', avatarShade: '500' },
  { id: 3, name: 'Amira Benali', email: 'amira.b@hotmail.com', source: 'WhatsApp', date: '15/03/2026', status: 'Qualifié', avatarShade: '700' },
  { id: 4, name: 'Rémi Fontaine', email: 'remi.fontaine@entreprise.com', source: 'Direct', date: '14/03/2026', status: 'Contacté', avatarShade: '600' },
  { id: 5, name: 'Clara Lejeune', email: 'c.lejeune@mail.fr', source: 'Formulaire', date: '14/03/2026', status: 'Nouveau', avatarShade: '500' },
])

function onQuoteCreated(quote: object) { console.log('Devis:', quote) }

const teamTasks = ref<Task[]>([
  { id: 1, title: 'Rappeler Sophie Martin', assignee: { name: 'Alexandre C.', initials: 'AC', color: 'var(--color-primary-600)' }, status: 'todo', priority: 'high' },
  { id: 2, title: 'Préparer proposition Example Shop Q2', assignee: { name: 'Sophie M.', initials: 'SM', color: '#10b981' }, status: 'in_progress', priority: 'high' },
  { id: 3, title: 'Mettre à jour catalogue été', assignee: { name: 'Jean D.', initials: 'JD', color: '#f59e0b' }, status: 'done', priority: 'medium' },
  { id: 4, title: 'Relance emailing segment inactifs', assignee: { name: 'Claire T.', initials: 'CT', color: '#8b5cf6' }, status: 'todo', priority: 'medium' },
  { id: 5, title: 'Vérifier stocks produits promos', assignee: { name: 'Jean D.', initials: 'JD', color: '#f59e0b' }, status: 'in_progress', priority: 'low' },
])

function onTaskCreated(task: Task) { teamTasks.value.unshift(task) }
function onTaskToggled(id: number) { const t = teamTasks.value.find(t => t.id === id); if (t) t.status = t.status === 'done' ? 'todo' : 'done' }

const refreshing = ref(false)
async function refresh() { refreshing.value = true; await fetchDashboardStats(); setTimeout(() => { refreshing.value = false }, 600) }
onMounted(fetchDashboardStats)
watch(activePeriod, () => { fetchDashboardStats() })
</script>
