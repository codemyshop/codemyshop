<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Cron</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ filtered.length }} automate{{ filtered.length > 1 ? 's' : '' }} récurrent{{ filtered.length > 1 ? 's' : '' }} · lecture seule</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          type="text"
          placeholder="Nom, schedule, agent…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <button @click="load" :disabled="loading" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
          {{ loading ? '…' : 'Rafraîchir' }}
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !crons.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun cron récurrent</p>
        <p class="text-xs mt-1">La table cs_automates n'est pas peuplée sur ce tenant.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">Automate</th>
            <th class="px-4 py-2.5 font-medium w-32">Caste</th>
            <th class="px-4 py-2.5 font-medium w-36">Schedule</th>
            <th class="px-4 py-2.5 font-medium w-40">Dernière exécution</th>
            <th class="px-4 py-2.5 font-medium w-20 text-center">Durée</th>
            <th class="px-4 py-2.5 font-medium w-24 text-center">Statut</th>
            <th class="px-4 py-2.5 font-medium w-20 text-center">Actif</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in filtered"
            :key="c.keyName"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors"
          >
            <td class="px-4 py-2.5">
              <div class="font-mono text-xs text-gray-800 dark:text-slate-100">{{ c.keyName }}</div>
              <div v-if="c.name && c.name !== c.keyName" class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">{{ c.name }}</div>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ c.caste }}</td>
            <td class="px-4 py-2.5 font-mono text-[11px] text-gray-600 dark:text-slate-300">{{ c.schedule || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-600 dark:text-slate-300">
              <span v-if="c.lastRunAt">{{ formatDate(c.lastRunAt) }}</span>
              <span v-else class="text-gray-300 italic">jamais</span>
            </td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-500">
              {{ c.lastDurationS != null ? `${Number(c.lastDurationS).toFixed(1)}s` : '—' }}
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="c.lastResult" class="text-[10px] px-2 py-0.5 rounded-full font-medium" :class="resultClass(c.lastResult, c.lastErrors)">
                {{ resultLabel(c.lastResult, c.lastErrors) }}
              </span>
              <span v-else class="text-[10px] text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'">
                {{ c.active ? 'on' : 'off' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { isOwner } = useRoles()
if (!isOwner.value) navigateTo('/hub/dashboard')

interface CronRow {
  keyName: string; name: string; description: string
  caste: string; schedule: string; agentCodename: string | null
  active: 0 | 1
  lastRunAt: string | null
  lastResult: string | null
  lastDurationS: number | null
  lastErrors: number | null
}

const crons = ref<CronRow[]>([])
const loading = ref(false)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return crons.value
  return crons.value.filter(c =>
    c.keyName.toLowerCase().includes(q) ||
    (c.name || '').toLowerCase().includes(q) ||
    (c.schedule || '').toLowerCase().includes(q) ||
    (c.agentCodename || '').toLowerCase().includes(q),
  )
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
  if (Number(errors) > 0) return 'bg-red-50 text-red-600'
  if (r === 'ok' || r === 'success') return 'bg-emerald-50 text-emerald-600'
  if (r === 'warning' || r === 'warn') return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-500'
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ crons: CronRow[] }>('/api/bo/system/cron')
    crons.value = data.crons ?? []
  } finally { loading.value = false }
}

onMounted(load)
</script>
