
<template>
  <div class="space-y-3">
    
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Défilement</legend>
      <div>
        <label class="field-label">Intervalle (ms)</label>
        <input
          :value="localPayload.interval_ms ?? 6000"
          @input="updateField('interval_ms', Number(($event.target as HTMLInputElement).value))"
          type="number" min="1000" step="500" class="field" />
      </div>
    </fieldset>

    
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        Slides ({{ slides.length }})
      </span>
      <button @click="addSlide" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Slide
      </button>
    </div>

    <div v-for="(slide, i) in slides" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button @click="moveSlide(i, i - 1)" :disabled="i === 0"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
        <button @click="moveSlide(i, i + 1)" :disabled="i === slides.length - 1"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <button
          @click="expandedSlide = expandedSlide === i ? null : i"
          class="flex-1 flex items-center gap-2 px-1 text-left"
        >
          <span class="text-xs font-semibold text-gray-800 truncate">
            {{ i18nt(slide.title) || `Slide ${i + 1}` }}
          </span>
        </button>
        <button @click="removeSlide(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedSlide === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      
      <div v-if="expandedSlide === i" class="p-3 space-y-3">
        <div>
          <label class="field-label">Image</label>
          <div class="flex gap-2">
            <input :value="slide.image ?? ''" @input="updateSlide(i, 'image', ($event.target as HTMLInputElement).value)"
              type="text" class="field flex-1" placeholder="/static/hero/slide.jpg" />
            <button
              @click="($refs['slideUpload' + i] as HTMLInputElement)?.click()"
              :disabled="uploading === 'slide-' + i"
              class="shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-colors"
            >
              {{ uploading === 'slide-' + i ? '…' : 'Upload' }}
            </button>
            <input :ref="'slideUpload' + i" type="file" accept="image/png,image/jpeg,image/webp" class="hidden"
              @change="handleUpload($event, 'slide', i)" />
          </div>
          <p v-if="uploadError && uploading === null" class="text-[10px] text-red-500 mt-1">{{ uploadError }}</p>
          <div v-if="slide.image" class="mt-1.5 h-16 rounded-lg overflow-hidden bg-gray-100">
            <img :src="slide.image" alt="preview" class="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <label class="field-label">Sticker (badge)</label>
          <EditorI18nField
            :model-value="slide.sticker"
            :langs="langs"
            placeholder="NOUVEAUTÉ, PROMO…"
            @update:model-value="updateSlide(i, 'sticker', $event)"
          />
        </div>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="slide.title"
            :langs="langs"
            placeholder="Titre du slide"
            @update:model-value="updateSlide(i, 'title', $event)"
          />
        </div>
        <div>
          <label class="field-label">Sous-titre</label>
          <EditorI18nField
            :model-value="slide.subtitle"
            :langs="langs"
            type="textarea"
            placeholder="Description du slide"
            @update:model-value="updateSlide(i, 'subtitle', $event)"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Bouton (texte)</label>
            <EditorI18nField
              :model-value="slide.cta_label"
              :langs="langs"
              placeholder="Voir le catalogue"
              @update:model-value="updateSlide(i, 'cta_label', $event)"
            />
          </div>
          <div>
            <label class="field-label">Bouton (lien)</label>
            <input :value="slide.cta_to ?? ''" @input="updateSlide(i, 'cta_to', ($event.target as HTMLInputElement).value)"
              type="text" class="field" placeholder="/catalogue" />
          </div>
        </div>
      </div>
    </div>

    <p v-if="!slides.length" class="text-xs text-gray-400 text-center py-4">Aucun slide — cliquez sur + Slide</p>

    
    <div class="flex items-center justify-between mt-4">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        Blocs latéraux ({{ sideBlocks.length }}/2)
      </span>
      <button v-if="sideBlocks.length < 2" @click="addSideBlock" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Bloc
      </button>
    </div>

    <div v-for="(block, i) in sideBlocks" :key="'sb-' + i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button
          @click="expandedBlock = expandedBlock === i ? null : i"
          class="flex-1 flex items-center gap-2 px-1 text-left"
        >
          <span class="text-xs font-semibold text-gray-800 truncate">
            {{ block.alt || `Bloc ${i + 1}` }}
          </span>
        </button>
        <button @click="removeSideBlock(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
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
          <label class="field-label">Image</label>
          <div class="flex gap-2">
            <input :value="block.image ?? ''" @input="updateSideBlock(i, 'image', ($event.target as HTMLInputElement).value)"
              type="text" class="field flex-1" placeholder="/static/hero/block.jpg" />
            <button
              @click="($refs['blockUpload' + i] as HTMLInputElement)?.click()"
              :disabled="uploading === 'block-' + i"
              class="shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-colors"
            >
              {{ uploading === 'block-' + i ? '…' : 'Upload' }}
            </button>
            <input :ref="'blockUpload' + i" type="file" accept="image/png,image/jpeg,image/webp" class="hidden"
              @change="handleUpload($event, 'block', i)" />
          </div>
          <div v-if="block.image" class="mt-1.5 h-16 rounded-lg overflow-hidden bg-gray-100">
            <img :src="block.image" alt="preview" class="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <label class="field-label">Alt</label>
          <input :value="block.alt ?? ''" @input="updateSideBlock(i, 'alt', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Texte alternatif" />
        </div>
        <div>
          <label class="field-label">Sticker (badge)</label>
          <EditorI18nField
            :model-value="block.sticker"
            :langs="langs"
            placeholder="NOUVEAUTÉ…"
            @update:model-value="updateSideBlock(i, 'sticker', $event)"
          />
        </div>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="block.title"
            :langs="langs"
            placeholder="Titre du bloc"
            @update:model-value="updateSideBlock(i, 'title', $event)"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Bouton (texte)</label>
            <EditorI18nField
              :model-value="block.cta_label"
              :langs="langs"
              placeholder="Je découvre"
              @update:model-value="updateSideBlock(i, 'cta_label', $event)"
            />
          </div>
          <div>
            <label class="field-label">Lien</label>
            <input :value="block.to ?? ''" @input="updateSideBlock(i, 'to', ($event.target as HTMLInputElement).value)"
              type="text" class="field" placeholder="/grossiste/oriental" />
          </div>
        </div>
      </div>
    </div>
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

const localPayload = computed(() => props.payload ?? { interval_ms: 6000, slides: [], side_blocks: [] })
const slides = computed(() => localPayload.value.slides ?? [])
const sideBlocks = computed(() => localPayload.value.side_blocks ?? [])
const expandedSlide = ref<number | null>(null)
const expandedBlock = ref<number | null>(null)
const uploading = ref<string | null>(null)
const uploadError = ref('')

async function handleUpload(e: Event, target: 'slide' | 'block', index: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const key = `${target}-${index}`
  uploading.value = key
  uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'hero')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
    })
    if (res?.url) {
      if (target === 'slide') updateSlide(index, 'image', res.url)
      else updateSideBlock(index, 'image', res.url)
    }
  } catch (err: any) {
    uploadError.value = err?.data?.message || err?.message || 'Erreur upload'
  } finally {
    uploading.value = null
    ;(e.target as HTMLInputElement).value = ''
  }
}

function emitPayload(patch: Partial<any>) {
  emit('update:payload', { ...localPayload.value, ...patch })
}

function updateField(key: string, value: any) {
  emitPayload({ [key]: value })
}

function updateSlide(index: number, key: string, value: any) {
  const updated = [...slides.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload({ slides: updated })
}

function addSlide() {
  const updated = [...slides.value, { image: '', title: '', subtitle: '', cta_label: '', cta_to: '' }]
  emitPayload({ slides: updated })
  expandedSlide.value = updated.length - 1
}

function removeSlide(index: number) {
  const updated = [...slides.value]
  updated.splice(index, 1)
  emitPayload({ slides: updated })
  if (expandedSlide.value === index) expandedSlide.value = null
}

function moveSlide(from: number, to: number) {
  if (to < 0 || to >= slides.value.length) return
  const updated = [...slides.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  emitPayload({ slides: updated })
  expandedSlide.value = to
}

function updateSideBlock(index: number, key: string, value: any) {
  const updated = [...sideBlocks.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload({ side_blocks: updated })
}

function addSideBlock() {
  if (sideBlocks.value.length >= 2) return
  const updated = [...sideBlocks.value, { image: '', alt: '', to: '', sticker: '', title: '', cta_label: '' }]
  emitPayload({ side_blocks: updated })
  expandedBlock.value = updated.length - 1
}

function removeSideBlock(index: number) {
  const updated = [...sideBlocks.value]
  updated.splice(index, 1)
  emitPayload({ side_blocks: updated })
  if (expandedBlock.value === index) expandedBlock.value = null
}
</script>
