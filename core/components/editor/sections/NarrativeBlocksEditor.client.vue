
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        Blocs ({{ blocks.length }})
      </span>
      <button @click="addBlock" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Bloc
      </button>
    </div>

    <div v-for="(block, i) in blocks" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button @click="moveBlock(i, i - 1)" :disabled="i === 0"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
        <button @click="moveBlock(i, i + 1)" :disabled="i === blocks.length - 1"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <button @click="expandedBlock = expandedBlock === i ? null : i" class="flex-1 flex items-center gap-2 px-1 text-left">
          <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(block.title) || `Bloc ${i + 1}` }}</span>
        </button>
        <button @click="removeBlock(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedBlock === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <div v-if="expandedBlock === i" class="p-3 space-y-3">
        <div>
          <label class="field-label">Image (URL)</label>
          <input :value="block.image ?? ''" @input="updateBlock(i, 'image', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="/img/narratif/sourcing.jpg" />
          <div v-if="block.image" class="mt-1.5 h-16 rounded-lg overflow-hidden bg-gray-100">
            <img :src="block.image" alt="preview" class="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <label class="field-label">Kicker</label>
          <EditorI18nField
            :model-value="block.kicker"
            :langs="langs"
            placeholder="Sourcing direct"
            @update:model-value="updateBlock(i, 'kicker', $event)"
          />
        </div>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="block.title"
            :langs="langs"
            placeholder="De l'origine au sachet"
            @update:model-value="updateBlock(i, 'title', $event)"
          />
        </div>
        <div>
          <label class="field-label">Texte</label>
          <EditorI18nField
            :model-value="block.text"
            :langs="langs"
            type="textarea"
            placeholder="Description du bloc"
            @update:model-value="updateBlock(i, 'text', $event)"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">CTA (texte)</label>
            <EditorI18nField
              :model-value="block.cta_label"
              :langs="langs"
              placeholder="En savoir plus"
              @update:model-value="updateBlock(i, 'cta_label', $event)"
            />
          </div>
          <div>
            <label class="field-label">CTA (lien)</label>
            <input :value="block.cta_to ?? ''" @input="updateBlock(i, 'cta_to', ($event.target as HTMLInputElement).value)"
              type="text" class="field" placeholder="/page/notre-demarche" />
          </div>
        </div>
      </div>
    </div>

    <p v-if="!blocks.length" class="text-xs text-gray-400 text-center py-4">Aucun bloc — cliquez sur + Bloc</p>
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

const localPayload = computed(() => props.payload ?? { blocks: [] })
const blocks = computed(() => localPayload.value.blocks ?? [])
const expandedBlock = ref<number | null>(null)

function emitPayload(blocks: any[]) {
  emit('update:payload', { ...localPayload.value, blocks })
}

function updateBlock(index: number, key: string, value: any) {
  const updated = [...blocks.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload(updated)
}

function addBlock() {
  const updated = [...blocks.value, { image: '', kicker: '', title: '', text: '', cta_label: '', cta_to: '' }]
  emitPayload(updated)
  expandedBlock.value = updated.length - 1
}

function removeBlock(index: number) {
  const updated = [...blocks.value]
  updated.splice(index, 1)
  emitPayload(updated)
  if (expandedBlock.value === index) expandedBlock.value = null
}

function moveBlock(from: number, to: number) {
  if (to < 0 || to >= blocks.value.length) return
  const updated = [...blocks.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  emitPayload(updated)
  expandedBlock.value = to
}
</script>
