
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">SEO Console</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Audit de cannibalisation, données Google Search Console et stratégie SEO IA
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
          :class="gscConnected ? 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="gscConnected ? 'bg-success-400' : 'bg-amber-400'" />
          {{ gscConnected ? 'GSC connectée' : 'GSC non connectée' }}
        </span>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">

      
      <div v-if="!gscConnected" class="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-amber-100 dark:border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/5">
          <h2 class="text-sm font-bold text-amber-800 dark:text-amber-300">Connectez votre Google Search Console</h2>
          <p class="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            <template v-if="gscMissing === 'siteUrl'">
              Service Account global ✓ — il manque l'URL Search Console de ce tenant. À renseigner dans Config Système.
            </template>
            <template v-else-if="gscMissing === 'sa'">
              URL site ✓ — il manque le JSON Service Account global (réservé Operations Center).
            </template>
            <template v-else>
              Configurez le Service Account Google et l'URL site GSC dans Config Système pour activer les audits SEO.
            </template>
          </p>
        </div>
        <div class="px-6 py-5">
          <NuxtLink
            to="/hub/admin/features"
            class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Configurer la clé API GSC
          </NuxtLink>
        </div>
      </div>

      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="kpi in kpis" :key="kpi.label" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-1">{{ kpi.label }}</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white">{{ kpi.value }}</p>
          <p class="text-xs mt-1" :class="kpi.trend > 0 ? 'text-success-600' : kpi.trend < 0 ? 'text-danger-600' : 'text-gray-400'">
            {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}% vs semaine dernière
          </p>
        </div>
      </div>

      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-danger-50 dark:bg-danger-500/15 flex items-center justify-center">
                <svg class="w-5 h-5 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Audit Cannibalisation</h3>
                <p class="text-xs text-gray-500 dark:text-slate-500">Détecte les pages qui se concurrencent sur les mêmes mots-clés</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5">
            <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">L'IA analyse vos URLs et identifie les doublons de ciblage SEO. Résultat : un plan de consolidation pour concentrer l'autorité.</p>
            <button
              class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
              :disabled="auditLoading"
              @click="runCannibalizationAudit"
            >
              <svg v-if="auditLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z" /></svg>
              {{ auditLoading ? 'Analyse en cours...' : 'Lancer l\'audit' }}
            </button>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-600/15 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.25" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Optimisation URLs / Slugs</h3>
                <p class="text-xs text-gray-500 dark:text-slate-500">Réécriture intelligente des slugs pour le SEO</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5">
            <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">L'IA analyse vos URLs produit, catégorie et CMS, puis propose des slugs optimisés avec plan de redirection 301 automatique.</p>
            <button
              class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
              @click="navigateTo('/hub/marketing/seo-console/urls')"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              Optimiser les URLs
            </button>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Monitoring 404</h3>
                <p class="text-xs text-gray-500 dark:text-slate-500">Erreurs 404 en temps réel avec détection de bots</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5">
            <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">Suivi automatique de toutes les pages introuvables. Distinction visiteurs / bots Googlebot. Corrigez les liens cassés avant qu'ils n'impactent votre ranking.</p>
            <button
              class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
              @click="navigateTo('/hub/marketing/seo-console/404')"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              Voir les 404
            </button>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center">
                <svg class="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Stratégie IA SEO</h3>
                <p class="text-xs text-gray-500 dark:text-slate-500">Audit complet et plan d'action généré par Claude</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5">
            <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">L'IA croise vos données GSC avec l'audit de cannibalisation pour produire un plan de contenu priorisé : quick wins, pages à fusionner, sujets à cibler.</p>
            <button
              class="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
              :disabled="!gscConnected"
              @click="generateStrategy"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" /></svg>
              {{ gscConnected ? 'Générer la stratégie' : 'Connectez GSC d\'abord' }}
            </button>
          </div>
        </div>

      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Top opportunités — 28 derniers jours</h2>
            <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
              Mots-clés en page 2 (positions 8-25) avec impressions ≥ 10, triés par score = impressions × (25 − position).
              <span v-if="gscSiteUrl" class="font-mono text-emerald-600">{{ gscSiteUrl }}</span>
            </p>
          </div>
          <span class="text-[10px] font-semibold text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">via gsc.ts</span>
        </div>
        <div class="px-6 py-5">
          <div v-if="!gscConnected" class="text-center py-8">
            <p class="text-sm text-gray-500 dark:text-slate-500">Connectez votre clé API GSC pour voir les données en temps réel.</p>
          </div>
          <div v-else-if="oppsLoading" class="text-center py-8">
            <svg class="w-5 h-5 animate-spin mx-auto text-primary-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <p class="text-xs text-gray-400 mt-2">Interrogation Google Search Console…</p>
          </div>
          <div v-else-if="!opportunities.length" class="text-center py-8">
            <p class="text-sm text-gray-500 dark:text-slate-500">Aucune opportunité détectée sur la période. <span v-if="oppsError" class="text-danger-500">— {{ oppsError }}</span></p>
          </div>
          <div v-else class="overflow-x-auto -mx-6">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-500">
                <tr>
                  <th class="px-6 py-2 text-left font-semibold">Mot-clé</th>
                  <th class="px-3 py-2 text-left font-semibold">Page</th>
                  <th class="px-3 py-2 text-right font-semibold">Pos.</th>
                  <th class="px-3 py-2 text-right font-semibold">Impr.</th>
                  <th class="px-3 py-2 text-right font-semibold">Clics</th>
                  <th class="px-3 py-2 text-right font-semibold">CTR</th>
                  <th class="px-6 py-2 text-left font-semibold">Type</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-for="opp in opportunities" :key="opp.query + opp.page" class="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  <td class="px-6 py-2 font-medium text-gray-800 dark:text-slate-200">{{ opp.query }}</td>
                  <td class="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[280px] truncate" :title="opp.page">
                    <a :href="opp.page" target="_blank" rel="noopener" class="hover:underline">{{ opp.page.replace(/^https?:\/\/[^/]+/, '') || '/' }}</a>
                  </td>
                  <td class="px-3 py-2 text-right font-mono">{{ opp.position }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ opp.impressions.toLocaleString('fr-FR') }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ opp.clicks.toLocaleString('fr-FR') }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ opp.ctr }}%</td>
                  <td class="px-6 py-2">
                    <span class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      :class="{
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400': opp.type === 'conquest',
                        'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400': opp.type === 'rewrite',
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400': opp.type === 'defend',
                      }">
                      {{ opp.type }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="oppsFetchedAt" class="text-[10px] text-gray-400 mt-3 px-6">
              Mis à jour {{ new Date(oppsFetchedAt).toLocaleString('fr-FR') }}
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth' })

const { resolvedClientId } = useClientDetection()

const gscConnected = ref(false)
const gscMissing   = ref<'none' | 'sa' | 'siteUrl' | 'both'>('both')
const gscSiteUrl   = ref<string>('')
const auditLoading = ref(false)

interface GscOpportunity {
  query: string; page: string; position: number; clicks: number
  impressions: number; ctr: number; score: number
  type: 'conquest' | 'defend' | 'rewrite'
}
const opportunities  = ref<GscOpportunity[]>([])
const oppsLoading    = ref(false)
const oppsError      = ref<string | null>(null)
const oppsFetchedAt  = ref<string | null>(null)

async function fetchOpportunities() {
  oppsLoading.value = true
  oppsError.value   = null
  try {
    const data = await $fetch<{
      success: boolean; siteUrl?: string; opportunities?: GscOpportunity[]
      error?: string; fetchedAt?: string
    }>('/api/gsc-opportunities')
    if (data.success) {
      opportunities.value = data.opportunities ?? []
      oppsFetchedAt.value = data.fetchedAt ?? null
      if (data.siteUrl) gscSiteUrl.value = data.siteUrl
    } else {
      oppsError.value = data.error ?? 'GSC indisponible'
    }
  } catch (err: any) {
    oppsError.value = err?.message ?? 'Erreur réseau'
  } finally {
    oppsLoading.value = false
  }
}

onMounted(async () => {
  let saExists = false
  let siteUrl = ''

  
  
  try {
    const sa = await $fetch<{ gscServiceAccount: { exists: boolean } }>('/api/hub/global-secrets')
    saExists = sa.gscServiceAccount.exists
  } catch {
    
    try {
      const probe = await $fetch<{ success: boolean; error?: string }>('/api/gsc-opportunities')
      saExists = probe.success || (probe.error?.includes('gscSiteUrl') ?? false)
    } catch { saExists = false }
  }

  try {
    const seo = await $fetch<{ gscSiteUrl: string }>('/api/hub/seo-config', {
      query: { clientId: resolvedClientId.value },
    })
    siteUrl = seo.gscSiteUrl ?? ''
  } catch {}

  gscConnected.value = saExists && !!siteUrl
  gscMissing.value =
    saExists && siteUrl ? 'none'
    : !saExists && !siteUrl ? 'both'
    : !saExists ? 'sa'
    : 'siteUrl'
  gscSiteUrl.value = siteUrl

  if (gscConnected.value) {
    fetchOpportunities()
  }
})

const kpis = [
  { label: 'Impressions (7j)', value: '—', trend: 0 },
  { label: 'Clics organiques (7j)', value: '—', trend: 0 },
  { label: 'Erreurs 404 (7j)', value: '—', trend: 0 },
]

function runCannibalizationAudit() {
  auditLoading.value = true
  setTimeout(() => { auditLoading.value = false }, 3000)
}

function generateStrategy() {
  
}
</script>
