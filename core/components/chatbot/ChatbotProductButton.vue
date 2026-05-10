<template>
  <!-- Petit bouton "Discuter de ce produit" — placé sur la fiche produit
       et la carte produit en liste. Émet l'event global `chatbot:open`
       avec scenario='product' + productId pour ouvrir le widget global avec
       contexte produit. Pas de modal local : 1 seul widget global.
       Gated par la feature `chatbot` côté marketplace — invisible si OFF. -->
  <button
    v-if="chatbotEnabled"
    type="button"
    @click.stop.prevent="openChat"
    :class="variantClass"
    :title="`Demander des infos sur ce produit`"
  >
    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
    <span v-if="variant !== 'icon'">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

const props = withDefaults(defineProps<{
  productId: number | string
  /** Qty pre-filled on the parent component (selector +/-). If > 1, we skip
   * the qty question from the chatbot and start directly on the frequency. */
  qty?:      number | string
  label?:    string
  variant?:  'card' | 'detail' | 'icon'
}>(), {
  qty:     1,
  label:   'Besoin d\'infos sur ce produit ?',
  variant: 'card',
})

const { hasFeature } = useFeatureFlag()
const chatbotEnabled = computed(() => hasFeature('chatbot'))

const variantClass = computed(() => {
  const base = 'inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50'
  if (props.variant === 'icon') {
    return base + ' w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50'
  }
  if (props.variant === 'detail') {
    return base + ' h-11 px-4 rounded-lg bg-white dark:bg-slate-800 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 text-sm font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/30'
  }
  // 'card' — compact button that aligns with "Add to cart"
  return base + ' h-9 px-3 rounded-lg border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 bg-white dark:bg-slate-800 text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-900/30 whitespace-nowrap'
})

function openChat() {
  if (!import.meta.client) return
  const qty = Number(props.qty) || 1
  window.dispatchEvent(new CustomEvent('chatbot:open', {
    detail: {
      scenario:  'product',
      productId: Number(props.productId) || null,
      qty:       qty > 1 ? qty : null,
    },
  }))
}
</script>
