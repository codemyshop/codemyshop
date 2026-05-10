<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Logo polymorphe CodeMyShop — s'adapte au tenant via la couleur.
  Usage : <AppLogo :size="40" />
  La couleur est déterminée automatiquement par le clientId du tenant.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: number
  color?: string
}>(), {
  size: 40,
  color: '',
})

const { config } = useClientDetection()

// Default color based on the tenant
const resolvedColor = computed(() => {
  if (props.color) return props.color

  const clientId = config.value?.clientId ?? 'ac-hub'

  switch (clientId) {
    case 'codemyshop':
      return '#06b6d4' // Cyan — PaaS Tech
    case 'ac-hub':
    default:
      return '#4F46E5' // Indigo — Founder Brand
  }
})

// Unique stable gradient ID SSR/client (prevents hydration mismatch)
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

    <!-- Fond arrondi -->
    <rect
      width="100" height="100" rx="22"
      :fill="`url(#${gradientId})`"
    />

    <!-- Stylized letter A (geometric) -->
    <path
      d="M50 18L26 78h12l4-12h16l4 12h12L50 18zm-4 38l4-14 4 14h-8z"
      fill="white"
      fill-opacity="0.95"
    />

    <!-- Accent bar (signature) -->
    <rect
      x="30" y="82" width="40" height="4" rx="2"
      fill="white"
      fill-opacity="0.5"
    />
  </svg>
</template>
