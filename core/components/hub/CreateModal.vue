
<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div class="fixed inset-0 bg-black/30" @click="$emit('update:modelValue', false)" />
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-lg max-h-[70vh] overflow-auto z-10">
          <div class="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ title }}</h2>
            <button @click="$emit('update:modelValue', false)" class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
          </div>
          <div class="px-6 py-5">
            <slot />
          </div>
          <div class="sticky bottom-0 bg-white dark:bg-slate-900 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button @click="$emit('update:modelValue', false)" class="text-xs px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
            <button @click="$emit('submit')" :disabled="loading" class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium">
              {{ loading ? 'Création…' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; title: string; loading?: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean]; submit: [] }>()
</script>
