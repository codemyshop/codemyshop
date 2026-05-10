<template>
  <div role="treeitem" :aria-selected="isSelected" :aria-expanded="hasChildren ? isOpen : undefined">
    <div
      :class="[
        'group flex items-center gap-1.5 px-1 py-1 rounded cursor-pointer select-none transition-colors',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-semibold'
          : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-slate-200',
        isExcluded && 'opacity-40 cursor-not-allowed',
      ]"
      @click="onRowClick"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-100"
        @click.stop="emit('toggle', node.id)"
        :title="isOpen ? 'Replier' : 'Déplier'"
      >
        <svg class="w-3 h-3 transition-transform" :class="isOpen ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      <span v-else class="w-4 h-4 inline-block" />

      <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>

      <span class="text-xs truncate flex-1">{{ node.name }}</span>
      <span class="text-[10px] text-gray-400 font-mono">#{{ node.id }}</span>
    </div>

    <div v-if="hasChildren && isOpen" class="ml-4 border-l border-gray-100 dark:border-slate-800/70 pl-2">
      <HubCategoryTreeNodeInner
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :expanded="expanded"
        :excluded-id="excludedId"
        @select="(id) => emit('select', id)"
        @toggle="(id) => emit('toggle', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TreeCategory {
  id: number
  name: string
  parentId: number
  depth: number
  children: TreeCategory[]
}

const props = defineProps<{
  node: TreeCategory
  selectedId: number
  expanded: Set<number>
  excludedId?: number
}>()

const emit = defineEmits<{
  (e: 'select', id: number): void
  (e: 'toggle', id: number): void
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const isOpen = computed(() => props.expanded.has(props.node.id))
const isSelected = computed(() => props.selectedId === props.node.id)
const isExcluded = computed(() => props.excludedId === props.node.id)

function onRowClick() {
  if (isExcluded.value) return
  emit('select', props.node.id)
  if (hasChildren.value && !isOpen.value) emit('toggle', props.node.id)
}
</script>
