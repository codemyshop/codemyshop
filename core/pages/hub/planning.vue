<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Planning Atlas</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ items.length }} item(s) · {{ p0Count }} P0 · {{ p1Count }} P1 · {{ doneCount }} done
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="showCreate = true"
            class="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors">
            + Nouveau
          </button>
          <button @click="loadAll"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-7xl mx-auto space-y-4">
      
      <div class="flex gap-2 flex-wrap">
        <button v-for="v in VIEWS" :key="v.value" @click="view = v.value"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            view === v.value
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600']">
          {{ v.label }}
          <span v-if="counts[v.value] > 0" class="ml-1 text-[10px] opacity-70">({{ counts[v.value] }})</span>
        </button>
      </div>

      
      <div class="flex gap-2 flex-wrap">
        <select v-model="filterPriority" class="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
          <option value="">Toutes priorités</option>
          <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="filterCategory" class="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
          <option value="">Toutes catégories</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 animate-pulse h-20" />
      </div>

      
      <div v-else-if="!visibleItems.length" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-10 text-center text-gray-400 text-sm">
        Aucun item dans cette vue
      </div>

      
      <div v-else-if="view === 'week'" class="space-y-6">
        <div v-for="day in DAYS" :key="day">
          <div v-if="groupedByDay[day]?.length" class="space-y-2">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 capitalize border-l-4 border-primary-500 pl-3">
              {{ day }}
              <span class="text-[10px] text-gray-400 ml-2">({{ groupedByDay[day].length }})</span>
            </h2>
            <HubBacklogItem v-for="it in groupedByDay[day]" :key="it.idItem" :item="it"
              @update="updateItem" @delete="deleteItem" />
          </div>
        </div>
      </div>

      
      <div v-else class="space-y-2">
        <HubBacklogItem v-for="it in visibleItems" :key="it.idItem" :item="it"
          @update="updateItem" @delete="deleteItem" />
      </div>
    </div>

    
    <div v-if="showCreate" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showCreate = false">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-800 dark:text-slate-100">Nouveau item</h3>
        <input v-model="draft.title" placeholder="Titre" class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100" />
        <textarea v-model="draft.description" placeholder="Description (optionnel)" rows="3" class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100" />
        <div class="grid grid-cols-2 gap-3">
          <select v-model="draft.priority" class="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100">
            <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="draft.category" class="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="draft.targetDay" class="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100">
            <option value="">Pas de jour</option>
            <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
          </select>
          <input v-model="draft.targetDate" type="date" class="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="showCreate = false" class="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">Annuler</button>
          <button @click="createItem" :disabled="!draft.title.trim()" class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">Créer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface BacklogItemT {
  idItem: number
  title: string
  description?: string
  category: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'backlog' | 'planned' | 'in_progress' | 'done' | 'cancelled'
  targetDay?: string | null
  targetDate?: string | null
  assignedTo?: string
  clientId?: string | null
  notes?: string | null
}

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const
const CATEGORIES = ['produit', 'infra', 'contenu', 'strategie', 'commercial', 'client'] as const
const DAYS       = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

const VIEWS = [
  { value: 'today',   label: "Aujourd'hui" },
  { value: 'week',    label: 'Cette semaine' },
  { value: 'all',     label: 'Tout actif' },
  { value: 'backlog', label: 'Backlog (sans date)' },
  { value: 'done',    label: 'Done (archive)' },
]

const items          = ref<BacklogItemT[]>([])
const loading        = ref(true)
const view           = ref('today')
const filterPriority = ref('')
const filterCategory = ref('')
const showCreate     = ref(false)
const counts         = ref<Record<string, number>>({})

const draft = ref({
  title: '',
  description: '',
  priority: 'P2' as 'P0' | 'P1' | 'P2' | 'P3',
  category: 'produit' as string,
  targetDay: '',
  targetDate: '',
})

async function loadAll() {
  loading.value = true
  try {
    const r = await $fetch<{ success: boolean; items: BacklogItemT[] }>('/api/backlog', {
      query: { view: view.value },
    })
    items.value = r.items || []
    
    const viewKeys = ['today', 'week', 'all', 'backlog', 'done']
    const results = await Promise.all(
      viewKeys.map(v =>
        $fetch<{ count: number }>('/api/backlog', { query: { view: v } })
          .then(r => [v, r.count] as [string, number])
          .catch(() => [v, 0] as [string, number])
      )
    )
    counts.value = Object.fromEntries(results)
  } catch (e) {
    console.error('loadAll', e)
    items.value = []
  } finally {
    loading.value = false
  }
}

const visibleItems = computed(() => {
  return items.value.filter(it => {
    if (filterPriority.value && it.priority !== filterPriority.value) return false
    if (filterCategory.value && it.category !== filterCategory.value) return false
    return true
  })
})

const groupedByDay = computed(() => {
  const out: Record<string, BacklogItemT[]> = {}
  for (const it of visibleItems.value) {
    const k = it.targetDay || 'sans-jour'
    if (!out[k]) out[k] = []
    out[k].push(it)
  }
  return out
})

const p0Count   = computed(() => items.value.filter(i => i.priority === 'P0').length)
const p1Count   = computed(() => items.value.filter(i => i.priority === 'P1').length)
const doneCount = computed(() => items.value.filter(i => i.status === 'done').length)

async function updateItem(payload: Partial<BacklogItemT> & { idItem: number }) {
  try {
    await $fetch('/api/backlog', { method: 'PUT', body: payload })
    await loadAll()
  } catch (e) { console.error('update', e) }
}

async function deleteItem(idItem: number) {
  if (!confirm('Supprimer cet item ?')) return
  try {
    await $fetch('/api/backlog', { method: 'DELETE', body: { idItem } })
    await loadAll()
  } catch (e) { console.error('delete', e) }
}

async function createItem() {
  try {
    await $fetch('/api/backlog', {
      method: 'POST',
      body: {
        title: draft.value.title.trim(),
        description: draft.value.description || null,
        priority: draft.value.priority,
        category: draft.value.category,
        target_day: draft.value.targetDay || null,
        target_date: draft.value.targetDate || null,
        status: 'planned',
      },
    })
    draft.value = { title: '', description: '', priority: 'P2', category: 'produit', targetDay: '', targetDate: '' }
    showCreate.value = false
    await loadAll()
  } catch (e) { console.error('create', e) }
}

watch(view, () => loadAll())
onMounted(loadAll)
</script>
