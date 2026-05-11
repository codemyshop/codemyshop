<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Prix</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">Pricing</span>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Prix d'achat HT</label>
      <div class="relative">
        <input
          v-model.number="model.wholesalePrice"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
      <p class="text-[10px] text-gray-400 mt-1">Coût fournisseur — sert à calculer la marge.</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Prix de vente HT</label>
      <div class="relative">
        <input
          v-model.number="model.priceHT"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pl-3 pr-8 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Règle de taxe</label>
      <select
        v-model.number="model.taxRulesGroupId"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      >
        <option :value="0">Aucune taxe</option>
        <option v-for="rule in availableTaxRules" :key="rule.id" :value="rule.id">{{ rule.label }}</option>
      </select>
    </div>

    <div class="pt-3 border-t border-gray-100 dark:border-slate-800">
      <label class="block text-xs font-medium text-gray-500 mb-1">Prix de vente TTC</label>
      <div class="relative">
        <input
          :value="priceTTC.toFixed(2)"
          type="text"
          readonly
          class="w-full text-sm border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 rounded-lg pl-3 pr-8 py-2 font-bold text-primary-600 dark:text-primary-400 cursor-not-allowed"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
      </div>
      <p class="text-[10px] text-gray-400 mt-1">
        Calculé automatiquement ({{ currentTaxRate }}% de TVA).
      </p>
    </div>

    
    <div class="bg-gray-50 dark:bg-slate-950/60 border border-gray-100 dark:border-slate-800 p-4 rounded-md space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Récapitulatif</span>
        <span class="text-[10px] text-gray-400">HT</span>
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Marge brute</span>
        <span class="font-mono font-semibold" :class="grossMargin < 0 ? 'text-red-600' : 'text-gray-800 dark:text-slate-100'">
          {{ formatEur(grossMargin) }}
        </span>
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Taux de marge</span>
        <span class="font-mono font-semibold" :class="marginRate < 0 ? 'text-red-600' : marginRate < 10 ? 'text-amber-600' : 'text-emerald-600'">
          {{ marginRate.toFixed(2) }} %
        </span>
      </div>

      <div v-if="marginRate < 0" class="text-[10px] text-red-600 border-t border-red-200 dark:border-red-900/40 pt-2">
        ⚠ Prix de vente inférieur au prix d'achat — vente à perte.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PricingForm {
  wholesalePrice: number
  priceHT: number
  taxRulesGroupId: number
}

interface TaxRule {
  id: number
  label: string
  rate: number
}

const model = defineModel<PricingForm>({ required: true })
const props = defineProps<{ taxRules?: TaxRule[] }>()

const availableTaxRules = computed(() => props.taxRules ?? [])

const currentTaxRate = computed(() => {
  const rule = availableTaxRules.value.find(r => r.id === model.value.taxRulesGroupId)
  return rule ? rule.rate : 0
})

const priceTTC = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  return Math.round(ht * (1 + currentTaxRate.value / 100) * 100) / 100
})

const grossMargin = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  const cost = Number(model.value.wholesalePrice) || 0
  return ht - cost
})

const marginRate = computed(() => {
  const ht = Number(model.value.priceHT) || 0
  if (ht <= 0) return 0
  return (grossMargin.value / ht) * 100
})

function formatEur(n: number) {
  return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
</script>
