<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Bo&icirc;te &agrave; id&eacute;es</h1>
          <p class="text-xs text-gray-400 mt-0.5">Vos demandes sont transform&eacute;es en sp&eacute;cifications techniques par l'IA</p>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-3xl mx-auto space-y-6">

      <!-- Formulaire -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Soumettre une id&eacute;e</h2>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="label">Type de demande</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="t in TYPES" :key="t.value" type="button" @click="form.type = t.value"
                :class="['py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-center',
                  form.type === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300']">
                {{ t.icon }} {{ t.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="label">Description *</label>
            <textarea v-model="form.description" required rows="4" placeholder="Ex: J'aimerais pouvoir exporter mes commandes en Excel pour ma compta..." class="input-field resize-none text-sm" />
          </div>

          <div>
            <label class="label">Priorit&eacute; pour vous</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="p in PRIORITIES" :key="p.value" type="button" @click="form.priority = p.value"
                :class="['py-2 rounded-xl border-2 text-xs font-semibold transition-all text-center',
                  form.priority === p.value ? p.activeClass : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300']">
                {{ p.label }}
              </button>
            </div>
          </div>

          <button type="submit" :disabled="submitting || !form.description.trim()"
            class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-40">
            {{ submitting ? 'Envoi...' : 'Soumettre ma demande' }}
          </button>
        </form>

        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-2">
          <div v-if="submitted" class="mt-4 bg-success-50 border border-success-100 rounded-xl p-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-success-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
            <div>
              <p class="text-sm font-semibold text-success-700">Demande soumise avec succ&egrave;s</p>
              <p class="text-xs text-success-600">Notre IA va g&eacute;n&eacute;rer la sp&eacute;cification technique. Alexandre la traitera sous 48h.</p>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Mes demandes -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Mes demandes</h2>
        </div>

        <div v-if="!myFeedbacks.length" class="p-8 text-center text-gray-400 text-sm">
          Aucune demande pour le moment
        </div>

        <div v-else class="divide-y divide-gray-50">
          <div v-for="f in myFeedbacks" :key="f.id" class="px-6 py-4 flex items-start gap-4">
            <span class="text-lg mt-0.5">{{ typeIcon(f.type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 dark:text-slate-100 leading-relaxed">{{ f.description }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span :class="statusClass(f.status)" class="text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {{ statusLabel(f.status) }}
                </span>
                <span class="text-[10px] text-gray-400">{{ formatDate(f.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedbackItem, FeedbackType, FeedbackPriority } from '~/server/utils/feedback'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()
const { header } = useHeaderDb()
const clientName = computed(() => header.value?.logo?.text ?? resolvedClientId.value)

const TYPES = [
  { value: 'feature' as FeedbackType, icon: '\u2728', label: 'Fonctionnalit\u00e9' },
  { value: 'improvement' as FeedbackType, icon: '\ud83d\udee0\ufe0f', label: 'Am\u00e9lioration' },
  { value: 'bug' as FeedbackType, icon: '\ud83d\udc1b', label: 'Bug' },
]

const PRIORITIES = [
  { value: 'low' as FeedbackPriority, label: 'Basse', activeClass: 'border-gray-400 bg-gray-50 text-gray-700 dark:text-slate-200' },
  { value: 'medium' as FeedbackPriority, label: 'Moyenne', activeClass: 'border-primary-500 bg-primary-50 text-primary-700' },
  { value: 'high' as FeedbackPriority, label: 'Haute', activeClass: 'border-danger-400 bg-danger-50 text-danger-700' },
]

const form = reactive({ type: 'feature' as FeedbackType, description: '', priority: 'medium' as FeedbackPriority })
const submitting = ref(false)
const submitted  = ref(false)
const myFeedbacks = ref<FeedbackItem[]>([])

async function loadMine() {
  try {
    myFeedbacks.value = await $fetch<FeedbackItem[]>('/api/hub/feedback', {
      query: { clientId: resolvedClientId.value },
    })
  } catch { myFeedbacks.value = [] }
}

async function submit() {
  if (submitting.value || !form.description.trim()) return
  submitting.value = true; submitted.value = false
  try {
    // Uses the remote bridge (local fallback if not configured)
    await $fetch('/api/client/send-feedback', {
      method: 'POST',
      body: {
        clientId:     resolvedClientId.value,
        clientName:   clientName.value,
        feedbackType: form.type,
        message:      form.description,
        priority:     form.priority,
      },
    })
    submitted.value = true
    form.description = ''
    await loadMine()
    setTimeout(() => { submitted.value = false }, 5000)
  } catch (e) { console.error(e) }
  finally { submitting.value = false }
}

function typeIcon(t: string) { return t === 'bug' ? '\ud83d\udc1b' : t === 'improvement' ? '\ud83d\udee0\ufe0f' : '\u2728' }
function statusLabel(s: string) { return { pending: 'En attente', todo: '\u00c0 faire', in_progress: 'En cours', refused: 'Refus\u00e9', deployed: 'D\u00e9ploy\u00e9' }[s] ?? s }
function statusClass(s: string) {
  return { pending: 'bg-gray-100 dark:bg-slate-800 text-gray-500', todo: 'bg-primary-50 text-primary-700', in_progress: 'bg-amber-50 text-amber-700', refused: 'bg-danger-50 text-danger-600', deployed: 'bg-success-50 text-success-700' }[s] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-500'
}
const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

onMounted(loadMine)
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900; }
.label { @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5; }
</style>
