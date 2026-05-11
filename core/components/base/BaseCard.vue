
<script setup lang="ts">
withDefaults(defineProps<{
  glow?: boolean
  padding?: string
}>(), {
  glow: false,
  padding: 'p-6 sm:p-8',
})
</script>

<template>
  <div class="relative group">
    
    <div
      v-if="glow"
      class="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-700"
      style="background-size: 200% 200%; animation: borderGlow 4s ease-in-out infinite;"
    />
    
    <div
      v-if="glow"
      class="absolute -inset-8 bg-primary-500/10 dark:bg-primary-500/5 rounded-3xl blur-2xl pointer-events-none"
    />
    <div
      :class="[
        'relative rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl dark:shadow-2xl shadow-gray-200/50 dark:shadow-black/30',
        padding,
      ]"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
@keyframes borderGlow {
  0%, 100% { background-position: 0% 50%; opacity: 0.2; }
  50% { background-position: 100% 50%; opacity: 0.5; }
}
</style>
