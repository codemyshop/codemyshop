<!-- @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later -->
<template>
  <div class="bg-white dark:bg-slate-900 px-6 py-2 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <p class="text-xs text-gray-400">Page {{ page }} / {{ totalPages }} — {{ total }} {{ label }}</p>
      <label v-if="perPageOptions && perPageOptions.length" class="flex items-center gap-1.5 text-xs text-gray-400">
        <span>Par page</span>
        <select
          :value="perPage"
          class="text-xs px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @change="$emit('update:perPage', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>
    <div class="flex items-center gap-1">
      <button @click="$emit('go', 1)" :disabled="page <= 1" class="px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-gray-50" title="Première">«</button>
      <button @click="$emit('go', page - 1)" :disabled="page <= 1" class="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-gray-50">Préc.</button>
      <button v-for="p in visiblePages" :key="p" @click="$emit('go', p)" class="px-2.5 py-1 text-xs border rounded-lg transition-colors" :class="p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50'">{{ p }}</button>
      <button @click="$emit('go', page + 1)" :disabled="page >= totalPages" class="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-gray-50">Suiv.</button>
      <button @click="$emit('go', totalPages)" :disabled="page >= totalPages" class="px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-gray-50" title="Dernière">»</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  total: number
  label?: string
  perPage?: number
  perPageOptions?: number[]
}>()
defineEmits<{ go: [page: number]; 'update:perPage': [n: number] }>()

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(props.totalPages, props.page + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})
</script>
