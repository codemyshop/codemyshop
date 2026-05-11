
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        Catégories ({{ items.length }})
      </span>
      <button @click="addItem" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Catégorie
      </button>
    </div>

    <div v-for="(item, i) in items" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button @click="moveItem(i, i - 1)" :disabled="i === 0"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
        <button @click="moveItem(i, i + 1)" :disabled="i === items.length - 1"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <button @click="expandedItem = expandedItem === i ? null : i" class="flex-1 flex items-center gap-2 px-1 text-left">
          <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(item.label) || `Catégorie ${i + 1}` }}</span>
        </button>
        <button @click="removeItem(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedItem === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <div v-if="expandedItem === i" class="p-3 space-y-3">
        <div>
          <label class="field-label">Image (URL ou upload)</label>
          <input :value="item.image ?? ''" @input="updateItem(i, 'image', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="/universe/picto_olives.webp" />
          <div class="mt-1.5 flex items-stretch gap-2">
            <button
              type="button"
              :disabled="uploading[i]"
              class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              @click="triggerUpload(i)"
            >
              <svg v-if="!uploading[i]" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {{ uploading[i] ? 'Upload en cours…' : (item.image ? 'Remplacer l\'image' : 'Téléverser une image') }}
            </button>
            <div v-if="item.image" class="h-14 w-14 shrink-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <img :src="item.image" alt="preview" class="h-full w-auto object-contain" />
            </div>
          </div>
          <input
            :ref="el => { if (el) fileInputs[i] = el as HTMLInputElement }"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            class="hidden"
            @change="onFileChange(i, $event)"
          />
          <p v-if="uploadError[i]" class="text-[11px] text-red-600 mt-1">{{ uploadError[i] }}</p>
          <p v-else class="text-[10px] text-gray-400 mt-1">PNG / JPG / SVG / WebP — converti en WebP qualité 85, max 5 Mo.</p>
        </div>
        <div>
          <label class="field-label">Libellé</label>
          <EditorI18nField
            :model-value="item.label"
            :langs="langs"
            placeholder="Fruits secs"
            @update:model-value="updateItem(i, 'label', $event)"
          />
        </div>
        <div>
          <label class="field-label">Lien</label>
          <input :value="item.href ?? ''" @input="updateItem(i, 'href', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="/grossiste/fruit-sec" />
        </div>
      </div>
    </div>

    <p v-if="!items.length" class="text-xs text-gray-400 text-center py-4">Aucune catégorie — cliquez sur + Catégorie</p>
  </div>
</template>

<script setup lang="ts">
import type { ClientLang } from '~/server/api/client-langs.get'

const props = defineProps<{
  payload: any
  langs: ClientLang[]
}>()

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const { t: i18nt } = useI18nField()

const localPayload = computed(() => props.payload ?? { items: [] })
const items = computed(() => localPayload.value.items ?? [])
const expandedItem = ref<number | null>(null)

const fileInputs = ref<Record<number, HTMLInputElement>>({})
const uploading  = ref<Record<number, boolean>>({})
const uploadError = ref<Record<number, string>>({})

function triggerUpload(i: number) {
  fileInputs.value[i]?.click()
}

async function onFileChange(i: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadError.value = { ...uploadError.value, [i]: '' }
  uploading.value   = { ...uploading.value,   [i]: true }
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'universe')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body:   fd,
    })
    if (!res?.url) throw new Error('Réponse invalide')
    updateItem(i, 'image', res.url)
  } catch (err: any) {
    uploadError.value = { ...uploadError.value, [i]: err?.data?.message || err?.message || 'Échec upload' }
  } finally {
    uploading.value = { ...uploading.value, [i]: false }
    if (input) input.value = ''  
  }
}

function emitPayload(items: any[]) {
  emit('update:payload', { ...localPayload.value, items })
}

function updateItem(index: number, key: string, value: any) {
  const updated = [...items.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload(updated)
}

function addItem() {
  const updated = [...items.value, { image: '', label: '', href: '' }]
  emitPayload(updated)
  expandedItem.value = updated.length - 1
}

function removeItem(index: number) {
  const updated = [...items.value]
  updated.splice(index, 1)
  emitPayload(updated)
  if (expandedItem.value === index) expandedItem.value = null
}

function moveItem(from: number, to: number) {
  if (to < 0 || to >= items.value.length) return
  const updated = [...items.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  emitPayload(updated)
  expandedItem.value = to
}
</script>
