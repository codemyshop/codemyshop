<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Playbooks</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} playbook{{ total > 1 ? 's' : '' }}{{ !isOwner ? ` — ${roleLabel}` : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Toggle groupage profil / feature -->
        <div class="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <button @click="groupBy = 'role'"
            class="text-xs px-3 py-1.5 transition-colors"
            :class="groupBy === 'role' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'">
            Par profil
          </button>
          <button @click="groupBy = 'feature'"
            class="text-xs px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-slate-700"
            :class="groupBy === 'feature' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'">
            Par feature
          </button>
        </div>
        <select v-if="isOwner" v-model="statusFilter" @change="load" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="all">Tous</option>
        </select>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">Actualiser</button>
        <NuxtLink v-if="isOwner" to="/hub/playbooks/create" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau playbook
        </NuxtLink>
      </div>
    </header>

    <!-- Tabs : groupes dynamiques -->
    <nav v-if="!loading && tabs.length > 1" class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 shrink-0 overflow-x-auto">
      <ul class="flex gap-1 min-w-max">
        <li v-for="tab in tabs" :key="tab.key">
          <button @click="activeTab = tab.key"
            class="text-xs px-3 py-2.5 border-b-2 transition-colors font-medium flex items-center gap-1.5"
            :class="activeTab === tab.key
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'">
            <span>{{ tab.label }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full"
              :class="activeTab === tab.key ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'">
              {{ tab.count }}
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!playbooks.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg class="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
        <p class="text-sm">Aucun playbook disponible</p>
      </div>

      <div v-else-if="!visiblePlaybooks.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun playbook dans ce groupe</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink v-for="p in visiblePlaybooks" :key="p.id_ac_playbook" :to="`/hub/playbooks/${p.slug}`"
          class="group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all">
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors">{{ p.title }}</h3>
            <span v-if="isOwner && p.status !== 'published'" class="text-[10px] px-2 py-0.5 rounded-full font-medium"
              :class="p.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'">
              {{ p.status === 'draft' ? 'Brouillon' : 'Archivé' }}
            </span>
          </div>
          <p v-if="p.description" class="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-3">{{ p.description }}</p>
          <div class="flex items-center gap-2 flex-wrap">
            <span v-if="p.feature_id"
              class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-mono">
              ⚙︎ {{ p.feature_id }}
            </span>
            <span v-for="r in splitRoles(p.roles)" :key="r"
              class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {{ r }}
            </span>
          </div>
          <p class="text-[10px] text-gray-400 mt-3">{{ formatDate(p.date_upd) }}</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { role, roleLabel, isOwner } = useRoles()
const playbooks = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const statusFilter = ref('published')

const groupBy = ref<'role' | 'feature'>('role')
const activeTab = ref<string>('__all__')

function splitRoles(roles: string | null | undefined): string[] {
  return (roles || '').split(',').map(r => r.trim()).filter(Boolean)
}

/** Computed groups: key = role or feature_id, value = playbooks. */
const groups = computed<Record<string, any[]>>(() => {
  const out: Record<string, any[]> = {}
  for (const p of playbooks.value) {
    const keys: string[] = []
    if (groupBy.value === 'role') {
      const roles = splitRoles(p.roles)
      if (roles.length === 0) keys.push('__none__')
      else keys.push(...roles)
    } else {
      keys.push(p.feature_id ? String(p.feature_id) : '__none__')
    }
    for (const k of keys) {
      if (!out[k]) out[k] = []
      out[k].push(p)
    }
  }
  return out
})

/** Tabs dynamically generated from groups (+ "All" at the top). */
const tabs = computed(() => {
  const list: { key: string; label: string; count: number }[] = [
    { key: '__all__', label: 'Tous', count: playbooks.value.length },
  ]
  const keys = Object.keys(groups.value).sort((a, b) => {
    // __none__ en queue
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return a.localeCompare(b)
  })
  for (const k of keys) {
    const label = k === '__none__'
      ? (groupBy.value === 'role' ? 'Sans profil' : 'Sans feature')
      : k
    list.push({ key: k, label, count: groups.value[k].length })
  }
  return list
})

const visiblePlaybooks = computed(() => {
  if (activeTab.value === '__all__') return playbooks.value
  return groups.value[activeTab.value] || []
})

// Reset active tab on grouping mode change
watch(groupBy, () => { activeTab.value = '__all__' })

async function load() {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (isOwner.value) {
      query.status = statusFilter.value
    } else {
      query.role = role.value
    }
    const data = await $fetch<any>('/api/bo/playbooks', { query })
    playbooks.value = data.playbooks ?? []
    total.value = data.total ?? 0
    activeTab.value = '__all__'
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(() => load())
</script>
