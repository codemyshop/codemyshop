<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/hub/chantiers" class="text-gray-400 hover:text-primary-600">
            ← Chantiers
          </NuxtLink>
          <span v-if="chantier" :class="priorityClass(chantier.priority)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ chantier.priority }}</span>
          <span v-if="chantier" :class="statusClass(chantier.status)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{{ chantier.status }}</span>
          <h1 v-if="chantier" class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{{ chantier.title }}</h1>
          <span v-if="chantier" class="text-xs text-gray-400 font-mono">{{ chantier.codename }}</span>
        </div>
        <button v-if="chantier && dirty" @click="save"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="saving">
          {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="p-6 max-w-5xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-10 animate-pulse">
        <div class="h-5 bg-gray-100 dark:bg-slate-800 rounded w-1/2 mb-4" />
        <div class="h-3 bg-gray-50 dark:bg-slate-800 rounded w-3/4 mb-2" />
        <div class="h-3 bg-gray-50 dark:bg-slate-800 rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="!chantier" class="p-6 max-w-5xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-10 text-center text-gray-400">
        Chantier introuvable.
      </div>
    </div>

    <div v-else class="p-6 max-w-5xl mx-auto space-y-4">

      <!-- Live state -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">État vivant</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-400">Phase actuelle</label>
            <input v-model="form.currentPhase" @input="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
          </div>
          <div>
            <label class="text-xs text-gray-400">Tâche en cours</label>
            <input v-model="form.currentTask" @input="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-gray-400">Next action</label>
            <textarea v-model="form.nextAction" @input="dirty = true" rows="2"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-gray-400">Blockers</label>
            <textarea v-model="form.blockers" @input="dirty = true" rows="2"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
          </div>
          <div>
            <label class="text-xs text-gray-400">Status</label>
            <select v-model="form.status" @change="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
              <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Priorité</label>
            <select v-model="form.priority" @change="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
              <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Effort estimé (jours)</label>
            <input v-model.number="form.estimatedEffortD" type="number" step="0.5" @input="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
          </div>
          <div>
            <label class="text-xs text-gray-400">Effort passé (jours)</label>
            <input v-model.number="form.spentEffortD" type="number" step="0.5" @input="dirty = true"
              class="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
          </div>
        </div>
      </div>

      <!-- Conduite (playbook) -->
      <div v-if="conduite" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            🎭 Conduite : {{ conduite.name }}
            <span class="ml-2 font-mono text-[10px] text-gray-400">{{ conduite.slug }}</span>
          </h2>
          <span class="text-xs text-gray-500">
            cue {{ (chantier.currentCuePosition || 0) + 1 }}/{{ conduite.cues?.length || 0 }}
          </span>
        </div>
        <!-- Progress bar -->
        <div class="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
          <div class="h-full bg-primary-500 transition-all duration-300"
               :style="{ width: progressPct + '%' }" />
        </div>
        <!-- Cues list -->
        <ol class="space-y-1.5">
          <li v-for="(cue, i) in conduite.cues" :key="i"
              :class="cueClass(i)"
              class="flex items-start gap-3 px-3 py-2 rounded-lg text-xs transition-colors">
            <span class="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                  :class="cueBadgeClass(i)">
              {{ i + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span :class="cueTypeClass(cue.type)" class="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
                  {{ cue.type }}
                </span>
                <span v-if="cue.agent" class="text-[10px] text-gray-500 dark:text-slate-400 font-mono">{{ cue.agent }}</span>
                <span v-if="cue.script" class="text-[10px] text-gray-500 dark:text-slate-400 font-mono truncate">{{ cue.script }}</span>
              </div>
              <p class="text-gray-700 dark:text-slate-200 mt-0.5">{{ cue.name }}</p>
            </div>
            <button v-if="i === (chantier.currentCuePosition || 0)"
                    @click.stop.prevent="advanceCue"
                    class="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">
              ✓ done
            </button>
          </li>
        </ol>
      </div>

      <!-- Decisions -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Décisions ({{ chantier.decisions?.length || 0 }})
        </h2>
        <div v-if="!chantier.decisions?.length" class="text-xs text-gray-400">Aucune décision tracée.</div>
        <div v-else class="space-y-2">
          <div v-for="(d, i) in chantier.decisions" :key="i" class="text-xs border-l-2 border-primary-200 pl-3 py-1">
            <p class="font-semibold text-gray-700 dark:text-slate-200">{{ d.decision }}</p>
            <p v-if="d.rationale" class="text-gray-500 dark:text-slate-400 mt-0.5">{{ d.rationale }}</p>
            <p class="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">{{ d.date }}</p>
          </div>
        </div>
      </div>

      <!-- Discoveries -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Découvertes ({{ chantier.discoveries?.length || 0 }})
        </h2>
        <div v-if="!chantier.discoveries?.length" class="text-xs text-gray-400">Aucune découverte tracée.</div>
        <div v-else class="space-y-2">
          <div v-for="(d, i) in chantier.discoveries" :key="i" class="text-xs border-l-2 border-emerald-200 pl-3 py-1">
            <p class="text-gray-700 dark:text-slate-200">{{ d.finding }}</p>
            <p class="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">{{ d.date }} · {{ d.source }}</p>
          </div>
        </div>
      </div>

      <!-- Context (raw JSON) -->
      <div v-if="chantier.context" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Contexte technique</h2>
        <pre class="text-[11px] text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 rounded p-3 overflow-x-auto">{{ JSON.stringify(chantier.context, null, 2) }}</pre>
      </div>

      <!-- Liens -->
      <div v-if="chantier.repoPaths || chantier.relatedVps || chantier.relatedBacklog"
        class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Liens</h2>
        <div class="space-y-1 text-xs text-gray-600 dark:text-slate-300">
          <p v-if="chantier.repoPaths"><span class="text-gray-400">Repo :</span> <code>{{ chantier.repoPaths }}</code></p>
          <p v-if="chantier.relatedVps"><span class="text-gray-400">VPS :</span> <code>{{ chantier.relatedVps }}</code></p>
          <p v-if="chantier.relatedBacklog"><span class="text-gray-400">Backlog :</span> <code>{{ chantier.relatedBacklog }}</code></p>
        </div>
      </div>

      <!-- Notes libres -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Notes</h2>
        <textarea v-model="form.notes" @input="dirty = true" rows="4"
          class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const STATUSES   = ['discovery', 'planning', 'dev', 'test', 'bascule', 'done', 'paused', 'cancelled'] as const
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const

const route = useRoute()
const codename = computed(() => String(route.params.codename))

const chantier = ref<any>(null)
const conduite = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)

const progressPct = computed(() => {
  if (!conduite.value?.cues?.length) return 0
  const pos = chantier.value?.currentCuePosition || 0
  return Math.min(100, Math.round((pos / conduite.value.cues.length) * 100))
})

const form = reactive({
  currentPhase: '',
  currentTask: '',
  nextAction: '',
  blockers: '',
  status: 'planning' as string,
  priority: 'P1' as string,
  estimatedEffortD: null as number | null,
  spentEffortD: 0 as number,
  notes: '',
})

async function load() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/chantier', { params: { codename: codename.value } })
    if (res?.success && res.chantier) {
      chantier.value = res.chantier
      form.currentPhase     = res.chantier.currentPhase || ''
      form.currentTask      = res.chantier.currentTask || ''
      form.nextAction       = res.chantier.nextAction || ''
      form.blockers         = res.chantier.blockers || ''
      form.status           = res.chantier.status || 'planning'
      form.priority         = res.chantier.priority || 'P1'
      form.estimatedEffortD = res.chantier.estimatedEffortD
      form.spentEffortD     = res.chantier.spentEffortD || 0
      form.notes            = res.chantier.notes || ''
      dirty.value = false

      // If linked to a scenario, fetch the complete playbook
      if (res.chantier.conduiteSlug) {
        await loadConduite(res.chantier.conduiteSlug)
      } else {
        conduite.value = null
      }
    }
  } catch (e) {
    console.error('[chantier] load error', e)
  } finally {
    loading.value = false
  }
}

async function loadConduite(slug: string) {
  try {
    const res: any = await $fetch(`/api/hub/conduite/${encodeURIComponent(slug)}`)
    if (res?.success && res.conduite) {
      conduite.value = res.conduite
    } else {
      conduite.value = null
    }
  } catch (e) {
    console.error('[conduite] load error', e)
    conduite.value = null
  }
}

async function advanceCue() {
  if (!chantier.value || !conduite.value) return
  const newPos = (chantier.value.currentCuePosition || 0) + 1
  try {
    await $fetch('/api/chantier', {
      method: 'PUT',
      body: {
        codename: codename.value,
        currentCuePosition: newPos,
      },
    })
    await load()
  } catch (e) {
    console.error('[chantier] advance cue error', e)
  }
}

function cueClass(i: number) {
  const pos = chantier.value?.currentCuePosition || 0
  if (i < pos) return 'bg-emerald-50 dark:bg-emerald-950/30 text-gray-500 line-through opacity-70'
  if (i === pos) return 'bg-primary-50 dark:bg-primary-950/30 ring-1 ring-primary-300 dark:ring-primary-700'
  return 'bg-gray-50 dark:bg-slate-800/40 text-gray-600 dark:text-slate-400'
}

function cueBadgeClass(i: number) {
  const pos = chantier.value?.currentCuePosition || 0
  if (i < pos) return 'bg-emerald-500 text-white'
  if (i === pos) return 'bg-primary-600 text-white'
  return 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
}

function cueTypeClass(t: string) {
  return {
    agent:    'bg-violet-100 text-violet-700',
    automate: 'bg-cyan-100 text-cyan-700',
  }[t] || 'bg-gray-100 text-gray-600'
}

async function save() {
  if (!chantier.value) return
  saving.value = true
  try {
    await $fetch('/api/chantier', {
      method: 'PUT',
      body: {
        codename: codename.value,
        currentPhase:     form.currentPhase || null,
        currentTask:      form.currentTask || null,
        nextAction:       form.nextAction || null,
        blockers:         form.blockers || null,
        status:           form.status,
        priority:         form.priority,
        estimatedEffortD: form.estimatedEffortD,
        spentEffortD:     form.spentEffortD,
        notes:            form.notes || null,
      },
    })
    dirty.value = false
    await load()
  } catch (e) {
    console.error('[chantier] save error', e)
  } finally {
    saving.value = false
  }
}

function priorityClass(p: string) {
  return {
    P0: 'bg-red-100 text-red-700',
    P1: 'bg-orange-100 text-orange-700',
    P2: 'bg-yellow-100 text-yellow-700',
    P3: 'bg-gray-100 text-gray-600',
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

onMounted(load)
watch(codename, load)
</script>
