<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-gray-500">Catégorie parente</label>
      <div class="flex items-center gap-2">
        <input
          v-model="filter"
          type="text"
          placeholder="Filtrer…"
          class="text-[11px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
        />
        <button
          type="button"
          @click="expandAll"
          class="text-[10px] uppercase tracking-wide px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          :title="allExpanded ? 'Replier tout' : 'Déplier tout'"
        >
          {{ allExpanded ? 'Replier' : 'Déplier' }}
        </button>
      </div>
    </div>

    <div
      class="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg max-h-80 overflow-auto p-2 text-sm"
      role="tree"
    >
      <HubCategoryTreeNodeInner
        v-for="node in filteredRoots"
        :key="node.id"
        :node="node"
        :selected-id="selectedId"
        :expanded="expanded"
        :excluded-id="excludeId"
        @select="onSelect"
        @toggle="onToggle"
      />
      <p v-if="!filteredRoots.length" class="text-xs text-gray-400 px-2 py-3">Aucune catégorie ne correspond.</p>
    </div>

    <p class="text-[10px] text-gray-400">
      Sélectionnée :
      <span class="font-mono text-gray-700 dark:text-slate-200">
        {{ selectedLabel }}
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface FlatCategory {
  id: number
  name: string
  parentId: number
  depth: number
}

export interface TreeCategory extends FlatCategory {
  children: TreeCategory[]
}

const props = defineProps<{
  categories: FlatCategory[]
  excludeId?: number
  rootId?: number
}>()

const selectedId = defineModel<number>({ required: true })

const filter = ref('')
const expanded = ref<Set<number>>(new Set())

const rootId = computed(() => props.rootId ?? 1)

const tree = computed<TreeCategory[]>(() => {
  const byParent = new Map<number, TreeCategory[]>()
  const all: TreeCategory[] = props.categories.map((c) => ({ ...c, children: [] }))
  for (const c of all) {
    if (!byParent.has(c.parentId)) byParent.set(c.parentId, [])
    byParent.get(c.parentId)!.push(c)
  }
  for (const c of all) {
    c.children = (byParent.get(c.id) || []).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }
  const roots = (byParent.get(rootId.value) || []).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return roots
})

const filteredRoots = computed<TreeCategory[]>(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return tree.value

  function keepSubtree(node: TreeCategory): TreeCategory | null {
    const matchSelf = node.name.toLowerCase().includes(q)
    const keptChildren = node.children
      .map((c) => keepSubtree(c))
      .filter((c): c is TreeCategory => !!c)
    if (matchSelf || keptChildren.length) {
      return { ...node, children: keptChildren }
    }
    return null
  }

  return tree.value
    .map((r) => keepSubtree(r))
    .filter((r): r is TreeCategory => !!r)
})

const allIds = computed(() => props.categories.map((c) => c.id))
const allExpanded = computed(() => allIds.value.every((id) => expanded.value.has(id)))

watch(
  filter,
  (q) => {
    if (q.trim()) {
      expanded.value = new Set(allIds.value)
    }
  },
  { immediate: false },
)

watch(
  selectedId,
  (id) => {
    let cur = props.categories.find((c) => c.id === id)
    while (cur && cur.parentId > 1) {
      expanded.value.add(cur.parentId)
      cur = props.categories.find((c) => c.id === cur!.parentId)
    }
  },
  { immediate: true },
)

function onSelect(id: number) {
  if (id === props.excludeId) return
  selectedId.value = id
}

function onToggle(id: number) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function expandAll() {
  if (allExpanded.value) {
    expanded.value = new Set()
  } else {
    expanded.value = new Set(allIds.value)
  }
}

const selectedLabel = computed(() => {
  if (selectedId.value === rootId.value) return 'Racine'
  const found = props.categories.find((c) => c.id === selectedId.value)
  if (!found) return `#${selectedId.value}`
  const path: string[] = [found.name]
  let cur = found
  while (cur && cur.parentId > rootId.value) {
    const parent = props.categories.find((c) => c.id === cur.parentId)
    if (!parent) break
    path.unshift(parent.name)
    cur = parent
  }
  return path.join(' › ')
})
</script>
