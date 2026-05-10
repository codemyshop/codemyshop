<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Catégories produits liées</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">
          Associe cet article à des catégories produits. Pivot
          <span class="font-mono">cs_category_cms</span>.
        </p>
      </div>
      <span class="text-[10px] uppercase tracking-wide text-gray-400 font-mono">{{ model.length }} liées</span>
    </div>

    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Rechercher une catégorie par nom…"
        @focus="open = true"
        @input="onSearch"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
      <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>

      <div
        v-if="open && (results.length || searching)"
        class="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-auto"
      >
        <div v-if="searching" class="px-3 py-2 text-xs text-gray-400">Recherche…</div>
        <ul v-else>
          <li
            v-for="r in results"
            :key="r.id"
            @click="addCategory(r)"
            class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800/50 last:border-0"
            :class="isLinked(r.id) && 'opacity-40 pointer-events-none'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-gray-800 dark:text-slate-100 truncate font-medium">{{ r.name }}</p>
              <p class="text-[10px] text-gray-400 font-mono">#{{ r.id }} — {{ r.nbProducts ?? '?' }} produits</p>
            </div>
            <span v-if="isLinked(r.id)" class="text-[10px] uppercase text-emerald-600">Déjà liée</span>
            <span v-else class="text-[10px] text-primary-600">+ Lier</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="!model.length" class="text-center py-10 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
      <p class="text-xs text-gray-400">Aucune catégorie liée. Tapez une recherche pour associer des catégories produits.</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="(cat, idx) in model"
        :key="cat.id"
        class="flex items-center gap-3 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
      >
        <span class="text-[10px] text-gray-400 font-mono w-6">#{{ idx + 1 }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 dark:text-slate-100 truncate font-medium">{{ cat.name }}</p>
          <p class="text-[10px] text-gray-400 font-mono">id_category: {{ cat.id }}</p>
        </div>
        <button type="button" @click="move(idx, -1)" :disabled="idx === 0" title="Monter" class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
        </button>
        <button type="button" @click="move(idx, 1)" :disabled="idx === model.length - 1" title="Descendre" class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
        </button>
        <button type="button" @click="unlink(idx)" title="Délier" class="text-gray-400 hover:text-red-600 transition-colors ml-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

export interface LinkedCategory {
  id: number
  position: number
  name: string
  active?: boolean
}

const model = defineModel<LinkedCategory[]>({ required: true })

const searchQuery = ref('')
const results = ref<any[]>([])
const searching = ref(false)
const open = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function runSearch() {
  searching.value = true
  try {
    const res: any = await $fetch('/api/bo/categories', {
      query: { search: searchQuery.value, perPage: 20 },
    })
    results.value = (res.categories ?? []).filter((c: any) => c.depth > 1)
  } catch (err) {
    console.error('[CategoryLinker] search error:', err)
    results.value = []
  } finally {
    searching.value = false
  }
}

function onSearch() {
  open.value = true
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSearch, 250)
}

function isLinked(id: number) {
  return model.value.some((c) => c.id === id)
}

function addCategory(r: any) {
  if (isLinked(r.id)) return
  model.value = [
    ...model.value,
    { id: r.id, position: model.value.length, name: r.name, active: r.active },
  ]
  searchQuery.value = ''
  open.value = false
}

function unlink(idx: number) {
  model.value = model.value.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i }))
}

function move(idx: number, delta: number) {
  const next = [...model.value]
  const target = idx + delta
  if (target < 0 || target >= next.length) return
  ;[next[idx], next[target]] = [next[target], next[idx]]
  model.value = next.map((c, i) => ({ ...c, position: i }))
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('input') && !target.closest('ul')) open.value = false
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  if (typeof document !== 'undefined') document.removeEventListener('click', onClickOutside)
})
</script>
