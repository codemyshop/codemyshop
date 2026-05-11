<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Automates</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ filtered.length }} / {{ automates.length }} automate{{ automates.length > 1 ? 's' : '' }} ·
          <span class="text-emerald-600">{{ counts.recurring }} cron</span> ·
          <span class="text-blue-600">{{ counts.oneshot }} oneshot</span> ·
          <span class="text-gray-500">{{ counts.lib }} lib</span> ·
          <span class="text-gray-500">{{ counts.tool }} tool</span> ·
          <span class="text-gray-500">{{ counts.meta }} meta</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="kindFilter"
          class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">Tous kinds</option>
          <option value="recurring">Cron (recurring)</option>
          <option value="oneshot">One-shot</option>
          <option value="lib">Lib</option>
          <option value="tool">Tool</option>
          <option value="meta">Meta</option>
        </select>
        <select
          v-model="agentFilter"
          class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">Tous agents</option>
          <option v-for="a in agentOptions" :key="a || 'none'" :value="a || '__none__'">
            {{ a || '— aucun —' }}
          </option>
        </select>
        <input
          v-model="search"
          type="text"
          placeholder="Nom, description, schedule…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <button
          @click="load"
          :disabled="loading"
          class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          {{ loading ? '…' : 'Rafraîchir' }}
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !automates.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun automate</p>
        <p class="text-xs mt-1">Ajuste les filtres ou vérifie que cs_automates est peuplée.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">Automate</th>
            <th class="px-4 py-2.5 font-medium w-24">Kind</th>
            <th class="px-4 py-2.5 font-medium w-32">Caste</th>
            <th class="px-4 py-2.5 font-medium w-36">Schedule</th>
            <th class="px-4 py-2.5 font-medium w-40">Agent</th>
            <th class="px-4 py-2.5 font-medium w-36">Model</th>
            <th class="px-4 py-2.5 font-medium w-36">Dernier run</th>
            <th class="px-4 py-2.5 font-medium w-24 text-center">Statut</th>
            <th class="px-4 py-2.5 font-medium w-16 text-center">Actif</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in filtered"
            :key="a.keyName"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors align-top"
          >
            <td class="px-4 py-2.5">
              <div class="font-mono text-xs text-gray-800 dark:text-slate-100">{{ a.keyName }}</div>
              <div v-if="a.name && a.name !== a.keyName" class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{{ a.name }}</div>
              <div v-if="a.description" class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 line-clamp-2">{{ a.description }}</div>
            </td>
            <td class="px-4 py-2.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :class="kindClass(a.kind)">
                {{ a.kind }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">{{ a.caste }}</td>
            <td class="px-4 py-2.5 font-mono text-[11px] text-gray-600 dark:text-slate-300">
              <span v-if="a.schedule">{{ a.schedule }}</span>
              <span v-else-if="a.kind === 'recurring'" class="text-amber-500 italic">cron manquant</span>
              <span v-else class="text-gray-300 dark:text-slate-600">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <div v-if="a.agentCodename">
                <span class="font-mono text-gray-700 dark:text-slate-200">{{ a.agentCodename }}</span>
                <div v-if="a.agentNickname" class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                  {{ a.agentNickname }}<span v-if="a.agentRole"> · {{ a.agentRole }}</span>
                </div>
              </div>
              <span v-else class="text-gray-300 dark:text-slate-600 italic">—</span>
            </td>
            <td class="px-4 py-2.5">
              <template v-if="a.cliModel">
                <span
                  v-for="m in a.cliModel.split(',')"
                  :key="m"
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded font-mono mr-1 mb-0.5"
                  :class="modelClass(m)"
                >{{ m }}</span>
              </template>
              <span v-else class="text-gray-300 dark:text-slate-600 italic text-xs">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-600 dark:text-slate-300">
              <div v-if="a.lastRunAt">
                {{ formatDate(a.lastRunAt) }}
                <div class="text-[10px] text-gray-400 mt-0.5">
                  {{ a.lastDurationS != null ? `${Number(a.lastDurationS).toFixed(1)}s` : '' }}
                </div>
              </div>
              <span v-else class="text-gray-300 dark:text-slate-600 italic">jamais</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span
                v-if="a.lastResult"
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="resultClass(a.lastResult, a.lastErrors)"
              >
                {{ resultLabel(a.lastResult, a.lastErrors) }}
              </span>
              <span v-else class="text-[10px] text-gray-300 dark:text-slate-600">—</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="a.active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'"
              >
                {{ a.active ? 'on' : 'off' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { isOwner } = useRoles()
if (!isOwner.value) navigateTo('/hub/dashboard')

interface AutomateRow {
  keyName: string
  name: string
  description: string | null
  caste: string
  kind: 'recurring' | 'oneshot' | 'lib' | 'meta' | 'tool'
  schedule: string | null
  hourUtc: number | null
  agentCodename: string | null
  agentNickname: string | null
  agentRole: string | null
  cliModel: string | null
  active: 0 | 1
  lastRunAt: string | null
  lastResult: string | null
  lastDurationS: number | null
  lastErrors: number | null
}

const automates = ref<AutomateRow[]>([])
const loading = ref(false)
const search = ref('')
const kindFilter = ref('')
const agentFilter = ref('')

const counts = computed(() => {
  const c = { recurring: 0, oneshot: 0, lib: 0, meta: 0, tool: 0 } as Record<string, number>
  for (const a of automates.value) c[a.kind] = (c[a.kind] || 0) + 1
  return c
})

const agentOptions = computed(() => {
  const set = new Set<string>()
  for (const a of automates.value) set.add(a.agentCodename || '')
  return Array.from(set).sort()
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return automates.value.filter((a) => {
    if (kindFilter.value && a.kind !== kindFilter.value) return false
    if (agentFilter.value) {
      if (agentFilter.value === '__none__' && a.agentCodename) return false
      if (agentFilter.value !== '__none__' && a.agentCodename !== agentFilter.value) return false
    }
    if (!q) return true
    return (
      a.keyName.toLowerCase().includes(q) ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.schedule || '').toLowerCase().includes(q) ||
      (a.agentCodename || '').toLowerCase().includes(q) ||
      (a.caste || '').toLowerCase().includes(q)
    )
  })
})

function formatDate(d: string) {
  const date = new Date(d.replace(' ', 'T'))
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function resultLabel(r: string | null, errors: number | null): string {
  if (!r) return '—'
  if (Number(errors) > 0) return 'erreur'
  return r
}

function resultClass(r: string | null, errors: number | null): string {
  if (Number(errors) > 0) return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  if (r === 'ok' || r === 'success') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (r === 'warning' || r === 'warn') return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
}

function kindClass(k: string): string {
  switch (k) {
    case 'recurring': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'oneshot': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'lib': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    case 'tool': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    case 'meta': return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
    default: return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
  }
}

function modelClass(m: string): string {
  const s = m.trim().toLowerCase()
  if (s.startsWith('claude-opus') || s === 'opus') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (s.startsWith('claude-sonnet') || s === 'sonnet') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  if (s.startsWith('claude-haiku') || s === 'haiku') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (s.startsWith('mistral')) return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  if (s.startsWith('gemini')) return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  if (s === 'claude:default') return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ automates: AutomateRow[] }>('/api/bo/system/automates')
    automates.value = data.automates ?? []
  } finally { loading.value = false }
}

onMounted(load)
</script>
