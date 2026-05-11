
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Cross Categories</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">
          Catégories liées affichées en queue des sous-cats natives sur la page front. Pivot
          <span class="font-mono">cs_category_cross</span>.
        </p>
      </div>
      <span class="text-[10px] uppercase tracking-wide text-gray-400 font-mono">{{ items.length }} liée{{ items.length > 1 ? 's' : '' }}</span>
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
            :class="(isLinked(r.id) || r.id === hostId) && 'opacity-40 pointer-events-none'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-gray-800 dark:text-slate-100 truncate font-medium">{{ r.name }}</p>
              <p class="text-[10px] text-gray-400 truncate font-mono">#{{ r.id }} · /{{ r.link_rewrite }}</p>
            </div>
            <span v-if="r.id === hostId" class="text-[10px] uppercase text-gray-400">Soi-même</span>
            <span v-else-if="isLinked(r.id)" class="text-[10px] uppercase text-emerald-600">Déjà lié</span>
            <span v-else class="text-[10px] text-primary-600">+ Lier</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="!items.length" class="text-center py-10 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
      <p class="text-xs text-gray-400">Aucune cross-catégorie liée. Tape une recherche pour ajouter.</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="(c, idx) in items"
        :key="c.id"
        class="flex items-center gap-3 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
      >
        <span class="text-[10px] text-gray-400 font-mono w-6">#{{ idx + 1 }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 dark:text-slate-100 truncate font-medium">
            {{ c.name }}
            <span v-if="!c.active" class="ml-1 text-[10px] uppercase text-amber-600">inactif</span>
          </p>
          <p class="text-[10px] text-gray-400 truncate font-mono">#{{ c.id }} · /{{ c.link_rewrite }}</p>
        </div>
        <button type="button" @click="move(idx, -1)" :disabled="idx === 0" title="Monter" class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
        </button>
        <button type="button" @click="move(idx, 1)" :disabled="idx === items.length - 1" title="Descendre" class="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
        </button>
        <button type="button" @click="unlink(idx)" title="Délier" class="text-gray-400 hover:text-red-600 transition-colors ml-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </li>
    </ul>

    <p v-if="status" class="text-xs" :class="statusClass">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ hostId: number }>()

interface CrossItem {
  id: number
  name: string
  link_rewrite: string
  level_depth: number
  active: boolean
}
interface SearchResult {
  id: number
  name: string
  link_rewrite: string
}

const items = ref<CrossItem[]>([])
const searchQuery = ref('')
const results = ref<SearchResult[]>([])
const searching = ref(false)
const open = ref(false)
const status = ref<string | null>(null)
const statusClass = ref('text-violet-600')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  try {
    const res = await $fetch<{ items: CrossItem[] }>(`/api/bo/categories/${props.hostId}/cross-categories`)
    items.value = res.items ?? []
  } catch (err) {
    console.error('[CrossLinker] load error:', err)
  }
}

async function runSearch() {
  searching.value = true
  try {
    const res = await $fetch<{ products?: any; categories?: SearchResult[] } | { items: SearchResult[] } | any>('/api/bo/categories', {
      query: { search: searchQuery.value, perPage: 30 },
    })
    
    const arr: any[] = (res?.categories || res?.items || []) as any[]
    results.value = arr.map((c) => ({
      id: Number(c.id ?? c.id_category),
      name: String(c.name ?? ''),
      link_rewrite: String(c.link_rewrite ?? c.slug ?? ''),
    }))
  } catch (err) {
    console.error('[CrossLinker] search error:', err)
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
  return items.value.some((c) => c.id === id)
}

async function persist() {
  status.value = 'Enregistrement…'
  statusClass.value = 'text-violet-600'
  try {
    await $fetch(`/api/bo/categories/${props.hostId}/cross-categories`, {
      method: 'PUT',
      body: { ids: items.value.map((c) => c.id) },
    })
    status.value = 'Lien enregistré'
    statusClass.value = 'text-emerald-600'
    setTimeout(() => { status.value = null }, 2500)
  } catch (err: any) {
    status.value = err?.data?.message || 'Échec enregistrement'
    statusClass.value = 'text-red-500'
  }
}

async function addCategory(r: SearchResult) {
  if (isLinked(r.id) || r.id === props.hostId) return
  items.value = [
    ...items.value,
    {
      id: r.id,
      name: r.name,
      link_rewrite: r.link_rewrite,
      level_depth: 0,
      active: true,
    },
  ]
  searchQuery.value = ''
  open.value = false
  await persist()
}

async function unlink(idx: number) {
  items.value = items.value.filter((_, i) => i !== idx)
  await persist()
}

async function move(idx: number, delta: number) {
  const next = [...items.value]
  const target = idx + delta
  if (target < 0 || target >= next.length) return
  const a = next[idx]
  const b = next[target]
  if (!a || !b) return
  next[idx] = b
  next[target] = a
  items.value = next
  await persist()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('input') && !target.closest('ul')) open.value = false
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('click', onClickOutside)
  load()
})
onUnmounted(() => {
  if (typeof document !== 'undefined') document.removeEventListener('click', onClickOutside)
})
</script>
