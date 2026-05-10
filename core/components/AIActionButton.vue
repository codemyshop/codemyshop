<template>
  <button
    :disabled="isLoading || disabled"
    @click="$emit('click')"
    class="ai-btn group relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden
           rounded-xl px-6 py-3 font-bold text-sm
           transition-all duration-300 ease-out
           active:scale-95
           disabled:cursor-not-allowed disabled:opacity-60"
    :class="[
      isLoading
        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-0'
        : 'bg-primary-600 dark:bg-indigo-600 text-primary-50 dark:text-indigo-100 border border-primary-700/50 dark:border-white/5 hover:bg-primary-700 dark:hover:bg-indigo-500 hover:shadow-lg hover:shadow-primary-500/25 dark:hover:shadow-indigo-500/20',
      sizeClass,
    ]"
  >
    <!-- Glow aura (visible uniquement en loading) -->
    <Transition
      enter-active-class="transition-opacity duration-500"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-to-class="opacity-0"
    >
      <span
        v-if="isLoading"
        class="absolute -inset-2 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 blur-2xl animate-glow"
        aria-hidden="true"
      />
    </Transition>

    <!-- Shimmer sweep (loading) -->
    <span
      v-if="isLoading"
      class="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
      aria-hidden="true"
    />

    <!-- Contenu -->
    <span class="relative z-10 flex items-center gap-2.5">
      <!-- Spinner (loading) -->
      <span v-if="isLoading" class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />

      <!-- AI icon (idle) -->
      <slot v-else name="icon">
        <svg class="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </slot>

      <!-- Texte -->
      <span class="truncate">
        {{ isLoading ? loadingLabel : label }}
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 *
 * AIActionButton — Premium button for AI actions.
 * Animated glow during loading, compliant with DESIGN.md.
 */

interface Props {
  label?:        string
  loadingLabel?: string
  isLoading?:    boolean
  disabled?:     boolean
  size?:         'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  label:        'Générer avec l\'IA',
  loadingLabel: 'Génération en cours…',
  isLoading:    false,
  disabled:     false,
  size:         'md',
})

defineEmits<{ click: [] }>()

const sizeClass = computed(() => ({
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-base',
}[props.size]))
</script>

<style scoped>
/* Glow pulsation — cycle lent et organique */
@keyframes glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.05); }
}
.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Shimmer sweep — reflet glissant */
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s ease-in-out infinite;
}
</style>
