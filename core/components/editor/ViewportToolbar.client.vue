<!--
  Toolbar device (desktop / tablet / mobile + rotation portrait↔paysage)
  affichée en haut du preview quand le builder est actif.
  Le live view respecte la largeur + hauteur choisies via wrapper dans white-label.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import type { ViewportMode } from '~/composables/useEditorViewport'

const {
  mode, setMode,
  orientation, toggleOrientation, canRotate,
  currentWidth, currentHeight,
} = useEditorViewport()

const buttons: Array<{ id: ViewportMode; label: string }> = [
  { id: 'mobile',  label: 'Mobile' },
  { id: 'tablet',  label: 'Tablette' },
  { id: 'desktop', label: 'Desktop' },
]
</script>

<template>
  <div
    class="sticky top-0 z-[100] flex items-center justify-center gap-1 py-2 px-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
    role="toolbar"
    aria-label="Mode d'affichage"
  >
    <button
      v-for="b in buttons"
      :key="b.id"
      type="button"
      :aria-pressed="mode === b.id"
      :aria-label="b.label"
      :title="b.label"
      :class="[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        mode === b.id
          ? 'bg-gray-900 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900',
      ]"
      @click="setMode(b.id)"
    >
      <!-- Mobile icon -->
      <svg v-if="b.id === 'mobile'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
      <!-- Tablet icon -->
      <svg v-else-if="b.id === 'tablet'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
      <!-- Desktop icon -->
      <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <rect x="2" y="4" width="20" height="12" rx="2" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="12" y1="16" x2="12" y2="20" />
      </svg>
      <span class="hidden sm:inline">{{ b.label }}</span>
    </button>

    <!-- Bouton rotation (visible uniquement en mobile / tablette) -->
    <button
      v-if="canRotate"
      type="button"
      :aria-label="`Passer en ${orientation === 'portrait' ? 'paysage' : 'portrait'}`"
      :title="orientation === 'portrait' ? 'Basculer en paysage' : 'Basculer en portrait'"
      class="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-all"
      @click="toggleOrientation"
    >
      <svg
        class="w-4 h-4 transition-transform duration-300"
        :class="orientation === 'landscape' ? 'rotate-90' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </button>

    <!-- Dimensions actuelles -->
    <span
      v-if="currentWidth && currentHeight"
      class="ml-3 text-[10px] font-mono text-gray-400 tabular-nums"
      aria-hidden="true"
    >{{ currentWidth }} × {{ currentHeight }}</span>
  </div>
</template>
