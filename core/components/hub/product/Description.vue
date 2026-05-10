<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Description</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">Rich text</span>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Description courte</label>
      <textarea
        v-model="model.descriptionShort"
        rows="3"
        placeholder="Résumé affiché sur la fiche produit, les listings et les réseaux sociaux."
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
      <p class="text-[10px] text-gray-400 mt-1">{{ (model.descriptionShort || '').length }} / 800</p>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-xs font-medium text-gray-500">Description longue</label>
        <div class="flex items-center gap-1">
          <button
            v-for="tool in toolbar"
            :key="tool.cmd"
            type="button"
            @mousedown.prevent="exec(tool.cmd, tool.value)"
            :title="tool.label"
            class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
          >
            {{ tool.icon }}
          </button>
          <button
            type="button"
            @mousedown.prevent="promptLink"
            title="Lien"
            class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
          >
            🔗
          </button>
          <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" />
          <button
            type="button"
            @click="mode = mode === 'wysiwyg' ? 'html' : 'wysiwyg'"
            :class="mode === 'html' ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800' : 'text-gray-600 dark:text-slate-300 border-transparent hover:border-gray-200 dark:hover:border-slate-700'"
            class="text-[10px] uppercase tracking-wide px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {{ mode === 'html' ? 'HTML' : 'RICH' }}
          </button>
        </div>
      </div>

      <div
        v-if="mode === 'wysiwyg'"
        ref="editorEl"
        contenteditable="true"
        class="min-h-[240px] w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/40 prose prose-sm dark:prose-invert max-w-none overflow-auto"
        @input="onEditorInput"
        @blur="onEditorInput"
      />
      <textarea
        v-else
        v-model="model.description"
        rows="14"
        placeholder="<p>Description complète en HTML…</p>"
        class="w-full text-xs font-mono border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />

      <p class="text-[10px] text-gray-400 mt-1">
        {{ plainTextLength }} caractères — bascule <span class="font-semibold">HTML</span> pour éditer le markup brut.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DescriptionForm {
  descriptionShort: string
  description: string
}

const model = defineModel<DescriptionForm>({ required: true })

const mode = ref<'wysiwyg' | 'html'>('wysiwyg')
const editorEl = ref<HTMLElement | null>(null)

const toolbar = [
  { cmd: 'bold', label: 'Gras (Ctrl+B)', icon: 'B' },
  { cmd: 'italic', label: 'Italique (Ctrl+I)', icon: 'I' },
  { cmd: 'formatBlock', value: 'H2', label: 'Titre H2', icon: 'H2' },
  { cmd: 'formatBlock', value: 'H3', label: 'Titre H3', icon: 'H3' },
  { cmd: 'insertUnorderedList', label: 'Liste à puces', icon: '•' },
  { cmd: 'insertOrderedList', label: 'Liste numérotée', icon: '1.' },
  { cmd: 'removeFormat', label: 'Effacer format', icon: '⟲' },
]

function exec(cmd: string, value?: string) {
  if (typeof document === 'undefined') return
  editorEl.value?.focus()
  document.execCommand(cmd, false, value)
  onEditorInput()
}

function promptLink() {
  if (typeof document === 'undefined') return
  const url = window.prompt('URL du lien', 'https://')
  if (!url) return
  editorEl.value?.focus()
  document.execCommand('createLink', false, url)
  onEditorInput()
}

function onEditorInput() {
  if (!editorEl.value) return
  model.value.description = editorEl.value.innerHTML
}

const plainTextLength = computed(() => {
  if (typeof document === 'undefined') return (model.value.description || '').length
  const tmp = document.createElement('div')
  tmp.innerHTML = model.value.description || ''
  return (tmp.textContent || '').trim().length
})

// External sync (initial load, HTML mode toggle) → repopulates the contenteditable
// without overwriting what the user just typed (simple diff).
watch(
  () => model.value.description,
  (html) => {
    if (mode.value !== 'wysiwyg' || !editorEl.value) return
    if (editorEl.value.innerHTML !== (html || '')) {
      editorEl.value.innerHTML = html || ''
    }
  },
  { immediate: false }
)

onMounted(() => {
  if (editorEl.value && mode.value === 'wysiwyg') {
    editorEl.value.innerHTML = model.value.description || ''
  }
})

watch(mode, (m) => {
  nextTick(() => {
    if (m === 'wysiwyg' && editorEl.value) {
      editorEl.value.innerHTML = model.value.description || ''
    }
  })
})
</script>
