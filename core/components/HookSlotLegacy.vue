<!--
  HookSlotLegacy — point de greffe DB-driven historique.
  Lit cs_hook via useHooks et rend les composants enregistrés.

  Conservé pour les usages existants (cms, page, product targets). Pour le
  nouveau code, préférer <HookSlot name="..."> qui est code-first via
  useDisplaySlot.provideSlot() (pas de DB nécessaire, build-time résolu).
-->

<template>
  <template v-for="h in hooks" :key="h.id">
    <component :is="resolveNamed(h.component)" v-bind="$attrs" />
  </template>
</template>

<script setup lang="ts">
import { resolveComponent, computed } from 'vue'

const props = defineProps<{
  targetType: string
  targetId: string | number
  slot?: string
}>()

const { data } = useHooks(props.targetType, props.targetId, props.slot)
const hooks = computed(() => data.value?.hooks || [])

function resolveNamed(name: string) {
  const resolved = resolveComponent(name, false)
  return typeof resolved === 'string' ? null : resolved
}
</script>
