<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        <h3 class="text-sm font-semibold text-gray-700">FAQ SEO</h3>
        <span v-if="faqs.length" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
          {{ faqs.length }}
        </span>
      </div>
      <button
        v-if="!showForm"
        @click="openAdd"
        type="button"
        class="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ajouter une question
      </button>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 2" :key="i" class="h-14 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <!-- Liste FAQ -->
    <div v-else-if="faqs.length" class="space-y-2">
      <div
        v-for="(faq, index) in faqs"
        :key="faq.id"
        class="bg-gray-50 border border-gray-100 rounded-xl p-4"
      >
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center mt-0.5">
            {{ index + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 leading-snug">{{ faq.question }}</p>
            <p class="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{{ faq.answer }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEdit(faq)"
              type="button"
              class="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              @click="deleteFaq(faq.id)"
              type="button"
              class="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!showForm && !loading" class="flex flex-col items-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <svg class="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
      <p class="text-xs">Aucune FAQ — boostez votre SEO en ajoutant des questions fréquentes.</p>
    </div>

    <!-- Add/edit form -->
    <div v-if="showForm" class="bg-primary-50 border border-primary-100 rounded-xl p-4 space-y-3">
      <p class="text-xs font-semibold text-primary-700 uppercase tracking-widest">
        {{ editingId ? 'Modifier la question' : 'Nouvelle question' }}
      </p>

      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Question <span class="text-danger-500">*</span>
        </label>
        <input
          v-model="formQ"
          type="text"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          placeholder="Ex : Comment installer ce module sur PrestaShop ?"
          @keydown.enter.prevent="saveFaq"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Réponse <span class="text-danger-500">*</span>
        </label>
        <textarea
          v-model="formA"
          rows="3"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y bg-white"
          placeholder="La réponse claire et concise visible par les internautes…"
        />
      </div>

      <p v-if="formError" class="text-xs text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
        {{ formError }}
      </p>

      <div class="flex items-center gap-2">
        <button
          @click="saveFaq"
          :disabled="saving"
          type="button"
          class="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg v-if="saving" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {{ saving ? 'Enregistrement…' : (editingId ? 'Modifier' : 'Ajouter') }}
        </button>
        <button
          @click="cancelForm"
          type="button"
          class="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
interface FaqItem {
  id:   number
  question: string
  answer:   string
  position: number
}

const props = defineProps<{
  parentType: string
  parentId:   number
}>()

const faqs      = ref<FaqItem[]>([])
const loading   = ref(false)
const saving    = ref(false)
const showForm  = ref(false)
const editingId = ref(0)
const formQ     = ref('')
const formA     = ref('')
const formError = ref('')

// ── Chargement ──────────────────────────────────────────────────────────────
const loadFaqs = async () => {
  if (!props.parentType || props.parentId === undefined) return
  loading.value = true
  try {
    const res = await $fetch<{ faqs: FaqItem[] }>(
      `/api/admin/faq/${props.parentType}/${props.parentId}`,
    )
    faqs.value = res.faqs ?? []
  } catch {
    // silencieux
  } finally {
    loading.value = false
  }
}

// ── Formulaire ──────────────────────────────────────────────────────────────
const openAdd = () => {
  editingId.value = 0
  formQ.value     = ''
  formA.value     = ''
  formError.value = ''
  showForm.value  = true
}

const openEdit = (faq: FaqItem) => {
  editingId.value = faq.id
  formQ.value     = faq.question
  formA.value     = faq.answer
  formError.value = ''
  showForm.value  = true
}

const cancelForm = () => {
  showForm.value  = false
  formError.value = ''
}

const saveFaq = async () => {
  formError.value = ''
  if (!formQ.value.trim() || !formA.value.trim()) {
    formError.value = 'La question et la réponse sont requises'
    return
  }
  saving.value = true
  try {
    const res = await $fetch<{ success: boolean; id_faq?: number }>(
      `/api/admin/faq/${props.parentType}/${props.parentId}`,
      {
        method: 'POST',
        body: {
          id_faq:   editingId.value,
          question: formQ.value.trim(),
          answer:   formA.value.trim(),
        },
      },
    )
    if (res.success) {
      showForm.value = false
      await loadFaqs()
    } else {
      formError.value = 'Erreur lors de la sauvegarde'
    }
  } catch (e: any) {
    formError.value = e?.data?.message || 'Erreur réseau — réessayez'
  } finally {
    saving.value = false
  }
}

const deleteFaq = async (idFaq: number) => {
  if (!confirm('Supprimer cette question ?')) return
  try {
    await $fetch(`/api/admin/faq/items/${idFaq}`, { method: 'DELETE' })
    faqs.value = faqs.value.filter(f => f.id !== idFaq)
  } catch {
    // silencieux
  }
}

// ── Watchers ────────────────────────────────────────────────────────────────
watch(() => [props.parentType, props.parentId], () => {
  if (props.parentId > 0 || props.parentType === 'home') loadFaqs()
}, { immediate: true })
</script>
