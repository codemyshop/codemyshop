<template>
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
    <div class="px-5 py-4 flex items-start gap-4">
      <!-- Checkbox done -->
      <button @click="toggleDone"
        :class="['mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0',
          item.status === 'done'
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-slate-600 hover:border-green-500']">
        <svg v-if="item.status === 'done'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span :class="priorityClass" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ item.priority }}</span>
          <span :class="statusClass" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{{ statusLabel }}</span>
          <span class="text-[10px] text-gray-400 capitalize">{{ item.category }}</span>
          <span v-if="item.targetDay" class="text-[10px] text-primary-600 font-semibold capitalize">{{ item.targetDay }}</span>
          <span v-if="item.targetDate" class="text-[10px] text-gray-400">{{ formatDate(item.targetDate) }}</span>
          <span v-if="item.clientId" class="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{{ item.clientId }}</span>
        </div>
        <p :class="['text-sm leading-relaxed', item.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-slate-200']">
          {{ item.title }}
        </p>
        <p v-if="item.description && expanded" class="mt-2 text-xs text-gray-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
          {{ item.description }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <button v-if="item.description" @click="expanded = !expanded" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
          <svg class="w-4 h-4" :class="{ 'rotate-180': expanded }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button @click="cycleStatus" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400" title="Cycle statut">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M12 8v8" />
          </svg>
        </button>
        <button @click="$emit('delete', item.idItem)" class="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Supprimer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BacklogItemT {
  idItem: number
  title: string
  description?: string
  category: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'backlog' | 'planned' | 'in_progress' | 'done' | 'cancelled'
  targetDay?: string | null
  targetDate?: string | null
  clientId?: string | null
}

const props = defineProps<{ item: BacklogItemT }>()
const emit  = defineEmits<{
  (e: 'update', payload: { idItem: number; status?: string }): void
  (e: 'delete', idItem: number): void
}>()

const expanded = ref(false)

const STATUS_CYCLE: BacklogItemT['status'][] = ['backlog', 'planned', 'in_progress', 'done']

const STATUS_LABELS: Record<string, string> = {
  backlog:     'Backlog',
  planned:     'Planifié',
  in_progress: 'En cours',
  done:        'Done',
  cancelled:   'Annulé',
}

const statusLabel = computed(() => STATUS_LABELS[props.item.status] || props.item.status)

const priorityClass = computed(() => {
  switch (props.item.priority) {
    case 'P0': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'P1': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    case 'P2': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    default:   return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
  }
})

const statusClass = computed(() => {
  switch (props.item.status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'planned':     return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
    case 'done':        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'cancelled':   return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500'
    default:            return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
  }
})

function toggleDone() {
  emit('update', { idItem: props.item.idItem, status: props.item.status === 'done' ? 'planned' : 'done' })
}

function cycleStatus() {
  const idx = STATUS_CYCLE.indexOf(props.item.status as any)
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
  emit('update', { idItem: props.item.idItem, status: next })
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  } catch { return d }
}
</script>
