<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-6"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-to-class="opacity-0 translate-y-6"
    >
      <div
        v-if="visible"
        class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-2xl"
        :class="isDark
          ? 'bg-slate-900/95 border-slate-700/50'
          : 'bg-white/95 border-gray-200/50'"
      >

        
        <template v-if="showEditMode">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-wider"
                  :class="isDark ? 'text-slate-500' : 'text-gray-400'">Builder</span>
            <button
              @click="toggleEditMode"
              class="relative w-[72px] h-8 rounded-xl transition-all duration-200"
              :class="isEditMode
                ? 'bg-primary-600'
                : isDark ? 'bg-slate-700' : 'bg-gray-200'"
            >
              <span
                class="absolute top-1 w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center transition-transform duration-200"
                :class="isEditMode ? 'translate-x-[42px]' : 'translate-x-1'"
              >
                <svg v-if="isEditMode" class="w-3.5 h-3.5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </span>
              <span
                class="absolute top-2 text-[9px] font-bold uppercase tracking-wider"
                :class="isEditMode
                  ? 'left-2.5 text-primary-200'
                  : isDark ? 'right-2 text-slate-400' : 'right-2 text-gray-400'"
              >{{ isEditMode ? 'Edit' : 'View' }}</span>
            </button>
          </div>
        </template>

        
        <div v-if="showEditMode" class="w-px h-6 rounded-full" :class="isDark ? 'bg-slate-700' : 'bg-gray-200'" />
        <span class="text-[10px] font-mono" :class="isDark ? 'text-slate-600' : 'text-gray-400'">
          {{ resolvedClientId }}
        </span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { isEditMode, toggleEditMode } = useEditMode()
const { isDark } = useDarkMode()
const { resolvedClientId } = useClientDetection()
const auth = useAuth()
const user = (auth as any).user as Ref<{ is_admin?: boolean; user_type?: string; firstname?: string; lastname?: string } | null> | undefined
const route = useRoute()

const isHubPage = computed(() => route.path.startsWith('/hub'))
const isPublicPage = computed(() => !isHubPage.value)

const showEditMode = computed(() => isPublicPage.value)

const visible = computed(() => {
  
  if (route.query['builder-preview'] === '1') return false
  
  if (isHubPage.value) return false
  
  
  const u = user?.value
  if (u && (u.is_admin || u.user_type === 'employee')) return true
  
  if (route.query.preview) return true
  return false
})
</script>
