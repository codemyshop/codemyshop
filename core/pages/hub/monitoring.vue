<script setup lang="ts">

definePageMeta({
  layout: 'hub',
  middleware: 'crm-auth',
  ssr: false
})

interface LifecycleInfo {
  status: 'new' | 'active'
  first_seen: string
  occurrence_count: number
}

interface MonitoringItem {
  label: string
  detail: string
  severity: 'critical' | 'warning' | 'ok'
  timestamp?: string
  lifecycle?: LifecycleInfo
}

interface MonitoringSection {
  id: string
  title: string
  severity: 'critical' | 'warning' | 'ok'
  items: MonitoringItem[]
}

interface ResolvedItem {
  section_id: string
  label: string
  detail: string
  severity: string
  first_seen: string
  resolved_at: string
  occurrence_count: number
}

interface MonitoringData {
  timestamp: string
  summary: { critical: number; warning: number; ok: number }
  lifecycle?: { new: number; active: number; resolved_today: number }
  resolved_today?: ResolvedItem[]
  sections: MonitoringSection[]
}

const { data, pending, error, refresh: doRefresh } = useFetch<MonitoringData>('/api/monitoring', {
  lazy: true
})

const refreshing = ref(false)
const lastRefresh = ref<Date | null>(null)

async function refresh() {
  refreshing.value = true
  try {
    await doRefresh()
    lastRefresh.value = new Date()
  } finally {
    refreshing.value = false
  }
}

watch(data, () => {
  if (!lastRefresh.value) lastRefresh.value = new Date()
})

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null
function startAutoRefresh() {
  if (autoRefreshTimer) return
  autoRefreshTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      refresh()
    }
  }, 30000)
}
function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}
onMounted(startAutoRefresh)
onBeforeUnmount(stopAutoRefresh)

const lastRefreshLabel = computed(() => {
  if (!lastRefresh.value) return ''
  return lastRefresh.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

type FilterMode = 'all' | 'new' | 'persistent' | 'resolved'
const activeFilter = ref<FilterMode>('all')

const severityOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 }

const filteredSections = computed(() => {
  if (!data.value?.sections) return []

  if (activeFilter.value === 'all') {
    return [...data.value.sections].sort(
      (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    )
  }

  if (activeFilter.value === 'resolved') return [] 

  const targetStatus = activeFilter.value === 'new' ? 'new' : 'active'
  return data.value.sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.lifecycle?.status === targetStatus)
    }))
    .filter(section => section.items.length > 0)
    .sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9))
})

const counts = computed(() => data.value?.summary ?? { critical: 0, warning: 0, ok: 0 })
const lc = computed(() => data.value?.lifecycle ?? { new: 0, active: 0, resolved_today: 0 })

function ageLabel(firstSeen: string): string {
  const diff = Date.now() - new Date(firstSeen).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j`
}
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="sticky top-0 z-10 px-8 py-5 border-b backdrop-blur-xl
                    bg-white/80 dark:bg-slate-900/80
                    border-gray-200 dark:border-slate-800">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Monitoring</h1>
          <p v-if="lastRefreshLabel" class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Mise a jour : {{ lastRefreshLabel }}
          </p>
        </div>
        <button
          @click="refresh"
          :disabled="refreshing"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95
                 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm"
        >
          <svg class="w-4 h-4 transition-transform duration-300" :class="{ 'animate-spin': refreshing }"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualiser
        </button>
      </div>
    </header>

    <div class="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      
      <div v-if="pending && !data" class="text-center py-20">
        <p class="text-gray-500 dark:text-slate-500 text-sm">Chargement...</p>
      </div>

      
      <div v-else-if="error" class="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-6">
        <p class="text-red-600 dark:text-red-400 font-medium">Erreur de chargement</p>
        <p class="text-sm text-red-500/70 mt-1">{{ error.message || 'Impossible de recuperer les donnees.' }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors">
          Reessayer
        </button>
      </div>

      
      <template v-else-if="data">

        
        <div class="grid grid-cols-3 gap-4 lg:gap-6">
          <div class="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 flex items-center gap-4 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <span class="w-3 h-3 rounded-full bg-red-500"></span>
            </div>
            <div>
              <p class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white tabular-nums">{{ counts.critical }}</p>
              <p class="text-xs font-medium text-gray-500 dark:text-slate-500">Critique</p>
            </div>
          </div>
          <div class="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 flex items-center gap-4 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <span class="w-3 h-3 rounded-full bg-orange-500"></span>
            </div>
            <div>
              <p class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white tabular-nums">{{ counts.warning }}</p>
              <p class="text-xs font-medium text-gray-500 dark:text-slate-500">Attention</p>
            </div>
          </div>
          <div class="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 flex items-center gap-4 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
            </div>
            <div>
              <p class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white tabular-nums">{{ counts.ok }}</p>
              <p class="text-xs font-medium text-gray-500 dark:text-slate-500">OK</p>
            </div>
          </div>
        </div>

        
        <div v-if="data.lifecycle" class="flex items-center gap-2 flex-wrap">
          <button
            v-for="f in [
              { key: 'all', label: 'Tout' },
              { key: 'new', label: 'Nouveau', count: lc.new },
              { key: 'persistent', label: 'Persistant', count: lc.active },
              { key: 'resolved', label: 'Resolu', count: lc.resolved_today },
            ]" :key="f.key"
            @click="activeFilter = f.key as FilterMode"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            :class="activeFilter === f.key
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'"
          >
            {{ f.label }}
            <span v-if="f.count != null" class="ml-1 opacity-60">{{ f.count }}</span>
          </button>
        </div>

        
        <template v-for="section in filteredSections" :key="section.id || section.title">

          
          <div
            v-if="section.severity !== 'ok'"
            class="rounded-2xl border bg-white dark:bg-slate-900/50 p-5 shadow-sm"
            :class="section.severity === 'critical'
              ? 'border-red-200 dark:border-red-500/30'
              : 'border-orange-200 dark:border-orange-500/30'"
          >
            <div class="flex items-center gap-3 mb-4">
              <span class="w-2.5 h-2.5 rounded-full" :class="section.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'"></span>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">{{ section.title }}</h2>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                    :class="section.severity === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'">
                {{ section.severity === 'critical' ? 'Critique' : 'Attention' }}
              </span>
              <span class="ml-auto text-xs text-gray-500 dark:text-slate-500">{{ section.items.length }} el.</span>
            </div>
            <div class="space-y-1.5">
              <div v-for="(item, idx) in section.items" :key="idx"
                   class="border-l-2 pl-4 py-2 rounded-r-lg bg-gray-50 dark:bg-slate-800/40"
                   :class="{
                     'border-l-red-500': item.severity === 'critical',
                     'border-l-orange-400': item.severity === 'warning',
                     'border-l-emerald-500': item.severity === 'ok',
                   }">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}</p>
                  <span v-if="item.lifecycle?.status === 'new'"
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                    NOUVEAU
                  </span>
                  <span v-else-if="item.lifecycle?.status === 'active'"
                        class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                    depuis {{ ageLabel(item.lifecycle.first_seen) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5 break-all whitespace-pre-wrap leading-relaxed">{{ item.detail }}</p>
                <p v-if="item.timestamp" class="text-[10px] text-gray-400 dark:text-slate-600 mt-1 font-mono">{{ item.timestamp }}</p>
              </div>
            </div>
          </div>

          
          <details v-else class="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm group">
            <summary class="flex items-center gap-3 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">{{ section.title }}</h2>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">OK</span>
              <span class="ml-auto text-xs text-gray-500 dark:text-slate-500">{{ section.items.length }} el.</span>
              <svg class="w-4 h-4 text-gray-500 dark:text-slate-500 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div class="px-5 pb-5 space-y-1.5">
              <div v-for="(item, idx) in section.items" :key="idx"
                   class="border-l-2 pl-4 py-2 rounded-r-lg bg-gray-50 dark:bg-slate-800/40 border-l-emerald-500">
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}</p>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5 break-all whitespace-pre-wrap leading-relaxed">{{ item.detail }}</p>
              </div>
            </div>
          </details>
        </template>

        
        <template v-if="activeFilter === 'resolved'">
          <div v-if="data.resolved_today?.length" class="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900/50 p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-4">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Resolus aujourd'hui</h2>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {{ data.resolved_today.length }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div v-for="(item, idx) in data.resolved_today" :key="idx"
                   class="border-l-2 border-l-emerald-500 pl-4 py-2 rounded-r-lg bg-gray-50 dark:bg-slate-800/40">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}</p>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 line-through">
                    RESOLU
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ item.detail }}</p>
                <p class="text-[10px] text-gray-400 dark:text-slate-600 mt-1 font-mono">
                  Resolu : {{ item.resolved_at }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12">
            <p class="text-gray-500 dark:text-slate-500 text-sm">Aucun probleme resolu aujourd'hui.</p>
          </div>
        </template>

        
        <div v-if="filteredSections.length === 0 && activeFilter !== 'resolved'" class="text-center py-12">
          <p class="text-gray-500 dark:text-slate-500 text-sm">
            {{ activeFilter === 'new' ? 'Aucun nouveau probleme.' : activeFilter === 'persistent' ? 'Aucun probleme persistant.' : 'Aucune donnee.' }}
          </p>
        </div>

      </template>
    </div>
  </div>
</template>
