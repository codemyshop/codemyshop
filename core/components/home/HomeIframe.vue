
<template>
  <section v-if="src" class="w-full bg-white dark:bg-slate-950 py-2">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <iframe
        :src="src"
        :height="height"
        :title="title || 'Widget intégré'"
        loading="lazy"
        frameborder="0"
        scrolling="no"
        marginheight="0"
        marginwidth="0"
        class="w-full block border-0"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  src?: string | null
  height?: number | null
  title?: string | null
}>()

const src = computed(() => props.src || null)
const height = computed(() => Number(props.height) || 200)
const title = computed(() => props.title || '')
</script>
