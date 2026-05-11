<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Catégories associées</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ categories.length }} sélectionnée(s)</span>
    </div>

    
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-2">Catégories sélectionnées</label>
      <div v-if="categories.length" class="flex flex-wrap gap-2">
        <span
          v-for="cat in categories"
          :key="cat.id"
          class="bg-gray-800 text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1"
        >
          <span>{{ cat.name }}</span>
          <button
            type="button"
            @click="$emit('remove', cat.id)"
            class="hover:text-red-300 transition-colors"
            aria-label="Retirer cette catégorie"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>
      <p v-else class="text-xs text-gray-400">Aucune catégorie.</p>
    </div>

    
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Catégorie par défaut</label>
      <select
        v-model.number="defaultId"
        class="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      >
        <option :value="0" disabled>— Sélectionner une catégorie —</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <p class="text-[10px] text-gray-400 mt-1">
        Cette catégorie sera utilisée pour générer le fil d'Ariane principal.
      </p>
    </div>

    
    <div>
      <button
        type="button"
        @click="$emit('add-request')"
        class="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ajouter des catégories
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Category {
  id: number
  name: string
}

defineProps<{ categories: Category[] }>()

defineEmits<{
  (e: 'remove', id: number): void
  (e: 'add-request'): void
}>()

const defaultId = defineModel<number>('defaultId', { required: true })
</script>
