
<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: number
  color?: string
}>(), {
  size: 40,
  color: '',
})

const { config } = useClientDetection()

const resolvedColor = computed(() => {
  if (props.color) return props.color

  const clientId = config.value?.clientId ?? 'ac-hub'

  switch (clientId) {
    case 'codemyshop':
      return '#06b6d4' 
    case 'ac-hub':
    default:
      return '#4F46E5' 
  }
})

const gradientId = `logo-grad-${useId()}`
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0"
    data-no-filter
  >
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="resolvedColor" />
        <stop offset="100%" :stop-color="resolvedColor" stop-opacity="0.7" />
      </linearGradient>
    </defs>

    
    <rect
      width="100" height="100" rx="22"
      :fill="`url(#${gradientId})`"
    />

    
    <path
      d="M50 18L26 78h12l4-12h16l4 12h12L50 18zm-4 38l4-14 4 14h-8z"
      fill="white"
      fill-opacity="0.95"
    />

    
    <rect
      x="30" y="82" width="40" height="4" rx="2"
      fill="white"
      fill-opacity="0.5"
    />
  </svg>
</template>
