<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/hub/team" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Permissions par profil</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          Coche les sections du Hub auxquelles chaque profil PrestaShop peut accéder.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="error" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="error">{{ error }}</span>
        <button
          @click="saveAll"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="flex-1 px-6 py-8">
      <div class="h-72 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
    </div>

    <div v-else class="flex-1 overflow-auto">
      <div class="px-6 py-6 space-y-8">
        <section
          v-for="group in SECTION_GROUPS"
          :key="group.label"
          class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
        >
          <header class="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-baseline gap-3">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ group.label }}</h2>
            <p class="text-[11px] text-gray-400 italic">{{ group.subtitle }}</p>
          </header>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-slate-800">
                  <th class="px-4 py-2 font-medium sticky left-0 bg-white dark:bg-slate-900 z-10">Profil</th>
                  <th
                    v-for="s in group.sections"
                    :key="s.key"
                    class="px-3 py-2 font-medium text-center"
                    :title="s.key"
                  >
                    {{ s.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in profiles"
                  :key="p.id"
                  class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/20"
                >
                  <td class="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    <div class="flex items-center gap-2">
                      <span
                        class="text-[10px] font-mono text-gray-400"
                      >#{{ p.id }}</span>
                      <span class="font-medium text-gray-700 dark:text-slate-200">{{ p.name }}</span>
                      <span v-if="p.id === 1" class="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">PaaS</span>
                    </div>
                  </td>
                  <td
                    v-for="s in group.sections"
                    :key="`${p.id}-${s.key}`"
                    class="px-3 py-2.5 text-center"
                  >
                    <input
                      type="checkbox"
                      :checked="hasSection(p.id, s.key)"
                      :disabled="p.id === 1 && s.key === 'dashboard'"
                      @change="toggle(p.id, s.key, ($event.target as HTMLInputElement).checked)"
                      class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess, refreshSections } = useRoles()
if (!canAccess('founder_admin')) {
  navigateTo('/hub/dashboard')
}

const SECTION_GROUPS = [
  {
    label: 'Cœur métier',
    subtitle: 'Sections opérationnelles quotidiennes',
    sections: [
      { key: 'dashboard',     label: 'Dashboard' },
      { key: 'catalogue',     label: 'PIM' },
      { key: 'crm',           label: 'CRM' },
      { key: 'orders',        label: 'OMS' },
      { key: 'logistique',    label: 'WMS' },
      { key: 'prm',           label: 'PRM' },
      { key: 'crm_sav',       label: 'SUP' },
      { key: 'fin',           label: 'FIN' },
    ],
  },
  {
    label: 'Croissance & Contenu',
    subtitle: 'Acquisition, marketing, automatisations',
    sections: [
      { key: 'growth',          label: 'MAP — Growth' },
      { key: 'intelligence',    label: 'BI — Intelligence' },
      { key: 'automatisations', label: 'Automatisations' },
      { key: 'playbooks',       label: 'Playbooks' },
      { key: 'playbooks_edit',  label: 'Édition Playbooks' },
    ],
  },
  {
    label: 'Gouvernance & Système',
    subtitle: 'Réservé aux profils admin',
    sections: [
      { key: 'founder_admin', label: 'Founder Admin' },
      { key: 'admin',         label: 'Admin' },
      { key: 'system',        label: 'System' },
    ],
  },
] as const

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

const profiles = ref<Array<{ id: number; name: string }>>([])
const map = reactive<Record<number, Set<string>>>({})

function hasSection(profileId: number, section: string): boolean {
  return map[profileId]?.has(section) ?? false
}

function toggle(profileId: number, section: string, checked: boolean) {
  if (!map[profileId]) map[profileId] = new Set()
  if (checked) map[profileId].add(section)
  else map[profileId].delete(section)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/team/profile-sections')
    profiles.value = data.profiles ?? []
    for (const p of profiles.value) {
      map[p.id] = new Set(data.map?.[p.id] ?? [])
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Chargement impossible'
  } finally {
    loading.value = false
  }
}

async function saveAll() {
  saving.value = true
  saved.value = false
  error.value = null
  try {
    await Promise.all(profiles.value.map(p =>
      $fetch(`/api/bo/team/profile-sections/${p.id}`, {
        method: 'PUT',
        body: { sections: [...(map[p.id] ?? [])] },
      })
    ))
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
    refreshSections()
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { error.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
