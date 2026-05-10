<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Éditeur Atouts/Features — icône, titre, texte par item, multilang.
-->
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        Atouts ({{ items.length }})
      </span>
      <button @click="addItem" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Atout
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
          <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(item.title) || `Atout ${i + 1}` }}</span>
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
          <label class="field-label">Icône</label>
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="ic in ICON_OPTIONS" :key="ic.value"
              @click="updateItem(i, 'icon', ic.value)"
              class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
              :class="item.icon === ic.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'"
            >
              {{ ic.label }}
            </button>
          </div>
        </div>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="item.title"
            :langs="langs"
            placeholder="Livraison gratuite"
            @update:model-value="updateItem(i, 'title', $event)"
          />
        </div>
        <div>
          <label class="field-label">Description</label>
          <EditorI18nField
            :model-value="item.text"
            :langs="langs"
            type="textarea"
            placeholder="Dès 300 € HT en France"
            @update:model-value="updateItem(i, 'text', $event)"
          />
        </div>
      </div>
    </div>

    <p v-if="!items.length" class="text-xs text-gray-400 text-center py-4">Aucun atout — cliquez sur + Atout</p>
  </div>
</template>

<script setup lang="ts">
import type { ClientLang } from '~/server/api/client-langs.get'

const ICON_OPTIONS = [
  { value: 'truck',  label: '🚚 Livraison' },
  { value: 'shield', label: '🛡️ Qualité' },
  { value: 'store',  label: '🏪 Drive' },
  { value: 'card',   label: '💳 Paiement' },
  { value: 'clock',  label: '⏱️ Délai' },
  { value: 'leaf',   label: '🌿 Eco' },
  { value: 'check',  label: '✅ Certifié' },
  { value: 'star',   label: '⭐ Premium' },
]

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

function emitPayload(items: any[]) {
  emit('update:payload', { ...localPayload.value, items })
}

function updateItem(index: number, key: string, value: any) {
  const updated = [...items.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload(updated)
}

function addItem() {
  const updated = [...items.value, { icon: 'check', title: '', text: '' }]
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
