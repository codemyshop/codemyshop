
<template>
  <div class="space-y-3">

    
    <fieldset v-if="hasLimit" class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Affichage</legend>
      <div>
        <label class="field-label">Nombre de produits affichés</label>
        <input
          :value="localPayload.limit ?? 8"
          @input="updateField('limit', Number(($event.target as HTMLInputElement).value))"
          type="number" min="1" max="50" class="field" />
      </div>
      <div>
        <label class="field-label">Côté du produit mis en avant</label>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            @click="updateField('featuredPosition', 'left')"
            :class="[
              'flex-1 py-1.5 font-medium transition-colors',
              currentFeaturedPosition === 'left'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            ]"
          >← Gauche</button>
          <button
            type="button"
            @click="updateField('featuredPosition', 'right')"
            :class="[
              'flex-1 py-1.5 font-medium transition-colors',
              currentFeaturedPosition === 'right'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            ]"
          >Droite →</button>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">Le produit phare (carte large) sera placé de ce côté ; les 4 autres sur la grille opposée.</p>
      </div>
    </fieldset>

    
    <fieldset v-if="sectionType === 'instagram'" class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Instagram</legend>
      <div>
        <label class="field-label">Lien Instagram</label>
        <input
          :value="localPayload.url ?? ''"
          @input="updateField('url', ($event.target as HTMLInputElement).value)"
          type="url" class="field" placeholder="https://instagram.com/example-shop" />
      </div>
      <div>
        <label class="field-label">Handle (@)</label>
        <input
          :value="localPayload.handle ?? ''"
          @input="updateField('handle', ($event.target as HTMLInputElement).value)"
          type="text" class="field" placeholder="@example_official" />
      </div>
    </fieldset>

    
    <div v-if="!hasLimit && sectionType !== 'instagram'" class="py-6 text-center">
      <p class="text-xs text-gray-400">Cette section n'a pas de configuration avancée.</p>
      <p class="text-[10px] text-gray-300 mt-1">Vous pouvez modifier son titre et sous-titre ci-dessus.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  payload: any
  sectionType: string
}>()

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const localPayload = computed(() => props.payload ?? {})

const hasLimit = computed(() =>
  ['promotions', 'bestsellers', 'new-products'].includes(props.sectionType),
)

const DEFAULT_FEATURED_POSITION: Record<string, 'left' | 'right'> = {
  promotions:    'right',
  'new-products':'right',
  bestsellers:   'left',
}
const currentFeaturedPosition = computed<'left' | 'right'>(() => {
  const v = localPayload.value.featuredPosition
  if (v === 'left' || v === 'right') return v
  return DEFAULT_FEATURED_POSITION[props.sectionType] ?? 'left'
})

function updateField(key: string, value: any) {
  emit('update:payload', { ...localPayload.value, [key]: value })
}
</script>
