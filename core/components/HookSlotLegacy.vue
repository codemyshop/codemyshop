

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
