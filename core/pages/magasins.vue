<!--
  Redirect 301 /magasins/ → /skateshop/ (rename SEO 2026-05-09).
  Préserve les backlinks éventuels (footer pre-rename, indexation Google,
  bookmarks utilisateur).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
const target = `/skateshop/${route.hash || ''}`
await navigateTo(target, { redirectCode: 301 })
</script>

<template><div /></template>
