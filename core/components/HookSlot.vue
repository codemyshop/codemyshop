<!--
  HookSlot — point de greffe runtime. 2 modes selon les props :

  1. Code-first (préféré, post chantier codemyshop-oss Phase 1.3) :
       <HookSlot name="displayLeadDetail:after-info" :context="lead" />
     Les modules s'enregistrent via provideSlot() (cf useDisplaySlot.ts).
     Aucune DB — résolution build-time + runtime in-process.

  2. DB-driven (legacy cs_hook) :
       <HookSlot target-type="page" target-id="contact" slot="after_content" />
     Délégué à <HookSlotLegacy> qui appelle useHooks/useFetch.
-->

<template>
  <!-- Mode code-first -->
  <template v-if="name">
    <component
      v-for="(entry, idx) in slotEntries"
      :key="`${entry.moduleId}-${idx}`"
      :is="entry.component"
      v-bind="{ ...$attrs, context }"
    />
  </template>

  <!-- Legacy DB-driven mode (delegated to allow conditional call of useHooks) -->
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
  // Mode code-first
  name?: string
  context?: any
  // Legacy DB-driven mode (delegated to HookSlotLegacy)
  targetType?: string
  targetId?: string | number
  slot?: string
}>()

const { getSlotEntries } = useDisplaySlot()
const slotEntries = computed(() => (props.name ? getSlotEntries(props.name) : []))
</script>
