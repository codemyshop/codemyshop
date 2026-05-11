
<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">
        Fiches techniques & pièces jointes
        <span v-if="attachments.length" class="ml-1 text-xs text-gray-400 font-normal">({{ attachments.length }})</span>
      </h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">
        {{ currentLang?.iso_code?.toUpperCase() || 'FR' }} — Sprint 13
      </span>
    </div>

    
    <div
      :class="[
        'relative border-2 border-dashed rounded-xl transition-colors',
        dragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
          : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950',
        uploading && 'opacity-60 pointer-events-none',
      ]"
      @dragenter.prevent="dragActive = true"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptAttr"
        multiple
        class="hidden"
        @change="onFileChange"
      />
      <label
        class="flex flex-col items-center justify-center gap-2 py-8 px-6 cursor-pointer text-center"
        @click.prevent="fileInput?.click()"
      >
        <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p class="text-sm font-medium text-gray-700 dark:text-slate-200">
          Glisse un fichier ici, ou <span class="text-primary-600 dark:text-primary-400">clique pour choisir</span>
        </p>
        <p class="text-[11px] text-gray-400">
          PDF, Word, Excel, images ou ZIP — 20 Mo max
        </p>
      </label>

      
      <div
        v-if="uploading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-xl gap-2"
      >
        <div class="w-32 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full bg-primary-600 animate-pulse" style="width: 100%" />
        </div>
        <p class="text-[11px] text-gray-500">{{ uploadingLabel }}</p>
      </div>
    </div>

    <p v-if="uploadError" class="text-xs text-red-600 font-medium">{{ uploadError }}</p>

    
    <div v-if="loading" class="text-xs text-gray-400">Chargement des pièces jointes…</div>
    <div v-else-if="!attachments.length" class="text-xs text-gray-400 italic">
      Aucune pièce jointe pour ce produit.
    </div>
    <ul v-else class="space-y-2">
      <li
        v-for="a in attachments"
        :key="a.id_attachment"
        class="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-950/50 transition-colors"
      >
        
        <div class="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30 text-lg shrink-0">
          {{ mimeIcon(a.mime) }}
        </div>

        
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-start gap-2">
            <input
              :value="a.name"
              type="text"
              :maxlength="32"
              class="flex-1 text-sm font-medium text-gray-800 dark:text-slate-100 bg-transparent border-0 border-b border-transparent focus:border-primary-500 focus:outline-none px-0.5 py-0.5 transition-colors"
              :placeholder="namePlaceholder"
              @change="onRenameAttachment(a, ($event.target as HTMLInputElement).value)"
            />
            <span
              :class="[
                'text-[10px] font-mono shrink-0 pt-1',
                (a.name || '').length >= 32 ? 'text-amber-600 font-bold' : 'text-gray-400',
              ]"
              :title="(a.name || '').length >= 32 ? 'Limite 32 caractères atteinte (contrainte DB PrestaShop)' : ''"
            >
              {{ (a.name || '').length }}/32
            </span>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-gray-400">
            <span class="font-mono truncate">{{ a.file_name }}</span>
            <span>·</span>
            <span>{{ formatSize(a.file_size) }}</span>
            <span>·</span>
            <span class="font-mono uppercase">{{ mimeShort(a.mime) }}</span>
          </div>
        </div>

        
        <div class="flex items-center gap-1 shrink-0">
          <a
            :href="a.public_url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Télécharger (lien boutique direct)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </a>
          <button
            type="button"
            class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 transition-colors"
            title="Supprimer la pièce jointe"
            @click="onDelete(a)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">

interface Attachment {
  id_attachment: number
  file: string
  file_name: string
  file_size: number
  mime: string
  name: string
  description: string
  public_url: string
}

const props = defineProps<{ productId: number }>()

const { currentLangId, currentLang } = useHubLang()

const attachments = ref<Attachment[]>([])
const loading = ref(true)
const uploading = ref(false)
const uploadingLabel = ref('')
const uploadError = ref<string | null>(null)
const dragActive = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const acceptAttr =
  '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,' +
  'application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'image/png,image/jpeg,image/webp,application/zip'

const namePlaceholder = computed(() => {
  const iso = currentLang.value?.iso_code?.toLowerCase() || 'fr'
  const map: Record<string, string> = {
    fr: 'Fiche technique',
    en: 'Datasheet',
    de: 'Datenblatt',
    es: 'Ficha técnica',
    it: 'Scheda tecnica',
  }
  return map[iso] || 'Fiche technique'
})

async function load() {
  if (!props.productId) return
  loading.value = true
  try {
    const data = await $fetch<{ attachments: Attachment[] }>(
      `/api/bo/products/${props.productId}/attachments`,
      { query: { lang: currentLangId.value } },
    )
    attachments.value = data?.attachments || []
  } catch (err: any) {
    console.error('[HubProductAttachments] load error', err)
    attachments.value = []
  } finally {
    loading.value = false
  }
}

async function uploadOne(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    uploadError.value = `Fichier trop lourd : ${file.name} (max 20 Mo)`
    return
  }
  uploadError.value = null
  uploading.value = true
  uploadingLabel.value = `Envoi de ${file.name}…`
  try {
    const fd = new FormData()
    fd.append('file', file)
    
    const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 32)
    fd.append('name', baseName)
    await $fetch(`/api/bo/products/${props.productId}/attachments`, {
      method: 'POST',
      query: { lang: currentLangId.value },
      body: fd,
    })
  } catch (err: any) {
    uploadError.value = err?.data?.message || err?.message || 'Upload échoué'
  } finally {
    uploading.value = false
  }
}

async function uploadBatch(files: FileList | File[]) {
  for (const f of Array.from(files)) {
    await uploadOne(f)
    if (uploadError.value) break
  }
  if (fileInput.value) fileInput.value.value = ''
  await load()
}

function onDrop(e: DragEvent) {
  dragActive.value = false
  const files = e.dataTransfer?.files
  if (files?.length) uploadBatch(files)
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) uploadBatch(files)
}

async function onDelete(a: Attachment) {
  if (!confirm(`Supprimer "${a.name || a.file_name}" ?`)) return
  try {
    await $fetch(`/api/bo/products/${props.productId}/attachments`, {
      method: 'DELETE',
      body: { id_attachment: a.id_attachment },
    })
    attachments.value = attachments.value.filter((x) => x.id_attachment !== a.id_attachment)
  } catch (err: any) {
    uploadError.value = err?.data?.message || err?.message || 'Suppression échouée'
  }
}

async function onRenameAttachment(a: Attachment, newName: string) {
  const clean = newName.slice(0, 32)
  if (clean === a.name) return
  const prev = a.name
  a.name = clean 
  try {
    await $fetch(`/api/bo/products/${props.productId}/attachments`, {
      method: 'PATCH',
      query: { lang: currentLangId.value },
      body: { id_attachment: a.id_attachment, name: clean },
    })
  } catch (err: any) {
    a.name = prev
    uploadError.value = err?.data?.message || err?.message || 'Renommage échoué'
  }
}

onMounted(load)
watch(() => props.productId, load)
watch(currentLangId, (n, o) => { if (n !== o && !loading.value) load() })

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function mimeShort(mime: string): string {
  const short: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WEBP',
    'application/zip': 'ZIP',
  }
  return short[mime] || mime.split('/').pop()?.toUpperCase() || 'FILE'
}

function mimeIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('word')) return '📄'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
  if (mime === 'application/zip') return '🗜️'
  return '📎'
}
</script>
