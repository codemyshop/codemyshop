<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Stock</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">Inventory</span>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Quantité physique</label>
      <input
        v-model.number="model.stock"
        type="number"
        min="0"
        step="1"
        placeholder="0"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
      <div class="flex items-center gap-2 mt-2">
        <span
          class="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
          :class="badgeClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="dotClass" />
          {{ statusLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StockForm {
  stock: number
}

const model = defineModel<StockForm>({ required: true })

const statusLabel = computed(() => {
  const q = Number(model.value.stock) || 0
  if (q <= 0) return 'Rupture de stock'
  if (q < 5) return 'Stock bas'
  return 'En stock'
})

const badgeClass = computed(() => {
  const q = Number(model.value.stock) || 0
  if (q <= 0) return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
  if (q < 5) return 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
  return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
})

const dotClass = computed(() => {
  const q = Number(model.value.stock) || 0
  if (q <= 0) return 'bg-red-500'
  if (q < 5) return 'bg-amber-500'
  return 'bg-emerald-500'
})
</script>
