

<template>
  
  <template v-if="name">
    <component
      v-for="(entry, idx) in slotEntries"
      :key="`${entry.moduleId}-${idx}`"
      :is="entry.component"
      v-bind="{ ...$attrs, context }"
    />
  </template>

  
  <HookSlotLegacy
    v-else-if="targetType && targetId != null"
    :target-type="targetType"
    :target-id="targetId"
    :slot="slot"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplaySlot } from '~/composables/useDisplaySlot'

const props = defineProps<{
  
  name?: string
  context?: any
  
  targetType?: string
  targetId?: string | number
  slot?: string
}>()

const { getSlotEntries } = useDisplaySlot()
const slotEntries = computed(() => (props.name ? getSlotEntries(props.name) : []))
</script>
