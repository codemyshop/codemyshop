<template>
  <div class="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

    
    <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-sm font-semibold text-gray-800 dark:text-slate-100 dark:text-slate-100">Suivi d'activité équipe</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ doneTasks }} / {{ tasks.length }} tâches terminées aujourd'hui</p>
        </div>
        <button
          @click="showTaskModal = true"
          class="flex items-center gap-1.5 px-3 py-1.5 border border-primary-200 text-primary-600 hover:bg-primary-50 text-xs font-semibold rounded-lg transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Assigner une tâche
        </button>
      </div>

      
      <div class="flex items-center gap-3">
        <div class="flex-1 bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full bg-primary-500 transition-all duration-700"
            :style="`width: ${progressPct}%`"
          />
        </div>
        <span class="text-xs font-semibold text-gray-600 tabular-nums w-8 text-right">{{ progressPct }}%</span>
      </div>
    </div>

    
    <div class="divide-y divide-gray-50 flex-1 overflow-auto">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
        :class="task.status === 'done' ? 'opacity-60' : ''"
      >
        
        <button
          @click="toggleTask(task.id)"
          :class="task.status === 'done'
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-primary-400'"
          class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150"
        >
          <svg v-if="task.status === 'done'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </button>

        
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium truncate"
            :class="task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-slate-100 dark:text-slate-100'"
          >{{ task.title }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            
            <span :class="priorityDot(task.priority)" class="w-1.5 h-1.5 rounded-full inline-block shrink-0" />
            <span class="text-xs text-gray-400 capitalize">{{ task.priority }}</span>
          </div>
        </div>

        
        <div class="flex items-center gap-1.5 shrink-0">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            :style="`background-color: ${task.assignee.color}`"
            :title="task.assignee.name"
          >
            {{ task.assignee.initials }}
          </div>
          <span class="text-xs text-gray-500 hidden lg:block max-w-[80px] truncate">{{ task.assignee.name.split(' ')[0] }}</span>
        </div>

        
        <span :class="taskStatusBadge(task.status)" class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block">
          {{ taskStatusLabel(task.status) }}
        </span>
      </div>

      
      <div v-if="tasks.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
        <svg class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <p class="text-sm">Aucune tâche pour aujourd'hui</p>
      </div>
    </div>

  </div>

  
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showTaskModal"
        class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        @click.self="showTaskModal = false"
      >
        <div class="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
          
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800 dark:text-slate-100 dark:text-slate-100">Assigner une tâche</h3>
            </div>
            <button @click="showTaskModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Titre de la tâche <span class="text-red-400">*</span></label>
              <input v-model="newTask.title" type="text" placeholder="ex: Préparer devis client Dupont" class="field" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Assigner à</label>
                <select v-model="newTask.assigneeIdx" class="field">
                  <option v-for="(m, i) in TEAM" :key="i" :value="i">{{ m.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Priorité</label>
                <select v-model="newTask.priority" class="field">
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Statut initial</label>
              <div class="flex gap-2">
                <button
                  v-for="s in (['todo', 'in_progress'] as const)"
                  :key="s"
                  @click="newTask.status = s"
                  :class="newTask.status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-900 dark:bg-slate-900 text-gray-600 border-gray-200 dark:border-slate-700 dark:border-slate-700 hover:border-primary-300'"
                  class="flex-1 py-1.5 text-xs font-medium border rounded-lg transition-colors"
                >
                  {{ s === 'todo' ? 'À faire' : 'En cours' }}
                </button>
              </div>
            </div>
          </div>

          
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 dark:border-slate-800">
            <button @click="showTaskModal = false" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-200 transition-colors">
              Annuler
            </button>
            <button
              @click="submitTask"
              :disabled="!newTask.title"
              class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Créer la tâche
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export interface TeamMember { name: string; initials: string; color: string }
export interface Task {
  id:       number
  title:    string
  assignee: TeamMember
  status:   'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
}

const props = defineProps<{ tasks: Task[] }>()
const emit  = defineEmits<{ taskCreated: [task: Task]; taskToggled: [id: number] }>()

const TEAM: TeamMember[] = [
  { name: 'Alexandre C.', initials: 'AC', color: 'var(--color-primary-600)' },
  { name: 'Sophie M.',    initials: 'SM', color: '#10b981' },
  { name: 'Jean D.',      initials: 'JD', color: '#f59e0b' },
  { name: 'Claire T.',    initials: 'CT', color: '#8b5cf6' },
]

const doneTasks   = computed(() => props.tasks.filter(t => t.status === 'done').length)
const progressPct = computed(() =>
  props.tasks.length ? Math.round((doneTasks.value / props.tasks.length) * 100) : 0
)

function toggleTask(id: number) { emit('taskToggled', id) }

const showTaskModal = ref(false)
const newTask = reactive({
  title:       '',
  assigneeIdx: 0,
  priority:    'medium' as Task['priority'],
  status:      'todo'   as 'todo' | 'in_progress',
})

function submitTask() {
  const task: Task = {
    id:       Date.now(),
    title:    newTask.title,
    assignee: TEAM[newTask.assigneeIdx],
    priority: newTask.priority,
    status:   newTask.status,
  }
  emit('taskCreated', task)
  Object.assign(newTask, { title: '', assigneeIdx: 0, priority: 'medium', status: 'todo' })
  showTaskModal.value = false
}

function taskStatusBadge(s: Task['status']) {
  return {
    todo:        'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-500',
    in_progress: 'bg-primary-50 text-primary-700',
    done:        'bg-green-50 text-green-700',
  }[s]
}
function taskStatusLabel(s: Task['status']) {
  return { todo: 'À faire', in_progress: 'En cours', done: 'Terminé' }[s]
}
function priorityDot(p: Task['priority']) {
  return { low: 'bg-gray-300', medium: 'bg-amber-400', high: 'bg-red-400' }[p]
}
</script>

<style scoped>
.field {
  @apply w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
         bg-white dark:bg-slate-900 dark:bg-slate-900 text-gray-800 dark:text-slate-100 dark:text-slate-100;
}
</style>
