<!--
  Pagination nav — composant partagé (utilisée en haut ET en bas de grille catégorie).
  Source unique : modifier ce composant propage aux 2 positions.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { localePath } = useLocalePath()
const { t } = useT()
const props = defineProps<{
  currentPage: number
  totalPages: number
  pageWindow: Array<number | '…'>
  pageHref: (p: number) => string
  ariaLabel?: string
  prevLabel?: string
  nextLabel?: string
}>()
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex items-center justify-center gap-1"
    :aria-label="ariaLabel || t('catalogue.pagination_products')"
  >
    <NuxtLink
      v-if="currentPage > 1"
      :to="localePath(pageHref(currentPage - 1))"
      rel="prev"
      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-700"
    >{{ prevLabel || t('catalogue.prev') }}</NuxtLink>

    <template v-for="(p, i) in pageWindow" :key="i">
      <span v-if="p === '…'" class="px-2 text-sm text-slate-400">…</span>
      <NuxtLink
        v-else
        :to="localePath(pageHref(p))"
        :aria-current="p === currentPage ? 'page' : undefined"
        :class="[
          'rounded-lg border px-3 py-2 text-sm font-medium',
          p === currentPage
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'border-slate-200 text-slate-600 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-700',
        ]"
      >{{ p }}</NuxtLink>
    </template>

    <NuxtLink
      v-if="currentPage < totalPages"
      :to="localePath(pageHref(currentPage + 1))"
      rel="next"
      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-700"
    >{{ nextLabel || t('catalogue.next') }}</NuxtLink>
  </nav>
</template>
