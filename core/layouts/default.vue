<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <LayoutTheHeader />

    <main class="max-w-5xl mx-auto px-4 pt-8 pb-10">
      <slot />
    </main>

    <LayoutTheFooter />
  </div>
</template>

<script setup lang="ts">
const { fetchMe } = useAuth()
onMounted(fetchMe)
</script>
