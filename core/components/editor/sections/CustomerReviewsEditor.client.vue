
<template>
  <div class="space-y-3">
    <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Affichage</legend>
      <div>
        <label class="field-label">Nombre d'avis affichés</label>
        <input
          :value="localPayload.limit ?? 6"
          @input="updateField('limit', Number(($event.target as HTMLInputElement).value))"
          type="number" min="1" max="12" class="field" />
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

const localPayload = computed(() => props.payload ?? { limit: 6 })

function updateField(key: string, value: any) {
  emit('update:payload', { ...localPayload.value, [key]: value })
}
</script>
