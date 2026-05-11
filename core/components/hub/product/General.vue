<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Informations générales</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">General</span>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Nom du produit</label>
      <input
        v-model="model.name"
        type="text"
        placeholder="Ex. Chaise en chêne massif"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Référence</label>
        <input
          v-model="model.reference"
          type="text"
          placeholder="REF-001"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Code-barres EAN-13</label>
        <input
          v-model="model.ean13"
          type="text"
          placeholder="3017620422003"
          class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
      </div>
    </div>

    

    
    <div class="pt-5 border-t border-gray-100 dark:border-slate-800">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">Visibilité</h3>
        <span class="text-[10px] text-gray-400">Statut de vente</span>
      </div>
      <div class="space-y-3">
        <label class="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p class="text-sm text-gray-800 dark:text-slate-100 font-medium">Disponible à la vente</p>
            <p class="text-[11px] text-gray-400">Bouton « Ajouter au panier » visible sur la fiche produit.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="model.availableForOrder"
            @click="model.availableForOrder = !model.availableForOrder"
            :class="model.availableForOrder ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-700'"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <span
              :class="model.availableForOrder ? 'translate-x-4' : 'translate-x-0.5'"
              class="inline-block h-4 w-4 my-0.5 rounded-full bg-white shadow transition-transform"
            />
          </button>
        </label>
        <label class="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p class="text-sm text-gray-800 dark:text-slate-100 font-medium">Afficher le prix</p>
            <p class="text-[11px] text-gray-400">Si désactivé, le prix n'apparaît pas sur la fiche publique.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="model.showPrice"
            @click="model.showPrice = !model.showPrice"
            :class="model.showPrice ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-700'"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <span
              :class="model.showPrice ? 'translate-x-4' : 'translate-x-0.5'"
              class="inline-block h-4 w-4 my-0.5 rounded-full bg-white shadow transition-transform"
            />
          </button>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface GeneralForm {
  name: string
  reference: string
  ean13: string
  availableForOrder: boolean
  showPrice: boolean
}

const model = defineModel<GeneralForm>({ required: true })
</script>
