
<template>
  <div class="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 shrink-0">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Matomo Analytics</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Trafic, sources, conversions — données souveraines hébergées en France
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          
          <select v-model="period" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200">
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="year">Année</option>
            <option value="range">Plage custom</option>
          </select>
          
          <a :href="fullDashboardUrl" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Ouvrir Matomo
          </a>
        </div>
      </div>

      
      <div class="flex gap-1 mt-3 overflow-x-auto">
        <button v-for="w in widgets" :key="w.id" @click="activeWidget = w.id"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
            activeWidget === w.id
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600']">
          {{ w.label }}
        </button>
      </div>
    </header>

    
    <div class="flex-1 relative min-h-0 p-4">
      <div v-if="!matomoUrl" class="absolute inset-4 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div class="text-center max-w-md px-6">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-gray-800 dark:text-slate-100">Matomo non configuré</p>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Définissez <code class="text-[10px] bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">NUXT_PUBLIC_MATOMO_URL</code>
            et <code class="text-[10px] bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">NUXT_PUBLIC_MATOMO_SITE_ID</code> dans votre .env.
          </p>
        </div>
      </div>

      <div v-else class="absolute inset-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <iframe
          :key="iframeKey"
          :src="widgetUrl"
          class="w-full h-full border-0"
          title="Matomo Analytics"
          loading="lazy"
          referrerpolicy="origin"
        />
        
        <div v-if="showFallbackNote" class="absolute bottom-3 right-3 max-w-xs bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300 shadow-sm">
          L'iframe peut être bloquée par X-Frame-Options. Si page blanche →
          <a :href="fullDashboardUrl" target="_blank" class="font-bold underline">ouvrir dans Matomo</a>.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const config = useRuntimeConfig()
const matomoUrl    = (config.public.matomoUrl    as string) || ''
const matomoSiteId = (config.public.matomoSiteId as string) || '1'

const period        = ref<'day' | 'week' | 'month' | 'year' | 'range'>('month')
const activeWidget  = ref('overview')
const showFallbackNote = ref(true)

const widgets = [
  { id: 'overview',    label: 'Vue d\'ensemble',  module: 'Dashboard',         action: 'index' },
  { id: 'visits',      label: 'Visites',          module: 'VisitsSummary',     action: 'index' },
  { id: 'realtime',    label: 'Temps réel',       module: 'Live',              action: 'widget' },
  { id: 'pages',       label: 'Pages',            module: 'Actions',           action: 'getPageUrls' },
  { id: 'sources',     label: 'Acquisitions',     module: 'Referrers',         action: 'getAll' },
  { id: 'keywords',    label: 'Mots-clés',        module: 'Referrers',         action: 'getKeywords' },
  { id: 'devices',     label: 'Appareils',        module: 'DevicesDetection',  action: 'getType' },
  { id: 'countries',   label: 'Pays',             module: 'UserCountry',       action: 'getCountry' },
  { id: 'goals',       label: 'Conversions',      module: 'Goals',             action: 'index' },
]

const currentWidget = computed(() => widgets.find(w => w.id === activeWidget.value) || widgets[0])

const widgetUrl = computed(() => {
  if (!matomoUrl) return ''
  const base = matomoUrl.replace(/\/$/, '')
  const params = new URLSearchParams({
    module:           'Widgetize',
    action:           'iframe',
    widget:           '1',
    moduleToWidgetize: currentWidget.value.module,
    actionToWidgetize: currentWidget.value.action,
    idSite:           matomoSiteId,
    period:           period.value === 'range' ? 'range' : period.value,
    date:             period.value === 'range' ? 'previous30' : 'yesterday',
    disableLink:      '0',
    language:         'fr',
  })
  return `${base}/index.php?${params}`
})

const fullDashboardUrl = computed(() => {
  if (!matomoUrl) return '#'
  const base = matomoUrl.replace(/\/$/, '')
  const params = new URLSearchParams({
    module:  'CoreHome',
    action:  'index',
    idSite:  matomoSiteId,
    period:  period.value === 'range' ? 'range' : period.value,
    date:    period.value === 'range' ? 'previous30' : 'yesterday',
  })
  return `${base}/index.php?${params}`
})

const iframeKey = computed(() => `${activeWidget.value}-${period.value}`)
</script>
