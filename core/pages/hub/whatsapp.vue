<template>
  <div class="flex-1 overflow-auto">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Modèles WhatsApp</h1>
      <button @click="openCreate" class="flex items-center gap-2 bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success-700 transition-colors">
        + Nouveau modèle
      </button>
    </header>

    <div class="p-6">
      <div v-if="loading" class="text-center py-20 text-gray-400">Chargement…</div>

      <div v-else-if="!templates.length" class="text-center py-20 text-gray-400 text-sm">
        Aucun modèle WhatsApp.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="t in templates"
          :key="t.id"
          class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="font-semibold text-gray-800 dark:text-slate-100 text-sm">{{ t.title }}</p>
            <span v-if="t.type" class="text-xs bg-success-100 text-success-600 rounded-full px-2 py-0.5 shrink-0">{{ t.type }}</span>
          </div>
          <p class="text-xs text-gray-500 line-clamp-3 mb-3">{{ t.message_body }}</p>
          <div class="flex gap-2">
            <button @click="openEdit(t)" class="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 hover:bg-gray-50">
              Modifier
            </button>
            <button @click="confirmDelete(t)" class="text-xs py-1.5 px-3 rounded-lg border border-danger-100 text-danger-400 hover:bg-danger-50">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="closeModal">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
            <div class="flex items-center justify-between px-6 py-4 border-b">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">{{ editingId ? 'Modifier le modèle' : 'Nouveau modèle' }}</h2>
              <button @click="closeModal" class="text-gray-400">✕</button>
            </div>
            <form @submit.prevent="saveTemplate" class="px-6 py-5 space-y-4">
              <div>
                <label class="label">Titre *</label>
                <input v-model="form.title" required class="input-field" />
              </div>
              <div>
                <label class="label">Type</label>
                <select v-model="form.type" class="input-field">
                  <option value="">— Choisir —</option>
                  <option value="bot">Bot</option>
                  <option value="human">Humain</option>
                </select>
              </div>
              <div>
                <label class="label">Message *</label>
                <textarea v-model="form.message_body" required rows="5" class="input-field resize-none" placeholder="Utilisez {{1}}, {{2}}… pour les variables" />
              </div>
              <p v-if="formError" class="text-sm text-danger-500">{{ formError }}</p>
              <div class="flex gap-3">
                <button type="button" @click="closeModal" class="flex-1 py-2 border rounded-lg text-sm text-gray-600">Annuler</button>
                <button type="submit" :disabled="saving" class="flex-1 py-2 bg-success-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="deleteTarget = null">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="font-bold text-gray-800 dark:text-slate-100 mb-2">Supprimer ce modèle ?</h3>
            <p class="text-sm text-gray-500 mb-5">{{ deleteTarget.title }}</p>
            <div class="flex gap-3">
              <button @click="deleteTarget = null" class="flex-1 py-2 border rounded-lg text-sm">Annuler</button>
              <button @click="deleteTemplate" class="flex-1 py-2 bg-danger-500 text-white rounded-lg text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })


const templates   = ref<any[]>([])
const loading     = ref(true)
const showModal   = ref(false)
const editingId   = ref<number | null>(null)
const saving      = ref(false)
const formError   = ref('')
const deleteTarget = ref<any>(null)

const emptyForm = () => ({ title: '', type: '', message_body: '' })
const form = ref(emptyForm())

const loadTemplates = async () => {
  loading.value = true
  try {
    const data = await $fetch<{ templates: any[] }>('/api/bo/smartproject/whatsapp-templates')
    templates.value = data.templates || []
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

const openEdit = (t: any) => {
  editingId.value = t.id_ac_whatsapp_template
  form.value = { title: t.title || '', type: t.type || '', message_body: t.message_body || '' }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const saveTemplate = async () => {
  saving.value = true
  formError.value = ''
  try {
    const payload  = editingId.value
      ? { ...form.value, id: editingId.value }
      : { ...form.value }
    const data = await $fetch<{ success: boolean; error?: string }>(
      '/api/bo/smartproject/whatsapp-templates',
      { method: 'POST', body: payload },
    )
    if (data.success) {
      closeModal()
      await loadTemplates()
    } else {
      formError.value = data.error || 'Erreur'
    }
  } finally {
    saving.value = false
  }
}

const confirmDelete  = (t: any) => { deleteTarget.value = t }
const deleteTemplate = async () => {
  await $fetch(
    `/api/bo/smartproject/whatsapp-templates/${deleteTarget.value.id_ac_whatsapp_template}`,
    { method: 'DELETE' },
  )
  deleteTarget.value = null
  await loadTemplates()
}

onMounted(loadTemplates)
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success-300; }
.label { @apply block text-xs font-medium text-gray-600 mb-1; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
