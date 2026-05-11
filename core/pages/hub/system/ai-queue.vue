<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">FinOps &middot; AI Task Queue</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ tasks.length }} t&acirc;che(s) &middot; {{ formatUsd(totalCost) }} d&eacute;pens&eacute;</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="showCreate = true" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nouvelle t&acirc;che
          </button>
          <button @click="loadTasks" class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-gray-900">{{ tasks.length }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Total t&acirc;ches</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-amber-600">{{ pendingCount }}</p>
          <p class="text-xs text-gray-400 mt-0.5">En attente</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-success-600">{{ formatUsd(totalCost) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Co&ucirc;t r&eacute;el total</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-primary-600">{{ totalTokens.toLocaleString('fr-FR') }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Tokens consomm&eacute;s</p>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500">T&acirc;che</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-28">Mod&egrave;le</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-24">Statut</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Progression</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-24">Estim&eacute;</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-24">R&eacute;el</th>
              <th class="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="t in tasks" :key="t.id" class="hover:bg-gray-50 dark:bg-slate-950 transition-colors group">
              <td class="px-4 py-3">
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate max-w-xs">{{ t.name }}</p>
                <p class="text-[10px] text-gray-400 font-mono">{{ t.clientId }} &middot; {{ t.id.slice(0, 8) }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs font-mono text-gray-600 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{ t.model.split('-').slice(-2).join('-') }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="statusClass(t.status)" class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(t.status)" />
                  {{ statusLabel(t.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs font-semibold text-gray-700 dark:text-slate-200">{{ t.completedItems }}/{{ t.totalItems }}</span>
              </td>
              <td class="px-4 py-3 text-right text-xs text-gray-500">{{ formatUsd(t.estimatedCost) }}</td>
              <td class="px-4 py-3 text-right text-xs font-semibold" :class="t.actualCost != null ? 'text-success-600' : 'text-gray-400'">
                {{ t.actualCost != null ? formatUsd(t.actualCost) : '\u2014' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button v-if="t.status === 'pending'" @click="executeTask(t.id)" :disabled="executing === t.id"
                    class="text-[10px] font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition-colors">
                    {{ executing === t.id ? '\u2026' : '\u25b6 Exec' }}
                  </button>
                  <button @click="inspectTask = t" class="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded hover:bg-gray-100 dark:bg-slate-800 transition-colors">
                    Voir
                  </button>
                  <button @click="deleteTask(t.id)" class="text-[10px] text-gray-400 hover:text-danger-500 px-1.5 py-1 rounded hover:bg-danger-50 transition-colors">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!tasks.length" class="p-10 text-center text-gray-400 text-sm">Aucune t&acirc;che dans la queue</div>
      </div>
    </div>

    
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
        <div v-if="inspectTask" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="inspectTask = null" />
          <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ inspectTask.name }}</h2>
                <p class="text-[10px] text-gray-400 font-mono">{{ inspectTask.id }}</p>
              </div>
              <button @click="inspectTask = null" class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div class="px-6 py-5 space-y-5">
              
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 text-center">
                  <p class="text-lg font-extrabold text-gray-900">{{ inspectTask.latencyMs ?? '\u2014' }}<span class="text-xs font-normal text-gray-400">ms</span></p>
                  <p class="text-[10px] text-gray-400">Latence</p>
                </div>
                <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 text-center">
                  <p class="text-lg font-extrabold" :class="inspectTask.httpStatus === 200 ? 'text-success-600' : 'text-danger-600'">{{ inspectTask.httpStatus ?? '\u2014' }}</p>
                  <p class="text-[10px] text-gray-400">HTTP Status</p>
                </div>
                <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 text-center">
                  <p class="text-lg font-extrabold text-primary-600">{{ inspectTask.actualTokens?.total?.toLocaleString('fr-FR') ?? '\u2014' }}</p>
                  <p class="text-[10px] text-gray-400">Tokens r&eacute;els</p>
                </div>
              </div>

              
              <div v-if="inspectTask.actualTokens" class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p class="font-bold text-gray-700 dark:text-slate-200">{{ inspectTask.actualTokens.prompt?.toLocaleString('fr-FR') }}</p><p class="text-gray-400">Input</p></div>
                <div><p class="font-bold text-gray-700 dark:text-slate-200">{{ inspectTask.actualTokens.completion?.toLocaleString('fr-FR') }}</p><p class="text-gray-400">Output</p></div>
                <div><p class="font-bold text-success-600">{{ formatUsd(inspectTask.actualCost ?? 0) }}</p><p class="text-gray-400">Co&ucirc;t</p></div>
              </div>

              
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">System Prompt</p>
                <pre class="text-xs text-gray-600 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-100 dark:border-slate-800 p-3 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">{{ inspectTask.systemPrompt }}</pre>
              </div>

              
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">User Prompt</p>
                <pre class="text-xs text-gray-600 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-100 dark:border-slate-800 p-3 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">{{ inspectTask.userPrompt }}</pre>
              </div>

              
              <div v-if="inspectTask.response">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">R&eacute;ponse API</p>
                <pre class="text-xs text-gray-600 bg-success-50 rounded-lg border border-success-100 p-3 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">{{ inspectTask.response }}</pre>
              </div>

              
              <div v-if="inspectTask.errorMessage">
                <p class="text-[10px] font-semibold text-danger-500 uppercase tracking-wider mb-1">Erreur</p>
                <pre class="text-xs text-danger-700 bg-danger-50 rounded-lg border border-danger-100 p-3 whitespace-pre-wrap font-mono">{{ inspectTask.errorMessage }}</pre>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showCreate = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b"><h2 class="font-bold text-gray-800 dark:text-slate-100 text-sm">Nouvelle t&acirc;che IA</h2><button @click="showCreate = false" class="text-gray-400 hover:text-gray-600">&times;</button></div>
            <form @submit.prevent="createTask" class="px-6 py-5 space-y-4">
              <div><label class="label">Nom *</label><input v-model="newTask.name" required placeholder="Ex: Générer 50 descriptions produits" class="input-field" /></div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="label">Client</label><input v-model="newTask.clientId" placeholder="example-shop" class="input-field text-xs" /></div>
                <div><label class="label">Mod&egrave;le</label><select v-model="newTask.model" class="input-field text-xs">
                  <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                  <option value="claude-opus-4-6">Opus 4.6</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select></div>
              </div>
              <div><label class="label">Items (batch)</label><input v-model.number="newTask.totalItems" type="number" min="1" class="input-field text-xs" /></div>
              <div><label class="label">System Prompt *</label><textarea v-model="newTask.systemPrompt" required rows="3" class="input-field text-xs resize-none font-mono" /></div>
              <div><label class="label">User Prompt</label><textarea v-model="newTask.userPrompt" rows="3" class="input-field text-xs resize-none font-mono" /></div>
              <div class="flex gap-3 pt-2">
                <button type="button" @click="showCreate = false" class="flex-1 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600">Annuler</button>
                <button type="submit" :disabled="creating" class="flex-1 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {{ creating ? 'Cr\u00e9ation\u2026' : 'Cr\u00e9er' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { AiTask } from '~/server/utils/ai-queue'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const tasks       = ref<AiTask[]>([])
const inspectTask = ref<AiTask | null>(null)
const showCreate  = ref(false)
const creating    = ref(false)
const executing   = ref<string | null>(null)

const pendingCount = computed(() => tasks.value.filter(t => t.status === 'pending').length)
const totalCost    = computed(() => tasks.value.reduce((s, t) => s + (t.actualCost ?? 0), 0))
const totalTokens  = computed(() => tasks.value.reduce((s, t) => s + (t.actualTokens?.total ?? 0), 0))

const newTask = reactive({
  name: '', clientId: 'ac-hub', model: 'claude-sonnet-4-6',
  systemPrompt: '', userPrompt: '', totalItems: 1,
})

async function loadTasks() {
  try { tasks.value = await $fetch<AiTask[]>('/api/hub/ai-queue') }
  catch { tasks.value = [] }
}

async function createTask() {
  if (creating.value) return
  creating.value = true
  try {
    await $fetch('/api/hub/ai-queue', { method: 'POST', body: { ...newTask } })
    showCreate.value = false
    newTask.name = ''; newTask.systemPrompt = ''; newTask.userPrompt = ''; newTask.totalItems = 1
    await loadTasks()
  } catch (e) { console.error(e) }
  finally { creating.value = false }
}

async function executeTask(id: string) {
  executing.value = id
  try {
    const res = await $fetch<{ ok: boolean; task: AiTask }>('/api/hub/ai-queue', {
      method: 'PUT', query: { action: 'exec', id },
    })
    
    if (res.task) {
      await $fetch('/api/hub/save-telemetry', {
        method: 'POST',
        body: {
          taskId:      res.task.id,
          model:       res.task.model,
          clientId:    res.task.clientId,
          inputTokens: res.task.actualTokens?.prompt ?? 0,
          outputTokens: res.task.actualTokens?.completion ?? 0,
          cost:        res.task.actualCost ?? 0,
          latencyMs:   res.task.latencyMs ?? 0,
          httpStatus:  res.task.httpStatus ?? 0,
          success:     res.task.status === 'completed',
          errorMessage: res.task.errorMessage,
        },
      }).catch(() => {})
    }
    await loadTasks()
  } catch (e) { console.error(e) }
  finally { executing.value = null }
}

async function deleteTask(id: string) {
  await $fetch('/api/hub/ai-queue', { method: 'DELETE', query: { id } })
  tasks.value = tasks.value.filter(t => t.id !== id)
}

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(n)
}

function statusLabel(s: string) { return { pending: 'En attente', processing: 'En cours', completed: 'Termin\u00e9', failed: '\u00c9chec' }[s] ?? s }
function statusClass(s: string) {
  return { pending: 'bg-gray-100 dark:bg-slate-800 text-gray-600', processing: 'bg-amber-50 text-amber-700', completed: 'bg-success-50 text-success-700', failed: 'bg-danger-50 text-danger-600' }[s] ?? 'bg-gray-100 dark:bg-slate-800'
}
function statusDot(s: string) {
  return { pending: 'bg-gray-400', processing: 'bg-amber-400 animate-pulse', completed: 'bg-success-400', failed: 'bg-danger-400' }[s] ?? 'bg-gray-400'
}

onMounted(loadTasks)
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900; }
.label { @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
