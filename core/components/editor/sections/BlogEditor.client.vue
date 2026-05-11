
<template>
  <div class="space-y-3">
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Articles</legend>
      <div>
        <label class="field-label">Nombre d'articles</label>
        <input
          :value="localPayload.limit ?? 3"
          @input="updateField('limit', Number(($event.target as HTMLInputElement).value))"
          type="number" min="1" max="12" step="1" class="field" />
      </div>
    </fieldset>

    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Bouton "Voir tout"</legend>
      <div>
        <label class="field-label">Texte du bouton</label>
        <input
          :value="localPayload.cta_label ?? ''"
          @input="updateField('cta_label', ($event.target as HTMLInputElement).value)"
          type="text" class="field" placeholder="Découvrez tous nos conseils" />
      </div>
      <div>
        <label class="field-label">Lien</label>
        <input
          :value="localPayload.cta_to ?? ''"
          @input="updateField('cta_to', ($event.target as HTMLInputElement).value)"
          type="text" class="field" placeholder="/blog" />
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  payload: any
}>()

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const localPayload = computed(() => props.payload ?? { limit: 3, cta_label: '', cta_to: '' })

function updateField(key: string, value: any) {
  emit('update:payload', { ...localPayload.value, [key]: value })
}
</script>
