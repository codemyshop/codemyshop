<template>
  <div class="flex-1 overflow-auto">
    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/projects" class="text-gray-400 hover:text-primary-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </NuxtLink>
        <div v-if="project">
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100 leading-tight">{{ project.project_title }}</h1>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusBadge(project.project_status)">
              {{ STATUSES[project.project_status] || project.project_status }}
            </span>
            <span v-if="project.contact_name" class="text-xs text-gray-400">{{ project.contact_name }}</span>
          </div>
        </div>
      </div>
    </header>

    <div v-if="loadingProject" class="text-center py-20 text-gray-400">Chargement…</div>

    <!-- Fatal error (project not found / 500 on main endpoint) -->
    <div v-else-if="!project" class="p-6">
      <div class="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 p-6 text-sm text-rose-800 dark:text-rose-200">
        <p class="font-semibold mb-1">Impossible de charger ce projet</p>
        <p class="text-xs opacity-80 mb-3">{{ loadError || 'Aucune donnée renvoyée par l\'API.' }}</p>
        <NuxtLink to="/hub/projects" class="inline-block text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium">
          ← Retour à la liste
        </NuxtLink>
      </div>
    </div>

    <div v-else class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Partial error banner (sub-resources failed but project OK) -->
      <div v-if="loadError" class="lg:col-span-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
        ⚠ {{ loadError }}
      </div>


      <!-- Left column: info + tasks -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Info card -->
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">Informations projet</h2>
            <button @click="editingInfo = !editingInfo" class="text-xs text-primary-500 hover:text-primary-700">
              {{ editingInfo ? 'Annuler' : 'Modifier' }}
            </button>
          </div>

          <div v-if="!editingInfo" class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-400 text-xs">Type</span><p class="text-gray-700 dark:text-slate-200">{{ PROJECT_TYPES[project.project_type] || '—' }}</p></div>
            <div><span class="text-gray-400 text-xs">Budget</span><p class="text-gray-700 dark:text-slate-200">{{ BUDGETS[project.budget] || '—' }}</p></div>
            <div><span class="text-gray-400 text-xs">Prix final</span><p class="text-gray-700 dark:text-slate-200">{{ project.final_price ? formatPrice(project.final_price) : '—' }}</p></div>
            <div><span class="text-gray-400 text-xs">RDV</span><p class="text-gray-700 dark:text-slate-200">{{ project.meeting_date ? formatDate(project.meeting_date) : '—' }}</p></div>
            <div class="col-span-2"><span class="text-gray-400 text-xs">Besoins</span><p class="text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{{ project.needs || '—' }}</p></div>
          </div>

          <form v-else @submit.prevent="saveInfo" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Statut</label>
                <select v-model="infoForm.project_status" class="input-field">
                  <option v-for="(l, k) in STATUSES" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">Type</label>
                <select v-model="infoForm.project_type" class="input-field">
                  <option value="">—</option>
                  <option v-for="(l, k) in PROJECT_TYPES" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">Budget</label>
                <select v-model="infoForm.budget" class="input-field">
                  <option value="">—</option>
                  <option v-for="(l, k) in BUDGETS" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">Prix final (€)</label>
                <input v-model="infoForm.final_price" type="number" class="input-field" />
              </div>
            </div>
            <div>
              <label class="label">Besoins</label>
              <textarea v-model="infoForm.needs" rows="4" class="input-field resize-none" />
            </div>
            <button type="submit" class="btn-primary text-xs px-4 py-2">Enregistrer</button>
          </form>
        </section>

        <!-- Tasks -->
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">Tâches ({{ tasks.length }})</h2>
            <button @click="showAddTask = true" class="text-xs text-primary-500 hover:text-primary-700">+ Ajouter</button>
          </div>

          <div v-if="!tasks.length" class="text-sm text-gray-400 text-center py-4">Aucune tâche</div>

          <div class="space-y-2">
            <div
              v-for="t in tasks"
              :key="t.id_ac_smarttask"
              class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50"
            >
              <button @click="toggleTask(t)" class="shrink-0">
                <div :class="['w-4 h-4 rounded border-2 flex items-center justify-center transition-colors', t.task_status === 'done' ? 'bg-success-500 border-success-500' : 'border-gray-300']">
                  <svg v-if="t.task_status === 'done'" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              </button>
              <div class="flex-1 min-w-0">
                <p :class="['text-sm truncate', t.task_status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-200']">
                  {{ t.task_title }}
                </p>
                <p v-if="t.date_deadline" class="text-xs text-gray-400">{{ formatDate(t.date_deadline) }}</p>
              </div>
              <button @click="deleteTask(t.id_ac_smarttask)" class="text-gray-300 hover:text-danger-400 text-xs shrink-0">✕</button>
            </div>
          </div>

          <!-- Add task form -->
          <div v-if="showAddTask" class="mt-3 flex gap-2">
            <input v-model="newTaskTitle" @keyup.enter="addTask" placeholder="Titre de la tâche…" class="input-field flex-1 text-xs" />
            <button @click="addTask" class="btn-primary text-xs px-3 py-1.5">Ajouter</button>
            <button @click="showAddTask = false" class="text-xs text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </section>

        <!-- Emails -->
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">Emails ({{ emails.length }})</h2>
            <button @click="showSendEmail = !showSendEmail" class="text-xs text-primary-500 hover:text-primary-700">
              {{ showSendEmail ? 'Annuler' : '+ Envoyer' }}
            </button>
          </div>

          <div v-if="showSendEmail" class="mb-4 space-y-2 p-3 bg-gray-50 rounded-lg">
            <input v-model="emailForm.subject" placeholder="Objet" class="input-field text-xs" />
            <textarea v-model="emailForm.body" rows="4" placeholder="Corps de l'email…" class="input-field text-xs resize-none" />
            <button @click="sendEmail" :disabled="sendingEmail" class="btn-primary text-xs px-4 py-1.5">
              {{ sendingEmail ? 'Envoi…' : 'Envoyer' }}
            </button>
          </div>

          <div v-if="!emails.length && !showSendEmail" class="text-sm text-gray-400 text-center py-4">Aucun email</div>

          <div class="space-y-2">
            <div v-for="e in emails" :key="e.id_ac_smartemail" class="p-3 rounded-lg border border-gray-100 dark:border-slate-800">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">{{ e.email_title }}</p>
                <span class="text-xs text-gray-400 shrink-0 ml-2">{{ formatDate(e.date_add) }}</span>
              </div>
              <p class="text-xs text-gray-500 line-clamp-2">{{ e.email_message }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Right column: contact + docs + whatsapp -->
      <div class="space-y-6">

        <!-- Contact -->
        <section v-if="project.contact_name" class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm mb-3">Contact</h2>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm">
              {{ project.contact_name?.charAt(0) }}
            </div>
            <div>
              <p class="font-medium text-gray-800 dark:text-slate-100 text-sm">{{ project.contact_name }}</p>
              <p v-if="project.contact_email" class="text-xs text-gray-400">{{ project.contact_email }}</p>
            </div>
          </div>
          <div v-if="project.phone_whatsapp" class="flex items-center gap-2">
            <a
              :href="`https://wa.me/${project.phone_whatsapp?.replace(/\D/g, '')}`"
              target="_blank"
              class="flex items-center gap-1.5 text-xs text-success-600 font-medium hover:text-success-700"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </section>

        <!-- Documents -->
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">Documents ({{ documents.length }})</h2>
            <label class="text-xs text-primary-500 hover:text-primary-700 cursor-pointer">
              + Ajouter
              <input type="file" class="hidden" @change="uploadDocument" />
            </label>
          </div>

          <div v-if="!documents.length" class="text-xs text-gray-400 text-center py-3">Aucun document</div>

          <div class="space-y-2">
            <div v-for="d in documents" :key="d.id_ac_document" class="flex items-center gap-2 text-xs">
              <span class="text-gray-400">📎</span>
              <span class="flex-1 text-gray-700 dark:text-slate-200 truncate">{{ d.document_title || d.file_name }}</span>
              <button @click="deleteDocument(d.id_ac_document)" class="text-gray-300 hover:text-danger-400">✕</button>
            </div>
          </div>
        </section>

        <!-- Logs -->
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm mb-3">Activité</h2>
          <div v-if="!logs.length" class="text-xs text-gray-400 text-center py-3">Aucune activité</div>
          <div class="space-y-2">
            <div v-for="l in logs.slice(0, 10)" :key="l.id_ac_smartautomation_log" class="text-xs text-gray-500">
              <span class="text-gray-400">{{ formatDate(l.date_execution) }}</span>
              — {{ l.title || 'Automation exécutée' }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const route        = useRoute()
const projectId    = computed(() => Number(route.params.id))

const project       = ref<any>(null)
const tasks         = ref<any[]>([])
const documents     = ref<any[]>([])
const emails        = ref<any[]>([])
const logs          = ref<any[]>([])
const loadingProject = ref(true)
const loadError      = ref<string | null>(null)
const editingInfo   = ref(false)
const showAddTask   = ref(false)
const newTaskTitle  = ref('')
const showSendEmail = ref(false)
const sendingEmail  = ref(false)

const infoForm = ref<any>({})
const emailForm = ref({ subject: '', body: '' })

const STATUSES: Record<string, string> = {
  perdu_standby: 'Perdu / Standby', lead_entrant: 'Lead entrant',
  qualification: 'Qualification',   devis_envoye: 'Devis envoyé',
  devis_accepte: 'Devis accepté',   en_cours: 'En cours',
  livraison: 'Livraison',           facture: 'Facturé',
  gagne: 'Gagné',
}

const PROJECT_TYPES: Record<string, string> = {
  site_web: 'Site PS complet', module_ps: 'Module PS sur-mesure',
  integration: 'Intégration', migration: 'Migration',
  headless: 'Headless', seo: 'SEO', audit: 'Audit',
  formation: 'Formation', maintenance: 'TMA', conseil: 'Conseil', autre: 'Autre',
}

const BUDGETS: Record<string, string> = {
  moins_1k: '< 1 000 €', '1k_3k': '1 000–3 000 €', '3k_8k': '3 000–8 000 €',
  '8k_20k': '8 000–20 000 €', '20k_60k': '20 000–60 000 €', '60k_plus': '> 60 000 €',
}

const STATUS_BADGE: Record<string, string> = {
  perdu_standby: 'bg-gray-100 dark:bg-slate-800 text-gray-500',
  lead_entrant:  'bg-stage-lead-100 text-stage-lead-600',
  qualification: 'bg-stage-qualify-100 text-stage-qualify-600',
  devis_envoye:  'bg-stage-quoted-100 text-stage-quoted-700',
  devis_accepte: 'bg-stage-accepted-100 text-stage-accepted-600',
  en_cours:      'bg-stage-active-100 text-stage-active-600',
  livraison:     'bg-stage-delivery-100 text-stage-delivery-600',
  facture:       'bg-stage-invoiced-100 text-stage-invoiced-600',
  gagne:         'bg-stage-won-100 text-stage-won-600',
}

const statusBadge = (s: string) => STATUS_BADGE[s] || 'bg-gray-100 dark:bg-slate-800 text-gray-500'
const formatPrice = (v: any) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))
const formatDate  = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

const loadAll = async () => {
  loadingProject.value = true
  loadError.value = null
  try {
    // Promise.allSettled: a failing endpoint (e.g. cs_smart* tables missing
    // on a freshly provisioned tenant) should not show a blank screen —
    // we display the project + what loaded, and a targeted error banner for
    // failed sub-resources. Issue from 2026-05-06.
    const [pRes, tRes, dRes, eRes, lRes] = await Promise.allSettled([
      $fetch<{ project: any }>(`/api/bo/smartproject/projects/${projectId.value}`),
      $fetch<{ tasks: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/tasks`),
      $fetch<{ documents: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/documents`),
      $fetch<{ emails: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/mails`),
      $fetch<{ logs: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/logs`),
    ])

    if (pRes.status === 'fulfilled') {
      project.value = pRes.value.project || null
    } else {
      console.error('[projects/[id]] project load KO:', pRes.reason)
      loadError.value = `Projet introuvable : ${pRes.reason?.data?.statusMessage || pRes.reason?.message || 'erreur DB'}`
    }

    tasks.value     = tRes.status === 'fulfilled' ? (tRes.value.tasks     || []) : []
    documents.value = dRes.status === 'fulfilled' ? (dRes.value.documents || []) : []
    emails.value    = eRes.status === 'fulfilled' ? (eRes.value.emails    || []) : []
    logs.value      = lRes.status === 'fulfilled' ? (lRes.value.logs      || []) : []

    // Sub-errors (tasks/docs/emails/logs): we log but do not override the
    // project — the admin sees the main page + orange banner listing what
    // failed to load.
    const subErrors = [
      tRes.status === 'rejected' ? 'tâches' : null,
      dRes.status === 'rejected' ? 'documents' : null,
      eRes.status === 'rejected' ? 'emails' : null,
      lRes.status === 'rejected' ? 'logs' : null,
    ].filter(Boolean) as string[]
    if (subErrors.length && project.value) {
      loadError.value = `Sous-ressources indisponibles : ${subErrors.join(', ')}. Le projet est consultable mais la barre latérale est partielle.`
      ;[tRes, dRes, eRes, lRes].forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[projects/[id]] sub-resource ${i} KO:`, r.reason)
      })
    }

    if (project.value) {
      infoForm.value = {
        project_status: project.value.project_status,
        project_type:   project.value.project_type,
        budget:         project.value.budget,
        final_price:    project.value.final_price,
        needs:          project.value.needs,
      }
    }
  } catch (err: any) {
    console.error('[projects/[id]] loadAll fatal:', err)
    loadError.value = err?.data?.statusMessage || err?.message || 'Erreur inconnue lors du chargement'
  } finally {
    loadingProject.value = false
  }
}

const saveInfo = async () => {
  await $fetch(`/api/bo/smartproject/projects/${projectId.value}`, {
    method: 'PUT',
    body: { project: { ...infoForm.value } },
  })
  project.value = { ...project.value, ...infoForm.value }
  editingInfo.value = false
}

const addTask = async () => {
  if (!newTaskTitle.value.trim()) return
  const data = await $fetch<{ success: boolean; inserted: number }>(
    `/api/bo/smartproject/projects/${projectId.value}/tasks`,
    {
      method: 'POST',
      body: {
        tasks: [
          { name: newTaskTitle.value, status: 'todo' },
        ],
      },
    },
  )
  if (data.success && data.inserted > 0) {
    // Refetch to retrieve the ID generated server-side (assigned_name, etc.)
    const refresh = await $fetch<{ tasks: any[] }>(
      `/api/bo/smartproject/projects/${projectId.value}/tasks`,
    )
    tasks.value = refresh.tasks || []
    newTaskTitle.value = ''
    showAddTask.value = false
  }
}

const toggleTask = async (t: any) => {
  const newStatus = t.task_status === 'done' ? 'todo' : 'done'
  t.task_status = newStatus
  await $fetch(`/api/bo/smartproject/tasks/${t.id_ac_smarttask}`, {
    method: 'PUT',
    body: { task_status: newStatus },
  })
}

const deleteTask = async (id: number) => {
  await $fetch(`/api/bo/smartproject/tasks/${id}`, { method: 'DELETE' })
  tasks.value = tasks.value.filter(t => t.id_ac_smarttask !== id)
}

const sendEmail = async () => {
  sendingEmail.value = true
  try {
    await $fetch(`/api/bo/smartproject/projects/${projectId.value}/email`, {
      method: 'POST',
      body: {
        subject: emailForm.value.subject,
        body:    emailForm.value.body,
      },
    })
    emailForm.value = { subject: '', body: '' }
    showSendEmail.value = false
    const eData = await $fetch<{ emails: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/mails`)
    emails.value = eData.emails || []
  } finally {
    sendingEmail.value = false
  }
}

const uploadDocument = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', file.name)
  const data = await $fetch<{ success: boolean; document?: any }>(
    `/api/bo/smartproject/projects/${projectId.value}/documents`,
    { method: 'POST', body: fd },
  )
  if (data.success && data.document) {
    documents.value.push(data.document)
  }
}

const deleteDocument = async (id: number) => {
  await $fetch(`/api/bo/smartproject/documents/${id}`, { method: 'DELETE' })
  documents.value = documents.value.filter(d => d.id_ac_document !== id)
}

onMounted(loadAll)
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300; }
.label { @apply block text-xs font-medium text-gray-600 mb-1; }
.btn-primary { @apply bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50; }
</style>
