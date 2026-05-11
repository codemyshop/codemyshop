
<template>
  <div class="fixed inset-0 z-40 bg-gray-50 dark:bg-slate-950 flex flex-col">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Merchandising</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ orphans.length }} non classé{{ orphans.length > 1 ? 's' : '' }} ·
            {{ leafCount }} catégorie{{ leafCount > 1 ? 's' : '' }} feuille
            <span v-if="selectedCat"> · <strong class="text-gray-700 dark:text-slate-200">{{ selectedCat.name }}</strong> ({{ catProducts.length }})</span>
          </p>
        </div>
        <span v-if="selectedIds.size > 0" class="text-xs px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full font-semibold flex items-center gap-1.5">
          {{ selectedIds.size }} sélectionné{{ selectedIds.size > 1 ? 's' : '' }} — drag vers une cat
          <button @click="clearSelection" class="text-primary-500 hover:text-primary-700 ml-1" title="Désélectionner (Esc)">×</button>
        </span>
      </div>
      <NuxtLink to="/hub/dashboard" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
        Retour Dashboard
      </NuxtLink>
    </header>

    
    <div class="flex-1 flex min-h-0 overflow-hidden">

      
      <aside
        class="w-72 shrink-0 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 transition-colors"
        :class="dropTargetOrphan ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-300 ring-inset' : ''"
        @dragover="onDragOverOrphan"
        @dragleave="onDragLeaveOrphan"
        @drop="onDropOnOrphan"
      >
        <div class="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            🚧 Non classés ({{ orphans.length }})
          </h2>
          <input v-model="orphanFilter" type="text" placeholder="Filtrer…" class="mt-2 w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" />
        </div>
        <div class="flex-1 overflow-auto">
          <div v-if="loadingOrphans" class="p-3 space-y-1.5">
            <div v-for="i in 6" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div v-else-if="!filteredOrphans.length" class="p-6 text-center text-xs text-gray-400">
            Aucun produit sans cat 🎉
          </div>
          <ul v-else class="divide-y divide-gray-50 dark:divide-slate-800">
            <li
              v-for="p in filteredOrphans" :key="p.id"
              class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group cursor-move select-none"
              :class="selectedIds.has(p.id) && selectedFrom === 'orphan' ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-300 ring-inset' : ''"
              draggable="true"
              @click="onCardClick(p, 'orphan', $event)"
              @dragstart="onDragStart(p, 'orphan', $event)"
              @dragend="onDragEnd"
            >
              <div class="flex items-center justify-between gap-2">
                <button
                  @click.stop="toggleSelect(p, 'orphan')"
                  class="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
                  :class="selectedIds.has(p.id) && selectedFrom === 'orphan'
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-transparent hover:border-primary-400'"
                  title="Sélectionner"
                >
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </button>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-gray-800 dark:text-slate-200 line-clamp-2 leading-tight">{{ p.name }}</p>
                  <p v-if="p.reference" class="text-[10px] font-mono text-gray-400 mt-0.5">#{{ p.id }} · {{ p.reference }}</p>
                </div>
                <button
                  @click.stop="suggestCats(p)"
                  :disabled="suggestingId === p.id"
                  class="shrink-0 text-[10px] px-2 py-1 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 rounded font-semibold transition-colors disabled:opacity-50"
                  title="Suggérer des catégories via IA"
                >
                  {{ suggestingId === p.id ? '…' : '🤖' }}
                </button>
              </div>
              
              <div v-if="suggestions[p.id]?.length" class="mt-1.5 space-y-1">
                <button
                  v-for="s in suggestions[p.id]" :key="s.id_category"
                  @click.stop="assignCat(p, s.id_category, s.silo_path)"
                  class="w-full text-left text-[10px] px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 transition-colors flex items-center justify-between gap-2"
                  :title="s.reason"
                >
                  <span class="font-mono truncate">{{ s.silo_path }}</span>
                  <span class="text-emerald-500 shrink-0">+</span>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      
      <aside class="w-80 shrink-0 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
        <div class="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            🗂 Catégories
          </h2>
          <input v-model="catFilter" type="text" placeholder="Filtrer…" class="mt-2 w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" />
        </div>
        <div class="flex-1 overflow-auto">
          <div v-if="loadingCats" class="p-3 space-y-1.5">
            <div v-for="i in 12" :key="i" class="h-7 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <ul v-else class="py-1">
            <li v-for="c in filteredCats" :key="c.id">
              <button
                @click="selectCat(c)"
                @dragover="onDragOverCat(c.id, $event)"
                @dragleave="onDragLeaveCat"
                @drop="onDropOnCat(c.id, $event)"
                :class="[
                  'w-full text-left flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors',
                  selectedCat?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-slate-300',
                  dropTargetCatId === c.id ? 'ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : ''
                ]"
                :style="{ paddingLeft: `${(c.levelDepth - 2) * 12 + 12}px` }"
              >
                <span class="truncate">
                  <span v-if="c.levelDepth > 2" class="text-gray-300 mr-1">›</span>
                  {{ c.name || `#${c.id}` }}
                </span>
                <span class="text-[10px] tabular-nums shrink-0" :class="c.nbProducts > 0 ? 'text-gray-400' : 'text-gray-300'">{{ c.nbProducts }}</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      
      <main class="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
        <div v-if="!selectedCat" class="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">👈</div>
          <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Sélectionne une catégorie</p>
          <p class="text-xs text-gray-400 mt-2">pour voir et organiser ses produits.</p>
        </div>

        <template v-else>
          <div class="px-6 py-3 border-b border-gray-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{{ selectedCat.name }}</h2>
              <p class="text-[10px] text-gray-400 font-mono">#{{ selectedCat.id }} · /grossiste/{{ selectedCat.slug }}</p>
            </div>

            
            <div class="relative w-72 shrink-0">
              <input
                v-model="searchQuery"
                @input="onSearchInput"
                type="text"
                placeholder="Ajouter par ref/id/nom…"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <div v-if="searchQuery && (searchResults.length || searching)" class="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                <div v-if="searching" class="p-3 text-xs text-gray-400 text-center">Recherche…</div>
                <div v-else-if="!searchResults.length" class="p-3 text-xs text-gray-400 text-center">Aucun résultat</div>
                <button
                  v-for="r in searchResults" :key="r.id"
                  @click="addFromSearch(r)"
                  class="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-b-0 flex items-center gap-2"
                >
                  <img v-if="r.image_id" :src="imgUrl(r)" loading="lazy" class="w-8 h-8 object-contain rounded bg-gray-50 dark:bg-slate-800 shrink-0" @error="onImgError($event, r)" />
                  <div v-else class="w-8 h-8 rounded bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">📦</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{{ r.name }}</p>
                    <p class="text-[10px] font-mono text-gray-400">#{{ r.id }}<span v-if="r.reference"> · {{ r.reference }}</span></p>
                  </div>
                  <span class="text-emerald-500 text-base font-bold shrink-0">+</span>
                </button>
              </div>
            </div>

            <span class="text-xs text-gray-500 dark:text-slate-400 shrink-0">{{ catProducts.length }} produit{{ catProducts.length > 1 ? 's' : '' }}</span>
          </div>

          <div class="flex-1 overflow-auto p-6">
            <div v-if="loadingProducts" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <div v-for="i in 8" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
            <div v-else-if="!catProducts.length" class="flex flex-col items-center justify-center py-20 text-center">
              <p class="text-sm text-gray-500 dark:text-slate-400">Aucun produit dans cette catégorie</p>
              <p class="text-xs text-gray-400 mt-2">Utilise la colonne « Non classés » + le bouton 🤖 pour les ranger.</p>
            </div>
            <template v-else>
              <template v-for="(page, pageIdx) in pagedProducts" :key="pageIdx">
                <div v-if="pageIdx > 0" class="my-6 flex items-center gap-3">
                  <div class="flex-1 h-px bg-gray-200 dark:bg-slate-800" />
                  <span class="text-[10px] uppercase tracking-wider text-gray-400">Page {{ pageIdx + 1 }}</span>
                  <div class="flex-1 h-px bg-gray-200 dark:bg-slate-800" />
                </div>
                <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  <article
                    v-for="p in page" :key="p.id"
                    class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3 hover:border-primary-300 dark:hover:border-primary-700 transition-all group relative cursor-move select-none"
                    :class="[
                      dropTargetCardId === p.id ? 'ring-2 ring-emerald-400 -translate-x-1' : '',
                      selectedIds.has(p.id) && selectedFrom === selectedCat!.id ? 'ring-2 ring-primary-500 bg-primary-50/40 dark:bg-primary-900/30' : '',
                    ]"
                    draggable="true"
                    @click="onCardClick(p, selectedCat!.id, $event)"
                    @dragstart="onDragStart(p, selectedCat!.id, $event)"
                    @dragend="onDragEnd"
                    @dragover="onDragOverCard(p, $event)"
                    @dragleave="onDragLeaveCard"
                    @drop="onDropOnCard(p, $event)"
                  >
                    <button
                      @click.stop="unassignProduct(p)"
                      class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs"
                      :title="`Retirer de ${selectedCat.name}`"
                    >×</button>
                    <button
                      @click.stop="toggleSelect(p, selectedCat!.id)"
                      class="absolute bottom-2 right-2 w-5 h-5 rounded border flex items-center justify-center transition-all"
                      :class="selectedIds.has(p.id) && selectedFrom === selectedCat!.id
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-transparent hover:border-primary-400 opacity-0 group-hover:opacity-100'"
                      title="Sélectionner"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <div class="aspect-square w-full bg-gray-50 dark:bg-slate-800 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      <img
                        v-if="p.image_id && !imgErrors.has(p.id)"
                        :src="imgUrl(p)" :alt="p.name" loading="lazy"
                        class="w-full h-full object-contain"
                        @error="onImgError($event, p)"
                      />
                      <span v-else class="text-3xl text-gray-200 dark:text-slate-700">📦</span>
                    </div>
                    <p class="text-xs font-medium text-gray-800 dark:text-slate-200 line-clamp-2 leading-tight">{{ p.name }}</p>
                    <p v-if="p.reference" class="text-[10px] font-mono text-gray-400 mt-1">#{{ p.id }} · {{ p.reference }}</p>
                  </article>
                </div>
              </template>
            </template>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Cat {
  id: number
  idParent: number
  levelDepth: number
  active: number
  position: number
  name: string | null
  slug: string | null
  nbProducts: number
}
interface Prod {
  id: number
  name: string
  reference: string | null
  image_id: number | null
  link_rewrite: string | null
}

const PAGE_SIZE = 24

const orphans = ref<Prod[]>([])
const cats = ref<Cat[]>([])
const catProducts = ref<Prod[]>([])
const selectedCat = ref<Cat | null>(null)
const suggestions = ref<Record<number, Array<{ id_category: number; silo_path: string; reason: string }>>>({})

const loadingOrphans = ref(true)
const loadingCats = ref(true)
const loadingProducts = ref(false)
const suggestingId = ref<number | null>(null)

const orphanFilter = ref('')
const catFilter = ref('')

const leafCount = computed(() => cats.value.filter(c => !cats.value.some(c2 => c2.idParent === c.id && c2.active)).length)

const filteredOrphans = computed(() => {
  const q = orphanFilter.value.trim().toLowerCase()
  if (!q) return orphans.value
  return orphans.value.filter(p => p.name.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q))
})

const treeOrdered = computed(() => {
  const active = cats.value.filter(c => c.active === 1)
  const childrenMap = new Map<number, Cat[]>()
  for (const c of active) {
    if (!childrenMap.has(c.idParent)) childrenMap.set(c.idParent, [])
    childrenMap.get(c.idParent)!.push(c)
  }
  for (const arr of childrenMap.values()) arr.sort((a, b) => (a.position || 0) - (b.position || 0) || (a.name || '').localeCompare(b.name || ''))

  const out: Cat[] = []
  function walk(parentId: number) {
    const kids = childrenMap.get(parentId) || []
    for (const k of kids) {
      out.push(k)
      walk(k.id)
    }
  }
  walk(2) 
  return out
})

const filteredCats = computed(() => {
  const q = catFilter.value.trim().toLowerCase()
  if (!q) return treeOrdered.value
  
  return treeOrdered.value.filter(c => (c.name || '').toLowerCase().includes(q))
})

const pagedProducts = computed(() => {
  const out: Prod[][] = []
  for (let i = 0; i < catProducts.value.length; i += PAGE_SIZE) {
    out.push(catProducts.value.slice(i, i + PAGE_SIZE))
  }
  return out
})

async function loadOrphans() {
  loadingOrphans.value = true
  try {
    const r = await $fetch<{ ok: boolean; products: Prod[] }>('/api/bo/merchandising/orphans')
    orphans.value = r.products || []
  } catch (e) {
    console.error('orphans load failed', e)
    orphans.value = []
  } finally {
    loadingOrphans.value = false
  }
}

async function loadCats() {
  loadingCats.value = true
  try {
    const r = await $fetch<{ ok: boolean; categories: Cat[] }>('/api/bo/merchandising')
    cats.value = r.categories || []
  } catch (e) {
    console.error('cats load failed', e)
    cats.value = []
  } finally {
    loadingCats.value = false
  }
}

async function loadProducts(catId: number) {
  loadingProducts.value = true
  try {
    const r = await $fetch<{ ok: boolean; products: Prod[] }>('/api/bo/merchandising/products', { query: { id_category: catId } })
    catProducts.value = r.products || []
  } catch (e) {
    console.error('products load failed', e)
    catProducts.value = []
  } finally {
    loadingProducts.value = false
  }
}

async function selectCat(c: Cat) {
  selectedCat.value = c
  await loadProducts(c.id)
}

async function suggestCats(p: Prod) {
  suggestingId.value = p.id
  try {
    const r = await $fetch<{ ok: boolean; suggestions: Array<{ id_category: number; silo_path: string; reason: string }> }>('/api/bo/merchandising/suggest-cats', { query: { id_product: p.id } })
    suggestions.value = { ...suggestions.value, [p.id]: r.suggestions || [] }
  } catch (e) {
    console.error('suggest failed', e)
    alert('Erreur LLM (claude CLI). Vérifie le service.')
  } finally {
    suggestingId.value = null
  }
}

async function assignCat(p: Prod, idCat: number, siloPath: string) {
  try {
    await $fetch('/api/bo/merchandising/assign', { method: 'POST', body: { id_product: p.id, id_category: idCat } })
    
    orphans.value = orphans.value.filter(o => o.id !== p.id)
    
    if (selectedCat.value?.id === idCat) await loadProducts(idCat)
    
    const c = cats.value.find(c => c.id === idCat)
    if (c) c.nbProducts = Number(c.nbProducts || 0) + 1
  } catch (e) {
    console.error('assign failed', e)
    alert('Erreur lors de l\'assignation')
  }
}

const selectedIds = ref<Set<number>>(new Set())
const selectedFrom = ref<number | 'orphan' | null>(null)
const lastClickedId = ref<number | null>(null)

function onCardClick(p: Prod, from: number | 'orphan', e: MouseEvent) {
  
  if (selectedFrom.value !== null && selectedFrom.value !== from) {
    selectedIds.value = new Set()
  }
  selectedFrom.value = from

  if (e.metaKey || e.ctrlKey) {
    const next = new Set(selectedIds.value)
    if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
    selectedIds.value = next
  } else if (e.shiftKey && lastClickedId.value !== null) {
    const list = from === 'orphan' ? filteredOrphans.value : catProducts.value
    const a = list.findIndex(x => x.id === lastClickedId.value)
    const b = list.findIndex(x => x.id === p.id)
    if (a >= 0 && b >= 0) {
      const next = new Set(selectedIds.value)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      for (let i = lo; i <= hi; i++) next.add(list[i].id)
      selectedIds.value = next
    }
  } else {
    selectedIds.value = new Set([p.id])
  }
  lastClickedId.value = p.id
  if (selectedIds.value.size === 0) selectedFrom.value = null
}

function clearSelection() {
  selectedIds.value = new Set()
  selectedFrom.value = null
  lastClickedId.value = null
}

function toggleSelect(p: Prod, from: number | 'orphan') {
  if (selectedFrom.value !== null && selectedFrom.value !== from) {
    selectedIds.value = new Set()
  }
  selectedFrom.value = from
  const next = new Set(selectedIds.value)
  if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
  selectedIds.value = next
  lastClickedId.value = p.id
  if (selectedIds.value.size === 0) selectedFrom.value = null
}

const onEscKey = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection() }
onMounted(() => window.addEventListener('keydown', onEscKey))
onUnmounted(() => window.removeEventListener('keydown', onEscKey))

const dragPayload = ref<{ ids: number[]; from: number | 'orphan' } | null>(null)
const dropTargetCatId = ref<number | null>(null)
const dropTargetOrphan = ref(false)

function onDragStart(p: Prod, from: number | 'orphan', e: DragEvent) {
  
  if (!selectedIds.value.has(p.id) || selectedFrom.value !== from) {
    selectedIds.value = new Set([p.id])
    selectedFrom.value = from
  }
  const ids = [...selectedIds.value]
  dragPayload.value = { ids, from }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', ids.join(','))
  }
}
function onDragEnd() {
  dragPayload.value = null
  dropTargetCatId.value = null
  dropTargetOrphan.value = false
}
function onDragOverCat(catId: number, e: DragEvent) {
  if (!dragPayload.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dropTargetCatId.value = catId
}
function onDragLeaveCat() { dropTargetCatId.value = null }
function onDropOnCat(catId: number, e: DragEvent) {
  e.preventDefault()
  const payload = dragPayload.value
  dropTargetCatId.value = null
  dragPayload.value = null
  if (!payload) return
  if (payload.from === catId) return 
  
  Promise.all(payload.ids.map(id =>
    $fetch('/api/bo/merchandising/assign', { method: 'POST', body: { id_product: id, id_category: catId } }),
  ))
    .then(() => {
      const ids = new Set(payload.ids)
      if (payload.from === 'orphan') {
        orphans.value = orphans.value.filter(o => !ids.has(o.id))
      }
      const c = cats.value.find(c => c.id === catId)
      if (c) c.nbProducts = Number(c.nbProducts || 0) + payload.ids.length
      if (selectedCat.value?.id === catId) loadProducts(catId)
      clearSelection()
    })
    .catch(e => { console.error('drop assign failed', e); alert('Erreur drag & drop') })
}

const dropTargetCardId = ref<number | null>(null)
function onDragOverCard(target: Prod, e: DragEvent) {
  if (!dragPayload.value || !selectedCat.value) return
  if (dragPayload.value.ids.includes(target.id)) return
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dropTargetCardId.value = target.id
}
function onDragLeaveCard() { dropTargetCardId.value = null }
async function onDropOnCard(target: Prod, e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const payload = dragPayload.value
  dropTargetCardId.value = null
  dragPayload.value = null
  if (!payload || !selectedCat.value) return
  if (payload.ids.includes(target.id)) return

  
  
  const draggedSet = new Set(payload.ids)
  const draggedProds: Prod[] = []
  
  for (const x of catProducts.value) if (draggedSet.has(x.id)) draggedProds.push(x)
  
  for (const id of payload.ids) {
    if (!draggedProds.find(d => d.id === id)) {
      const o = orphans.value.find(o => o.id === id)
      if (o) draggedProds.push(o)
    }
  }
  let newList = catProducts.value.filter(x => !draggedSet.has(x.id))
  const targetIdx = newList.findIndex(x => x.id === target.id)
  if (targetIdx < 0) newList.push(...draggedProds)
  else newList.splice(targetIdx, 0, ...draggedProds)
  catProducts.value = newList

  if (payload.from === 'orphan') {
    orphans.value = orphans.value.filter(o => !draggedSet.has(o.id))
    const c = cats.value.find(c => c.id === selectedCat.value!.id)
    if (c) c.nbProducts = Number(c.nbProducts || 0) + payload.ids.length
  } else if (typeof payload.from === 'number' && payload.from !== selectedCat.value.id) {
    const c = cats.value.find(c => c.id === selectedCat.value!.id)
    if (c) c.nbProducts = Number(c.nbProducts || 0) + payload.ids.length
  }

  try {
    
    if (payload.from !== selectedCat.value.id) {
      await Promise.all(payload.ids.map(id =>
        $fetch('/api/bo/merchandising/assign', { method: 'POST', body: { id_product: id, id_category: selectedCat.value!.id } }),
      ))
    }
    await $fetch('/api/bo/merchandising/reorder', {
      method: 'PUT',
      body: { id_category: selectedCat.value.id, ordered_ids: newList.map(x => x.id) },
    })
    clearSelection()
  } catch (e) {
    console.error('reorder failed', e)
    if (selectedCat.value) loadProducts(selectedCat.value.id)
  }
}

function onDragOverOrphan(e: DragEvent) {
  if (!dragPayload.value || dragPayload.value.from === 'orphan') return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dropTargetOrphan.value = true
}
function onDragLeaveOrphan() { dropTargetOrphan.value = false }
function onDropOnOrphan(e: DragEvent) {
  e.preventDefault()
  const payload = dragPayload.value
  dropTargetOrphan.value = false
  dragPayload.value = null
  if (!payload || payload.from === 'orphan' || typeof payload.from !== 'number') return
  const fromCat = payload.from
  
  Promise.all(payload.ids.map(id =>
    $fetch('/api/bo/merchandising/unassign', { method: 'DELETE', query: { id_product: id, id_category: fromCat } }),
  ))
    .then(() => {
      const ids = new Set(payload.ids)
      if (selectedCat.value?.id === fromCat) {
        catProducts.value = catProducts.value.filter(x => !ids.has(x.id))
      }
      const c = cats.value.find(c => c.id === fromCat)
      if (c) c.nbProducts = Math.max(0, Number(c.nbProducts || 0) - payload.ids.length)
      loadOrphans()
      clearSelection()
    })
    .catch(e => { console.error('drop unassign failed', e); alert('Erreur drag & drop') })
}

async function unassignProduct(p: Prod) {
  if (!selectedCat.value) return
  
  try {
    await $fetch('/api/bo/merchandising/unassign', { method: 'DELETE', query: { id_product: p.id, id_category: selectedCat.value.id } })
    catProducts.value = catProducts.value.filter(x => x.id !== p.id)
    const c = cats.value.find(c => c.id === selectedCat.value!.id)
    if (c) c.nbProducts = Math.max(0, Number(c.nbProducts || 0) - 1)
    loadOrphans()
  } catch (e) {
    console.error('unassign failed', e)
  }
}

const searchQuery = ref('')
const searchResults = ref<Prod[]>([])
const searching = ref(false)
let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  const q = searchQuery.value.trim()
  if (q.length < 2) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const r = await $fetch<{ ok: boolean; products: Prod[] }>('/api/bo/merchandising/search-product', { query: { q } })
      searchResults.value = r.products || []
    } catch (e) {
      console.error('search failed', e)
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 200)
}
async function addFromSearch(p: Prod) {
  if (!selectedCat.value) return
  try {
    await $fetch('/api/bo/merchandising/assign', { method: 'POST', body: { id_product: p.id, id_category: selectedCat.value.id } })
    
    if (!catProducts.value.find(x => x.id === p.id)) {
      catProducts.value.unshift(p)
    }
    
    const c = cats.value.find(c => c.id === selectedCat.value!.id)
    if (c) c.nbProducts = Number(c.nbProducts || 0) + 1
    
    orphans.value = orphans.value.filter(o => o.id !== p.id)
    
    searchQuery.value = ''
    searchResults.value = []
  } catch (e) {
    console.error('add failed', e)
  }
}

function imgUrl(p: Prod) {
  if (!p.image_id) return ''
  const digits = String(p.image_id).split('').join('/')
  const slug = (p.link_rewrite || 'product').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product'
  return `/img/p/${digits}/${p.image_id}-${slug}-400.webp`
}

function imgFallback(p: Prod) {
  if (!p.image_id) return ''
  const digits = String(p.image_id).split('').join('/')
  return `/img/p/${digits}/${p.image_id}-home_default.jpg`
}

const imgErrors = ref(new Set<number>())
function onImgError(e: Event, p: Prod) {
  const img = e.target as HTMLImageElement
  const fb = imgFallback(p)
  if (fb && img.src !== window.location.origin + fb && !img.src.endsWith(fb)) {
    img.src = fb
  } else {
    imgErrors.value.add(p.id)
  }
}

onMounted(() => {
  loadOrphans()
  loadCats()
})
</script>
