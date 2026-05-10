<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })


interface Conduite {
  id: number
  slug: string
  name: string
  description: string
  category: string
  nbCues: number
  position: number
  nbRepresentations: number
  lastStartedAt: string | null
  lastStatus: 'en_regie' | 'rideau' | 'arret_plateau' | null
}

interface Cue {
  type: 'agent' | 'automate'
  name: string
  agent?: string
  script?: string
  args?: string[]
}

interface Representation {
  id: number
  status: 'en_regie' | 'rideau' | 'arret_plateau'
  cueCurrent: number
  cueTotal: number
  triggeredBy: string
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  errorMessage: string | null
}

const conduites = ref<Conduite[]>([])
const loading = ref(true)
const selectedConduite = ref<Conduite | null>(null)
const detailCues = ref<Cue[]>([])
const detailRepresentations = ref<Representation[]>([])
const detailLoading = ref(false)
const starting = ref(false)
const startMessage = ref('')

const loadConduites = async () => {
  loading.value = true
  try {
    const data = await $fetch<{ conduites: Conduite[] }>('/api/bo/conduite/conduites')
    conduites.value = data.conduites || []
  } catch (e) {
    console.error('[hub/conduites] load failed', e)
  } finally {
    loading.value = false
  }
}

const openDetail = async (conduite: Conduite) => {
  selectedConduite.value = conduite
  detailLoading.value = true
  detailCues.value = []
  detailRepresentations.value = []
  startMessage.value = ''
  try {
    const data = await $fetch<{ conduite?: { cues: Cue[] }; representations: Representation[] }>(
      `/api/bo/conduite/conduites/${conduite.slug}`,
    )
    detailCues.value = data.conduite?.cues || []
    detailRepresentations.value = data.representations || []
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  selectedConduite.value = null
  detailCues.value = []
  detailRepresentations.value = []
}

const startRepresentation = async () => {
  if (!selectedConduite.value) return
  starting.value = true
  startMessage.value = ''
  try {
    const data = await $fetch<{ success: boolean; idRepresentation?: number; error?: string }>(
      `/api/bo/conduite/conduites/${selectedConduite.value.slug}/start`,
      { method: 'POST', body: { triggered_by: 'manual' } },
    )
    if (data.success) {
      startMessage.value = `Représentation #${data.idRepresentation} créée. Lance le runner pour exécuter les cues.`
      // Reload the detail to see the new representation
      await openDetail(selectedConduite.value)
      // Reload the list to update the counter
      await loadConduites()
    } else {
      startMessage.value = `Erreur : ${data.error}`
    }
  } catch (e: any) {
    startMessage.value = `Erreur : ${e.message || e}`
  } finally {
    starting.value = false
  }
}

const statusLabel = (status: string | null) => {
  if (status === 'en_regie') return 'En régie'
  if (status === 'rideau') return 'Rideau ✓'
  if (status === 'arret_plateau') return 'Arrêt de plateau ✗'
  return '—'
}

const statusColor = (status: string | null) => {
  if (status === 'en_regie') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (status === 'rideau') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (status === 'arret_plateau') return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  return 'bg-slate-500/20 text-slate-400 border-slate-500/40'
}

const cueTypeColor = (type: string) =>
  type === 'agent'
    ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
    : 'bg-sky-500/20 text-sky-300 border-sky-500/40'

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const formatDuration = (ms: number | null) => {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Stats globales
const stats = computed(() => {
  const total = conduites.value.length
  const totalRepresentations = conduites.value.reduce((s, c) => s + c.nbRepresentations, 0)
  const enRegie = conduites.value.filter(c => c.lastStatus === 'en_regie').length
  return { total, totalRepresentations, enRegie }
})

onMounted(loadConduites)
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-10">
        <h1 class="text-3xl font-bold mb-2">La Conduite</h1>
        <p class="text-slate-400 italic">
          L'Agent pense — l'Automate exécute — la Conduite orchestre.
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div class="text-sm text-slate-400 uppercase tracking-wider">Conduites actives</div>
          <div class="text-3xl font-bold mt-1">{{ stats.total }}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div class="text-sm text-slate-400 uppercase tracking-wider">Représentations totales</div>
          <div class="text-3xl font-bold mt-1">{{ stats.totalRepresentations }}</div>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div class="text-sm text-slate-400 uppercase tracking-wider">En régie</div>
          <div class="text-3xl font-bold mt-1 text-amber-400">{{ stats.enRegie }}</div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-slate-500 py-20">
        Chargement des conduites…
      </div>

      <!-- Empty -->
      <div v-else-if="conduites.length === 0" class="text-center text-slate-500 py-20">
        Aucune conduite définie. Le seed du module est-il bien exécuté ?
      </div>

      <!-- List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <button
          v-for="c in conduites"
          :key="c.id"
          @click="openDetail(c)"
          class="text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all"
        >
          <div class="flex items-start justify-between mb-3">
            <span class="text-xs uppercase tracking-wider text-slate-500">
              {{ c.category || 'général' }}
            </span>
            <span
              v-if="c.lastStatus"
              class="text-xs px-2 py-0.5 rounded border"
              :class="statusColor(c.lastStatus)"
            >
              {{ statusLabel(c.lastStatus) }}
            </span>
          </div>
          <h3 class="text-lg font-semibold mb-1">{{ c.name }}</h3>
          <p class="text-sm text-slate-400 mb-4 line-clamp-2">{{ c.description }}</p>
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>{{ c.nbCues }} cues</span>
            <span>{{ c.nbRepresentations }} représentations</span>
          </div>
          <div v-if="c.lastStartedAt" class="text-xs text-slate-600 mt-2">
            Dernière : {{ formatDate(c.lastStartedAt) }}
          </div>
        </button>
      </div>

      <!-- Detail Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="selectedConduite"
            class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
            @click.self="closeDetail"
          >
            <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full my-10 p-8">
              <!-- Header modal -->
              <div class="flex items-start justify-between mb-6">
                <div>
                  <span class="text-xs uppercase tracking-wider text-slate-500">
                    {{ selectedConduite.category || 'général' }} · {{ selectedConduite.slug }}
                  </span>
                  <h2 class="text-2xl font-bold mt-1">{{ selectedConduite.name }}</h2>
                  <p class="text-slate-400 mt-2">{{ selectedConduite.description }}</p>
                </div>
                <button
                  @click="closeDetail"
                  class="text-slate-500 hover:text-white text-2xl leading-none px-2"
                  aria-label="Fermer"
                >×</button>
              </div>

              <!-- Start action -->
              <div class="mb-6 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                <div class="flex items-center justify-between gap-4">
                  <div class="text-sm text-slate-400">
                    Crée une nouvelle représentation. Le runner Python l'exécutera ensuite.
                  </div>
                  <button
                    @click="startRepresentation"
                    :disabled="starting"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold whitespace-nowrap"
                  >
                    {{ starting ? 'Démarrage…' : 'Lever le rideau' }}
                  </button>
                </div>
                <div v-if="startMessage" class="mt-3 text-sm text-amber-300">
                  {{ startMessage }}
                </div>
                <div v-if="startMessage" class="mt-2 text-xs text-slate-500 font-mono">
                  python3 automation/ac_conduite_runner.py --slug {{ selectedConduite.slug }}
                </div>
              </div>

              <!-- Loading detail -->
              <div v-if="detailLoading" class="text-center text-slate-500 py-10">
                Chargement…
              </div>

              <template v-else>
                <!-- Cues -->
                <div class="mb-8">
                  <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Séquence de cues ({{ detailCues.length }})
                  </h3>
                  <ol class="space-y-2">
                    <li
                      v-for="(cue, idx) in detailCues"
                      :key="idx"
                      class="flex items-start gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-lg"
                    >
                      <span class="text-slate-600 font-mono text-sm w-6 text-right">{{ idx + 1 }}.</span>
                      <span
                        class="text-xs px-2 py-0.5 rounded border whitespace-nowrap mt-0.5"
                        :class="cueTypeColor(cue.type)"
                      >
                        {{ cue.type }}
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm">{{ cue.name }}</div>
                        <div v-if="cue.agent" class="text-xs text-slate-500 mt-0.5">
                          → agent : {{ cue.agent }}
                        </div>
                        <div v-if="cue.script" class="text-xs text-slate-500 mt-0.5 font-mono">
                          → {{ cue.script }}{{ cue.args && cue.args.length ? ' ' + cue.args.join(' ') : '' }}
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>

                <!-- Representations -->
                <div>
                  <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Représentations récentes ({{ detailRepresentations.length }})
                  </h3>
                  <div v-if="detailRepresentations.length === 0" class="text-sm text-slate-500 italic">
                    Aucune représentation. Lève le rideau pour en créer une.
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="r in detailRepresentations"
                      :key="r.id"
                      class="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-sm"
                    >
                      <span class="text-slate-600 font-mono w-12">#{{ r.id }}</span>
                      <span
                        class="text-xs px-2 py-0.5 rounded border whitespace-nowrap"
                        :class="statusColor(r.status)"
                      >
                        {{ statusLabel(r.status) }}
                      </span>
                      <span class="text-slate-400 whitespace-nowrap">
                        {{ r.cueCurrent }}/{{ r.cueTotal }}
                      </span>
                      <span class="text-slate-500 whitespace-nowrap">
                        {{ formatDate(r.startedAt) }}
                      </span>
                      <span class="text-slate-500 whitespace-nowrap">
                        {{ formatDuration(r.durationMs) }}
                      </span>
                      <span class="text-slate-600 text-xs ml-auto">{{ r.triggeredBy }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
