<!--
  Page retour SystemPay — /paiement/retour
  Affiche le résultat du paiement CB après redirection depuis SystemPay.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const route = useRoute()

const transStatus = computed(() => String(route.query.vads_trans_status || ''))
const orderRef = computed(() => String(route.query.vads_order_id || ''))
const amount = computed(() => {
  const cents = Number(route.query.vads_amount || 0)
  return (cents / 100).toFixed(2)
})

const isSuccess = computed(() => ['AUTHORISED', 'CAPTURED'].includes(transStatus.value))
const isRefused = computed(() => transStatus.value === 'REFUSED')
const isCancelled = computed(() => ['CANCELLED', 'ABANDONED'].includes(transStatus.value))
</script>

<template>
  <NuxtLayout name="default">
    <div class="min-h-screen bg-gray-50 py-16 px-4">
      <div class="max-w-lg mx-auto">
        <!-- Payment accepted -->
        <div v-if="isSuccess" class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('payment.payment_accepted_title') }}</h1>
          <p class="text-sm text-gray-500 mb-6" v-html="t('payment.payment_accepted_body', 'Votre paiement de <strong class=&quot;text-gray-900&quot;>{amount} €</strong> pour la commande <strong class=&quot;text-gray-900&quot;>#{orderRef}</strong> a été validé.').replace('{amount}', amount).replace('{orderRef}', orderRef)" />
          <p class="text-sm text-gray-500 mb-8">
            {{ t('payment.payment_accepted_note') }}
          </p>
          <NuxtLink to="/" class="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ t('payment.payment_back_to_shop') }}
          </NuxtLink>
        </div>

        <!-- Payment declined -->
        <div v-else-if="isRefused" class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('payment.payment_refused_title') }}</h1>
          <p class="text-sm text-gray-500 mb-6" v-html="t('payment.payment_refused_body', 'Le paiement pour la commande <strong class=&quot;text-gray-900&quot;>#{orderRef}</strong> a été refusé par votre banque.').replace('{orderRef}', orderRef)" />
          <p class="text-sm text-gray-500 mb-8">
            {{ t('payment.payment_refused_note') }}
          </p>
          <NuxtLink to="/panier" class="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ t('payment.payment_back_to_cart') }}
          </NuxtLink>
        </div>

        <!-- Payment cancelled -->
        <div v-else-if="isCancelled" class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('payment.payment_cancelled_title') }}</h1>
          <p class="text-sm text-gray-500 mb-6" v-html="t('payment.payment_cancelled_body', 'Vous avez annulé le paiement pour la commande <strong class=&quot;text-gray-900&quot;>#{orderRef}</strong>.').replace('{orderRef}', orderRef)" />
          <p class="text-sm text-gray-500 mb-8">
            {{ t('payment.payment_cancelled_note') }}
          </p>
          <NuxtLink to="/panier" class="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ t('payment.payment_back_to_cart') }}
          </NuxtLink>
        </div>

        <!-- Statut inconnu -->
        <div v-else class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('payment.payment_unknown_title') }}</h1>
          <p class="text-sm text-gray-500 mb-8">
            {{ t('payment.payment_unknown_body') }}
          </p>
          <NuxtLink to="/" class="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ t('payment.payment_back_to_shop') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
