<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Fleet Monitor &middot; Vaisseau M&egrave;re</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ fleet?.totalInstances ?? 0 }} instance(s) &middot;
            {{ fleet?.healthyCount ?? 0 }} saines
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="load" :disabled="loading"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-950 transition-colors disabled:opacity-50">
            <svg :class="loading ? 'animate-spin' : ''" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Scanner la flotte
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div v-if="fleet" class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-gray-900">{{ fleet.totalInstances }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">Instances</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold" :class="fleet.unhealthyCount > 0 ? 'text-danger-600' : 'text-success-600'">
            {{ fleet.healthyCount }}/{{ fleet.totalInstances }}
          </p>
          <p class="text-[10px] text-gray-400 mt-0.5">Sant&eacute;</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-primary-600">{{ formatEur(fleet.totalMrr) }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">MRR total</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-success-600">{{ formatEur(fleet.totalGrossMargin) }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">Marge brute</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold" :class="fleet.avgMarginPercent > 80 ? 'text-success-600' : fleet.avgMarginPercent > 50 ? 'text-amber-600' : 'text-danger-600'">
            {{ fleet.avgMarginPercent }}%
          </p>
          <p class="text-[10px] text-gray-400 mt-0.5">Marge moyenne</p>
        </div>
      </div>

      
      <div v-if="fleet" class="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
        <div class="grid grid-cols-4 gap-4 text-center text-xs">
          <div><p class="text-lg font-extrabold">{{ formatEur(fleet.totalMrr) }}</p><p class="text-gray-400">Revenus</p></div>
          <div><p class="text-lg font-extrabold text-danger-400">{{ formatUsd(fleet.totalAiCost) }}</p><p class="text-gray-400">Co&ucirc;t IA</p></div>
          <div><p class="text-lg font-extrabold text-amber-400">{{ formatEur(fleet.totalVpsCost) }}</p><p class="text-gray-400">Co&ucirc;t VPS</p></div>
          <div><p class="text-lg font-extrabold text-success-400">{{ formatEur(fleet.totalGrossMargin) }}</p><p class="text-gray-400">Marge nette</p></div>
        </div>
        <div class="mt-3 h-3 bg-gray-700 rounded-full overflow-hidden flex">
          <div class="h-full bg-danger-500 transition-all" :style="`width: ${costPercent('ai')}%`" title="Coût IA" />
          <div class="h-full bg-amber-500 transition-all" :style="`width: ${costPercent('vps')}%`" title="Coût VPS" />
          <div class="h-full bg-success-500 transition-all" :style="`width: ${costPercent('margin')}%`" title="Marge" />
        </div>
        <div class="flex justify-between mt-1 text-[9px] text-gray-500">
          <span>IA {{ costPercent('ai') }}%</span>
          <span>VPS {{ costPercent('vps') }}%</span>
          <span>Marge {{ costPercent('margin') }}%</span>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500">Instance</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Docker</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Latence</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-24">Co&ucirc;t IA</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-24">Marge</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-16">%</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-24">Accès</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="inst in fleet?.instances ?? []" :key="inst.clientId" class="hover:bg-gray-50 dark:bg-slate-950">
              <td class="px-4 py-3">
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">{{ inst.clientName }}</p>
                <p class="text-[10px] text-gray-400 font-mono">{{ inst.domain }}</p>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="inst.dockerStatus === 'running' ? 'bg-success-50 text-success-700' : inst.dockerStatus === 'stopped' ? 'bg-danger-50 text-danger-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="inst.dockerStatus === 'running' ? 'bg-success-400' : 'bg-danger-400'" />
                  {{ inst.dockerStatus }}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-xs font-mono" :class="inst.latencyMs < 500 ? 'text-success-600' : inst.latencyMs < 2000 ? 'text-amber-600' : 'text-danger-600'">
                {{ inst.latencyMs }}ms
              </td>
              <td class="px-4 py-3 text-right text-xs">{{ formatUsd(inst.aiCostMtd) }}</td>
              <td class="px-4 py-3 text-right text-xs font-semibold" :class="inst.grossMargin > 0 ? 'text-success-600' : 'text-danger-600'">
                {{ formatEur(inst.grossMargin) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs font-bold" :class="inst.marginPercent > 80 ? 'text-success-600' : inst.marginPercent > 50 ? 'text-amber-600' : 'text-danger-600'">
                  {{ inst.marginPercent }}%
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="getCredsForClient(inst.clientId)"
                  class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                  @click="openCredentials(inst.clientId)"
                >🔑 Credentials</button>
                <span v-else class="text-[10px] text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">Scan en cours...</div>
        <div v-else-if="!fleet?.instances?.length" class="p-8 text-center text-gray-400 text-sm">Aucune instance</div>
      </div>

      
      <Teleport to="body">
        <div v-if="selectedCreds" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="selectedCreds = null">
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">🔑 {{ selectedCredsId }}</h3>
              <button class="text-gray-400 hover:text-gray-600" @click="selectedCreds = null">✕</button>
            </div>
            <div class="space-y-4">
              <div v-if="selectedCreds.admin_url">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Admin URL</p>
                <a :href="selectedCreds.admin_url" target="_blank" class="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all">{{ selectedCreds.admin_url }}</a>
              </div>
              <div v-if="selectedCreds.email">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Login</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-mono text-gray-900 dark:text-white">{{ selectedCreds.email }}</span>
                  <button class="text-[10px] text-primary-600 font-semibold" @click="copy(selectedCreds.email)">Copier</button>
                </div>
              </div>
              <div v-if="selectedCreds.password && selectedCreds.password !== '••••••••'">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Mot de passe</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-mono text-gray-900 dark:text-white">{{ showPwd ? selectedCreds.password : '••••••••••' }}</span>
                  <button class="text-[10px] text-gray-500 font-semibold" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</button>
                  <button v-if="showPwd" class="text-[10px] text-primary-600 font-semibold" @click="copy(selectedCreds.password)">Copier</button>
                </div>
              </div>
              <div v-if="selectedCreds.api_key">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">API Key</p>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-mono text-gray-900 dark:text-white truncate">{{ selectedCreds.api_key }}</span>
                  <button class="text-[10px] text-primary-600 font-semibold" @click="copy(selectedCreds.api_key)">Copier</button>
                </div>
              </div>
              <div v-if="selectedCreds.note" class="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3">
                <p class="text-xs text-gray-500">{{ selectedCreds.note }}</p>
              </div>
            </div>
            <button class="w-full mt-6 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-lg" @click="selectedCreds = null; showPwd = false">Fermer</button>
          </div>
        </div>
      </Teleport>

      
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Prompt Registry (versioning A/B)</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div v-for="(entry, key) in prompts" :key="key" class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 border border-gray-100 dark:border-slate-800">
            <p class="text-xs font-bold text-gray-700 dark:text-slate-200">{{ key }}</p>
            <p class="text-[10px] text-gray-400 mb-2">{{ entry.description }}</p>
            <div v-for="v in entry.variants" :key="v.id" class="flex items-center justify-between text-[10px]">
              <span class="font-mono text-gray-500">{{ v.id }} ({{ v.splitWeight }}%)</span>
              <span class="text-gray-400">{{ v.metrics.executions }} exec</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const fleet   = ref<any>(null)
const prompts = ref<any>({})
const loading = ref(false)
const fleetClients = ref<any[]>([])
const selectedCreds = ref<any>(null)
const selectedCredsId = ref('')
const showPwd = ref(false)

async function load() {
  loading.value = true
  try {
    const [f, p, fc] = await Promise.all([
      $fetch<any>('/api/hub/fleet-status'),
      $fetch<any>('/api/hub/prompt-registry'),
      $fetch<any[]>('/api/fleet').catch(() => []),
    ])
    fleet.value   = f
    prompts.value = p
    fleetClients.value = fc
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function getCredsForClient(clientId: string) {
  return fleetClients.value.find((c: any) => c.id === clientId)?.credentials ?? null
}
function openCredentials(clientId: string) {
  selectedCreds.value = getCredsForClient(clientId)
  selectedCredsId.value = clientId
  showPwd.value = false
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text) } catch {}
}

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}
function costPercent(type: string): number {
  if (!fleet.value || fleet.value.totalMrr === 0) return 0
  const mrr = fleet.value.totalMrr
  if (type === 'ai') return Math.round((fleet.value.totalAiCost / mrr) * 100)
  if (type === 'vps') return Math.round((fleet.value.totalVpsCost / mrr) * 100)
  return Math.round((fleet.value.totalGrossMargin / mrr) * 100)
}

onMounted(load)
</script>
