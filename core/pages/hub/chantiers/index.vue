<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">🚧 Chantiers</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ chantiers.length }} chantier(s) {{ view === 'active' ? 'actifs' : view }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <select v-model="view" @change="loadAll"
            class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200">
            <option value="active">Actifs</option>
            <option value="paused">En pause</option>
            <option value="done">Terminés</option>
            <option value="all">Tout</option>
          </select>
          <button @click="loadAll" class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button @click="creating = true"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors">
            + Nouveau
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-4">

      <!-- Skeleton loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i"
          class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 animate-pulse">
          <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/3 mb-2" />
          <div class="h-3 bg-gray-50 dark:bg-slate-800 rounded w-2/3" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!chantiers.length"
        class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-10 text-center">
        <p class="text-sm text-gray-400">Aucun chantier dans cette vue.</p>
        <button @click="creating = true"
          class="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700">
          Créer le premier chantier
        </button>
      </div>

      <!-- Liste -->
      <div v-else class="space-y-3">
        <NuxtLink v-for="c in chantiers" :key="c.idChantier"
          :to="`/hub/chantiers/${c.codename}`"
          class="block bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <span :class="priorityClass(c.priority)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ c.priority }}</span>
                <span :class="statusClass(c.status)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{{ c.status }}</span>
                <span v-if="c.clientId" class="text-[10px] font-medium text-gray-500 dark:text-slate-400">{{ c.clientId }}</span>
              </div>
              <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                {{ c.title }}
              </h3>
              <p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5 font-mono">{{ c.codename }}</p>
              <div v-if="c.currentTask || c.nextAction" class="mt-2 text-xs text-gray-600 dark:text-slate-300">
                <span v-if="c.currentTask" class="font-medium">📍 {{ c.currentTask }}</span>
                <span v-if="c.nextAction" class="block mt-0.5 text-gray-500 dark:text-slate-400">→ {{ c.nextAction.slice(0, 120) }}{{ c.nextAction.length > 120 ? '…' : '' }}</span>
              </div>
              <div v-if="c.blockers" class="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 px-2 py-1 rounded">
                🚫 {{ c.blockers.slice(0, 100) }}
              </div>
            </div>
            <div class="text-right shrink-0">
              <p v-if="c.estimatedEffortD" class="text-[10px] text-gray-400 uppercase">Effort</p>
              <p v-if="c.estimatedEffortD" class="text-xs font-bold text-gray-700 dark:text-slate-200">
                {{ c.spentEffortD || 0 }}/{{ c.estimatedEffortD }}j
              </p>
              <p v-if="c.deadline" class="text-[10px] text-gray-400 mt-1">{{ c.deadline }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Creation modal -->
      <div v-if="creating" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="creating = false">
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6">
          <h2 class="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Nouveau chantier</h2>
          <div class="space-y-3">
            <input v-model="newChantier.codename" placeholder="codename (slug, ex: example-shop-bascule)"
              class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
            <input v-model="newChantier.title" placeholder="Titre lisible"
              class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
            <input v-model="newChantier.clientId" placeholder="client_id (optionnel)"
              class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
            <div class="flex gap-2">
              <select v-model="newChantier.priority" class="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
              <select v-model="newChantier.status" class="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
                <option value="discovery">discovery</option>
                <option value="planning">planning</option>
                <option value="dev">dev</option>
                <option value="test">test</option>
                <option value="bascule">bascule</option>
              </select>
            </div>
            <textarea v-model="newChantier.nextAction" placeholder="Next action (optionnel)" rows="2"
              class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="creating = false" class="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button @click="createChantier" :disabled="!newChantier.codename || !newChantier.title || saving"
              class="flex-1 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {{ saving ? 'Création…' : 'Créer' }}
            </button>
          </div>
          <p v-if="createError" class="mt-3 text-xs text-red-600">{{ createError }}</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const view = ref<'active' | 'paused' | 'done' | 'all'>('active')
const chantiers = ref<any[]>([])
const loading = ref(true)
const creating = ref(false)
const saving = ref(false)
const createError = ref('')

const newChantier = reactive({
  codename: '',
  title: '',
  clientId: '',
  priority: 'P1',
  status: 'planning',
  nextAction: '',
})

async function loadAll() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/chantier', { params: { view: view.value } })
    chantiers.value = res?.chantiers || []
  } catch (e) {
    console.error('[chantiers] load error', e)
    chantiers.value = []
  } finally {
    loading.value = false
  }
}

async function createChantier() {
  if (!newChantier.codename || !newChantier.title) return
  saving.value = true
  createError.value = ''
  try {
    const res: any = await $fetch('/api/chantier', {
      method: 'POST',
      body: { ...newChantier },
    })
    if (res?.success) {
      creating.value = false
      Object.assign(newChantier, { codename: '', title: '', clientId: '', priority: 'P1', status: 'planning', nextAction: '' })
      await loadAll()
    } else {
      createError.value = res?.error || 'erreur création'
    }
  } catch (e: any) {
    createError.value = e?.data?.error || e?.message || 'erreur réseau'
  } finally {
    saving.value = false
  }
}

function priorityClass(p: string) {
  return {
    P0: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    P1: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    P2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    P3: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  }[p] || 'bg-gray-100 text-gray-600'
}

function statusClass(s: string) {
  return {
    discovery: 'bg-purple-100 text-purple-700',
    planning:  'bg-blue-100 text-blue-700',
    dev:       'bg-emerald-100 text-emerald-700',
    test:      'bg-cyan-100 text-cyan-700',
    bascule:   'bg-pink-100 text-pink-700',
    done:      'bg-gray-100 text-gray-500',
    paused:    'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-500',
  }[s] || 'bg-gray-100 text-gray-600'
}

onMounted(loadAll)
</script>
