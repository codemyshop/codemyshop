<!--
  Bandeau « 1ère commande PROMO5 » réutilisable — drawer + /panier + /commander.
  Visible si client logué + 0 commande validée + pas déjà appliqué.
  Click "Appliquer" → applyPromoCode('PROMO5') direct, sans saisie utilisateur.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Disables fetch (e.g., component not yet mounted). */
  enabled?: boolean
  /** Compact variant: button on the same line as the text (drawer). */
  compact?: boolean
}>(), {
  enabled: true,
  compact: false,
})

const { t } = useT()
const { resolvedClientId } = useClientDetection()
const { loggedIn, customer } = useCustomerAuth()
const { applyPromoCode, discountCode } = useServerCart(resolvedClientId.value)

const ordersCount = ref<number | null>(null)
const applying = ref(false)
const errorMsg = ref<string | null>(null)

async function refresh() {
  if (!props.enabled) return
  if (!loggedIn.value || !customer.value?.customerId) {
    ordersCount.value = null
    return
  }
  try {
    const data = await $fetch<{ count: number }>('/api/orders/count', {
      query: { customerId: customer.value.customerId, clientId: resolvedClientId.value },
    })
    ordersCount.value = Number(data?.count ?? 0)
  } catch { ordersCount.value = null }
}

const isFirstOrder = computed(() => ordersCount.value === 0)
const visible = computed(() => isFirstOrder.value && !discountCode.value)

async function apply() {
  errorMsg.value = null
  applying.value = true
  try {
    await applyPromoCode('PROMO5')
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || t('cart.first_order.error_unavailable')
  } finally {
    applying.value = false
  }
}

onMounted(refresh)
watch([() => props.enabled, () => customer.value?.customerId, loggedIn], refresh)
</script>

<template>
  <div
    v-if="visible"
    :class="[
      'rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2',
      compact ? 'flex items-start gap-2' : 'space-y-2',
    ]"
  >
    <span class="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">🎁</span>
    <div :class="['flex-1 min-w-0', compact ? '' : '']">
      <p class="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
        {{ t('cart.first_order.title') }}
      </p>
      <p
        class="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5"
        v-html="t('cart.first_order.subtitle_html')"
      />
      <p v-if="errorMsg" class="text-[11px] text-red-600 mt-1">{{ errorMsg }}</p>
    </div>
    <button
      type="button"
      :disabled="applying"
      :class="[
        'shrink-0 self-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40',
        compact ? '' : 'ml-auto',
      ]"
      @click="apply"
    >
      {{ applying ? '…' : t('cart.first_order.cta_apply') }}
    </button>
  </div>
</template>
