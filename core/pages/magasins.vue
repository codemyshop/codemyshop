
<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
const target = `/skateshop/${route.hash || ''}`
await navigateTo(target, { redirectCode: 301 })
</script>

<template><div /></template>
