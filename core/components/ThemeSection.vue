<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Wrapper qui applique les tokens du Design System actif.
  Props :
    - variant: 'wow' | 'flat' | 'alt' (type de fond)
-->
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
