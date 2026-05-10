<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Auto-Backlog IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ feedbacks.length }} demande(s) &middot; {{ pendingCount }} en attente</p>
        </div>
        <button @click="loadAll" class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-4">

      <!-- Filtre statut -->
      <div class="flex gap-2">
        <button v-for="f in FILTERS" :key="f.value" @click="filter = f.value"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            filter === f.value ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300']">
          {{ f.label }}
          <span v-if="f.count > 0" class="ml-1 text-[10px] opacity-70">({{ f.count }})</span>
        </button>
      </div>

      <!-- Liste -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 animate-pulse">
          <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/3 mb-2" /><div class="h-3 bg-gray-50 rounded w-2/3" />
        </div>
      </div>

      <div v-else-if="!filtered.length" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-10 text-center text-gray-400 text-sm">
        Aucune demande dans cette cat&eacute;gorie
      </div>

      <div v-else class="space-y-3">
        <div v-for="fb in filtered" :key="fb.id" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">

          <!-- En-t&ecirc;te -->
          <div class="px-5 py-4 flex items-start gap-4">
            <span class="text-lg mt-0.5">{{ typeIcon(fb.type) }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-gray-800 dark:text-slate-100">{{ fb.clientName || fb.clientId }}</span>
                <span :class="priorityClass(fb.priority)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{{ fb.priority }}</span>
                <span class="text-[10px] text-gray-400">{{ formatDate(fb.createdAt) }}</span>
              </div>
              <p class="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">{{ fb.description }}</p>

              <!-- Classification IA -->
              <div v-if="fb.aiClassification" class="mt-2 flex items-center gap-2">
                <span class="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                  &#x1f916; {{ fb.aiClassification }}
                </span>
                <span v-if="fb.estimatedComplexity" class="text-[10px] text-gray-400">{{ fb.estimatedComplexity }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <!-- Generate the prompt -->
              <button v-if="!fb.technicalPrompt" @click="generatePrompt(fb)"
                :disabled="generating === fb.id"
                class="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-40">
                <svg v-if="generating === fb.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Analyser
              </button>

              <!-- Statut -->
              <select v-model="fb.status" @change="updateStatus(fb)" class="text-[10px] border border-gray-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-gray-600 bg-white dark:bg-slate-900">
                <option value="pending">En attente</option>
                <option value="todo">&Agrave; faire</option>
                <option value="in_progress">En cours</option>
                <option value="refused">Refus&eacute;</option>
                <option value="deployed">D&eacute;ploy&eacute;</option>
              </select>
            </div>
          </div>

          <!-- Technical prompt (if generated) -->
          <div v-if="fb.technicalPrompt" class="border-t border-gray-100 dark:border-slate-800 bg-gray-50 px-5 py-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">&#x1f4cb; Prompt Claude Code</p>
              <button @click="copyPrompt(fb)" class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                :class="copiedId === fb.id ? 'text-success-600 bg-success-50' : 'text-primary-600 hover:bg-primary-50'">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                {{ copiedId === fb.id ? 'Copi\u00e9 !' : 'Copier pour Claude Code' }}
              </button>
            </div>
            <pre class="text-xs text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">{{ fb.technicalPrompt }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedbackItem, FeedbackStatus } from '~/server/utils/feedback'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const feedbacks  = ref<FeedbackItem[]>([])
const loading    = ref(true)
const filter     = ref('all')
const generating = ref<string | null>(null)
const copiedId   = ref<string | null>(null)

const FILTERS = computed(() => [
  { value: 'all',         label: 'Toutes',     count: feedbacks.value.length },
  { value: 'pending',     label: 'En attente', count: feedbacks.value.filter(f => f.status === 'pending').length },
  { value: 'todo',        label: '\u00c0 faire',    count: feedbacks.value.filter(f => f.status === 'todo').length },
  { value: 'in_progress', label: 'En cours',   count: feedbacks.value.filter(f => f.status === 'in_progress').length },
  { value: 'deployed',    label: 'D\u00e9ploy\u00e9',   count: feedbacks.value.filter(f => f.status === 'deployed').length },
])

const pendingCount = computed(() => feedbacks.value.filter(f => f.status === 'pending').length)

const filtered = computed(() =>
  filter.value === 'all' ? feedbacks.value : feedbacks.value.filter(f => f.status === filter.value)
)

async function loadAll() {
  loading.value = true
  try {
    feedbacks.value = await $fetch<FeedbackItem[]>('/api/hub/feedback', { query: { all: 'true' } })
  } catch { feedbacks.value = [] }
  finally { loading.value = false }
}

async function generatePrompt(fb: FeedbackItem) {
  if (generating.value) return
  generating.value = fb.id
  try {
    const res = await $fetch<{ aiClassification: string; technicalPrompt: string; estimatedComplexity: string }>(
      '/api/ai/feedback-to-prompt',
      { method: 'POST', body: { feedbackId: fb.id, description: fb.description, type: fb.type, clientId: fb.clientId } }
    )
    fb.aiClassification   = res.aiClassification
    fb.technicalPrompt    = res.technicalPrompt
    fb.estimatedComplexity = res.estimatedComplexity
    fb.status             = 'todo'
  } catch (e) { console.error(e) }
  finally { generating.value = null }
}

async function updateStatus(fb: FeedbackItem) {
  await $fetch('/api/hub/feedback', { method: 'PUT', body: { id: fb.id, status: fb.status } })
}

async function copyPrompt(fb: FeedbackItem) {
  if (!fb.technicalPrompt) return
  await navigator.clipboard.writeText(fb.technicalPrompt)
  copiedId.value = fb.id
  setTimeout(() => { copiedId.value = null }, 2500)
}

function typeIcon(t: string) { return t === 'bug' ? '\ud83d\udc1b' : t === 'improvement' ? '\ud83d\udee0\ufe0f' : '\u2728' }
function priorityClass(p: string) {
  return p === 'high' ? 'bg-danger-50 text-danger-600' : p === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
}
const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

onMounted(loadAll)
</script>
