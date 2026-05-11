
<template>
  <div :class="bgClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'wow' | 'flat' | 'alt'
}>(), { variant: 'flat' })

const { tokens } = useDesignSystem()

const bgClasses = computed(() => {
  switch (props.variant) {
    case 'wow':
      return `${tokens.value.bgWow} ${tokens.value.bgWowDark}`
    case 'alt':
      return `${tokens.value.sectionAlt} ${tokens.value.sectionAltDark}`
    case 'flat':
    default:
      return `${tokens.value.bgFlat} ${tokens.value.bgFlatDark}`
  }
})
</script>
