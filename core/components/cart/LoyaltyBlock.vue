<!--
  Bloc fidélité affiché dans le résumé du panier (B2B connecté).
  - Visiteur non connecté : ne rend rien.
  - Connecté : solde actuel + estimation gain pour la commande en cours + lien.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import type { LoyaltyAccountResponse } from '~/server/api/loyalty/account.get'

const props = defineProps<{ totalTtc: number }>()

const { t } = useT()
const { customer, checkSession } = useCustomerAuth()
const data = ref<LoyaltyAccountResponse | null>(null)
const loading = ref(false)

async function load() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return
  }
  loading.value = true
  try {
    data.value = await $fetch<LoyaltyAccountResponse>('/api/loyalty/account')
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)

const ratio = computed(() => data.value?.config.ratio ?? 1)
const tierPoints = computed(() => data.value?.config.tierPoints ?? 5000)
const tierValue = computed(() => data.value?.config.tierValue ?? 150)
const balance = computed(() => data.value?.balance ?? 0)
const earnedHere = computed(() => Math.floor(props.totalTtc * ratio.value))
const balanceAfter = computed(() => balance.value + earnedHere.value)
const pointsToNextTier = computed(() => {
  if (!data.value) return null
  const next = (Math.floor(balanceAfter.value / tierPoints.value) + 1) * tierPoints.value
  return Math.max(0, next - balanceAfter.value)
})
const formatPts = (n: number) => Math.abs(n).toLocaleString('fr-FR')
const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
</script>

<template>
  <div v-if="customer && data" class="border-t border-gray-200 mt-4 pt-4">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900">{{ t('cart.loyalty.title') }}</p>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ t('cart.loyalty.balance_label') }}&nbsp;<strong class="text-gray-800">{{ t('cart.loyalty.points_with_unit', { points: formatPts(balance) }) }}</strong>
          <span v-if="earnedHere > 0">
            · <span class="text-emerald-600">{{ t('cart.loyalty.earn_here_short', { points: formatPts(earnedHere) }) }}</span>
          </span>
        </p>
        <p v-if="pointsToNextTier !== null && pointsToNextTier > 0 && earnedHere > 0" class="text-[11px] text-gray-400 mt-1">
          {{ t('cart.loyalty.next_tier', { points: formatPts(pointsToNextTier), value: formatEur(tierValue) }) }}
        </p>
        <p v-else-if="balance >= tierPoints" class="text-[11px] text-emerald-600 mt-1 font-medium">
          {{ t('cart.loyalty.tier_reached', { points: formatPts(tierPoints), value: formatEur(tierValue) }) }}
        </p>
        <NuxtLink to="/mon-compte/fidelite" class="inline-block text-xs text-primary-600 hover:underline mt-1">
          {{ t('cart.loyalty.cta_view_points') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
