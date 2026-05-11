<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">FAQ catégorie</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">
          Questions/réponses affichées sur la page catégorie publique. JSON-LD <span class="font-mono">FAQPage</span> auto-généré.
          Recommandé : <span class="font-semibold">15 Q/R minimum</span> pour le SEO.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="text-[10px] uppercase tracking-wide px-2 py-1 rounded font-mono"
          :class="model.length >= 15 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'"
        >
          {{ model.length }} / 15
        </span>
        <button
          type="button"
          @click="addRow"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter une question
        </button>
      </div>
    </div>

    <div v-if="!model.length" class="text-center py-10 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
      <p class="text-xs text-gray-400">Aucune question. Cliquez sur « Ajouter une question » pour commencer.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(faq, idx) in model"
        :key="faq.id ?? `new-${idx}`"
        class="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden"
      >
        <header class="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40">
          <span class="text-[10px] uppercase tracking-wide text-gray-400 font-mono w-8">#{{ idx + 1 }}</span>
          <button
            type="button"
            @click="move(idx, -1)"
            :disabled="idx === 0"
            title="Monter"
            class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
          </button>
          <button
            type="button"
            @click="move(idx, 1)"
            :disabled="idx === model.length - 1"
            title="Descendre"
            class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <label class="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
            <input type="checkbox" v-model="faq.active" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span>Active</span>
          </label>
          <button
            type="button"
            @click="remove(idx)"
            title="Supprimer"
            class="text-gray-400 hover:text-red-600 transition-colors ml-1"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          </button>
        </header>

        <div class="p-4 space-y-3">
          <div>
            <label class="block text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Question</label>
            <input
              v-model="faq.question"
              type="text"
              placeholder="Comment conserver les dattes Medjool ?"
              maxlength="512"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <p class="text-[10px] text-gray-400 mt-1">{{ (faq.question || '').length }} / 512</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Réponse</label>
              <div class="flex items-center gap-1">
                <button
                  v-for="tool in toolbar"
                  :key="tool.cmd"
                  type="button"
                  @mousedown.prevent="exec(idx, tool.cmd)"
                  :title="tool.label"
                  class="text-xs px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
                >
                  {{ tool.icon }}
                </button>
              </div>
            </div>
            <div
              :ref="(el) => { if (el) editorRefs[idx] = el as HTMLElement }"
              contenteditable="true"
              class="min-h-[100px] w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40 prose prose-sm dark:prose-invert max-w-none"
              @input="(e) => onAnswerInput(idx, e)"
              @blur="(e) => onAnswerInput(idx, e)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { CategoryFaq } from '~/types/hub/category-silo'

const model = defineModel<CategoryFaq[]>({ required: true })

const editorRefs = ref<Record<number, HTMLElement>>({})

const toolbar = [
  { cmd: 'bold', label: 'Gras', icon: 'B' },
  { cmd: 'italic', label: 'Italique', icon: 'I' },
  { cmd: 'insertUnorderedList', label: 'Liste', icon: '•' },
  { cmd: 'removeFormat', label: 'Effacer', icon: '⟲' },
]

function exec(idx: number, cmd: string) {
  if (typeof document === 'undefined') return
  const el = editorRefs.value[idx]
  if (!el) return
  el.focus()
  document.execCommand(cmd, false)
  const row = model.value[idx]
  if (row) row.answer = el.innerHTML
}

function onAnswerInput(idx: number, ev: Event) {
  const el = ev.target as HTMLElement
  if (model.value[idx]) model.value[idx].answer = el.innerHTML
}

function addRow() {
  model.value = [
    ...model.value,
    { position: model.value.length, active: true, question: '', answer: '' },
  ]
}

function remove(idx: number) {
  model.value = model.value.filter((_, i) => i !== idx)
}

function move(idx: number, delta: number) {
  const next = [...model.value]
  const target = idx + delta
  if (target < 0 || target >= next.length) return
  const a = next[idx]
  const b = next[target]
  if (!a || !b) return
  next[idx] = b
  next[target] = a
  model.value = next.map((f, i) => ({ ...f, position: i }))
}

watch(
  () => model.value,
  () => {
    nextTick(() => {
      for (const [idxStr, el] of Object.entries(editorRefs.value)) {
        const i = Number(idxStr)
        const html = model.value[i]?.answer || ''
        if (el && el.innerHTML !== html) el.innerHTML = html
      }
    })
  },
  { flush: 'post' },
)

onMounted(() => {
  nextTick(() => {
    for (const [idxStr, el] of Object.entries(editorRefs.value)) {
      const i = Number(idxStr)
      const html = model.value[i]?.answer || ''
      if (el) el.innerHTML = html
    }
  })
})
</script>
