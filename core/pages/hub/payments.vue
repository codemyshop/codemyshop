<!--
  /hub/payments — Paiements (CB SystemPay + virement bancaire).

  Sources :
    - ps_configuration : BANK_WIRE_OWNER, BANK_WIRE_DETAILS, BANK_WIRE_ADDRESS,
      BANK_WIRE_CUSTOM_TEXT, SYSTEMPAY_MODE
    - .env du VPS : SYSTEMPAY_ID_SHOP, SYSTEMPAY_TEST_KEY, SYSTEMPAY_PROD_KEY
      (présence seulement, jamais exposées)

  Runtime PostgreSQL via useClientDb sur la DB du tenant courant. Toute
  modification va directement en DB, pas de redeploy nécessaire.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const { t } = useHubT()

interface PaymentConfig {
  BANK_WIRE_OWNER: string
  BANK_WIRE_DETAILS: string
  BANK_WIRE_ADDRESS: string
  BANK_WIRE_CUSTOM_TEXT: string
  SYSTEMPAY_MODE: string
}
interface PaymentKeys {
  SYSTEMPAY_ID_SHOP: boolean
  SYSTEMPAY_TEST_KEY: boolean
  SYSTEMPAY_PROD_KEY: boolean
}

const { data: paymentData, refresh: refreshPayment } = await useFetch<{ config: PaymentConfig; keys: PaymentKeys }>('/api/hub/configuration/payment', {
  key: 'hub-configuration-payment',
})

const paymentForm = reactive<PaymentConfig>({
  BANK_WIRE_OWNER: '',
  BANK_WIRE_DETAILS: '',
  BANK_WIRE_ADDRESS: '',
  BANK_WIRE_CUSTOM_TEXT: '',
  SYSTEMPAY_MODE: 'TEST',
})

watchEffect(() => {
  const c = paymentData.value?.config
  if (!c) return
  Object.assign(paymentForm, c)
})

const savingPayment = ref<keyof PaymentConfig | null>(null)
const savedMessage = ref<string>('')
const errorMessage = ref<string>('')

async function savePayment(key: keyof PaymentConfig) {
  savingPayment.value = key
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await $fetch('/api/hub/configuration/payment', {
      method: 'POST',
      body: { name: key, value: paymentForm[key] },
    })
    savedMessage.value = t('hub.field_saved', 'Champ enregistré')
    setTimeout(() => { savedMessage.value = '' }, 2000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? 'Erreur'
    await refreshPayment()
  } finally {
    savingPayment.value = null
  }
}

async function setSystempayMode(newMode: 'TEST' | 'PROD') {
  if (paymentForm.SYSTEMPAY_MODE === newMode) return
  paymentForm.SYSTEMPAY_MODE = newMode
  await savePayment('SYSTEMPAY_MODE')
}

const systempayTestCards = [
  { brand: 'Visa',          number: '4970 1000 0000 0003', cvv: '123', exp: '12/30', result: 'Paiement accepté' },
  { brand: 'Visa',          number: '4970 1100 0000 0014', cvv: '123', exp: '12/30', result: '3DS authentification puis accepté' },
  { brand: 'Visa',          number: '4970 1000 0000 0144', cvv: '123', exp: '12/30', result: 'Refus carte (insuffisant)' },
  { brand: 'Mastercard',    number: '5970 1000 0000 0008', cvv: '123', exp: '12/30', result: 'Paiement accepté' },
  { brand: 'Mastercard',    number: '5970 1100 0000 0019', cvv: '123', exp: '12/30', result: '3DS authentification puis accepté' },
  { brand: 'CB',            number: '4970 1010 0000 0008', cvv: '123', exp: '12/30', result: 'Paiement accepté' },
]

useHead({ title: `Paiements — Hub` })
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('hub.payments_title', 'Paiements') }}</h1>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        {{ t('hub.payments_subtitle', 'Configuration des moyens de paiement du tenant : carte bancaire (SystemPay) et virement bancaire.') }}
      </p>
    </div>

    <!-- Toast save / error -->
    <div v-if="savedMessage" class="mb-4 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
      {{ savedMessage }}
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
      {{ errorMessage }}
    </div>

    <div class="space-y-6">

      <!-- Section Virement bancaire -->
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_bankwire_title', 'Virement bancaire (RIB)') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_bankwire_subtitle', 'Coordonnées affichées sur la page de confirmation et dans l\'email de commande quand le client paie par virement. Stocké dans ps_configuration (BANK_WIRE_*).') }}
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('hub.field_bank_owner', 'Bénéficiaire') }}</label>
            <input
              v-model="paymentForm.BANK_WIRE_OWNER"
              type="text"
              :placeholder="t('hub.placeholder_company_name', 'Ma Société')"
              maxlength="100"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingPayment === 'BANK_WIRE_OWNER'"
              @blur="savePayment('BANK_WIRE_OWNER')"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_bank_details', 'Coordonnées (IBAN / BIC)') }}
              <span class="text-gray-400 font-normal">· {{ paymentForm.BANK_WIRE_DETAILS.length }}/500</span>
            </label>
            <textarea
              v-model="paymentForm.BANK_WIRE_DETAILS"
              rows="3"
              maxlength="500"
              placeholder="IBAN: FR76 1751 5900 0008 0085 5269 525&#10;BIC: CEPAFRPP751"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingPayment === 'BANK_WIRE_DETAILS'"
              @blur="savePayment('BANK_WIRE_DETAILS')"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('hub.field_bank_address', 'Adresse banque') }}</label>
            <textarea
              v-model="paymentForm.BANK_WIRE_ADDRESS"
              rows="2"
              maxlength="500"
              placeholder="CTRE D AFF ENTREP LOGNES&#10;1 BOULEVARD MALVOISINE&#10;77185 LOGNES"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingPayment === 'BANK_WIRE_ADDRESS'"
              @blur="savePayment('BANK_WIRE_ADDRESS')"
            />
          </div>
        </div>
      </section>

      <!-- Section SystemPay (CB) -->
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-start justify-between gap-4 mb-1">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('hub.section_systempay_title', 'SystemPay (CB)') }}</h2>
          <span
            class="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            :class="paymentForm.SYSTEMPAY_MODE === 'PROD'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'"
          >
            {{ paymentForm.SYSTEMPAY_MODE || 'TEST' }}
          </span>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_systempay_subtitle', 'Paiement carte bancaire via SystemPay (Lyra Network — Banque Populaire / Crédit Agricole). Mode TEST = redirection sandbox sans débit réel ; PROD = vrais paiements.') }}
        </p>

        <!-- Switch TEST / PROD -->
        <div class="flex items-center gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
          <button
            type="button"
            class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors"
            :class="paymentForm.SYSTEMPAY_MODE === 'TEST' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
            :disabled="savingPayment === 'SYSTEMPAY_MODE'"
            @click="setSystempayMode('TEST')"
          >TEST (sandbox)</button>
          <button
            type="button"
            class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors"
            :class="paymentForm.SYSTEMPAY_MODE === 'PROD' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
            :disabled="savingPayment === 'SYSTEMPAY_MODE'"
            @click="setSystempayMode('PROD')"
          >PROD (réel)</button>
        </div>

        <!-- Key presence (read-only) -->
        <div class="mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
          <p class="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3">{{ t('hub.systempay_keys', 'Clés API (.env du VPS)') }}</p>
          <dl class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_ID_SHOP</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_ID_SHOP" class="text-emerald-600 dark:text-emerald-400 font-medium">✓ configuré</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">✗ manquant</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_TEST_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_TEST_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">✓ configuré</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">✗ manquant</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_PROD_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_PROD_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">✓ configuré</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">✗ manquant</span>
              </dd>
            </div>
          </dl>
          <p class="mt-3 text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
            {{ t('hub.systempay_keys_note', 'Les clés vivent dans le `.env` du VPS (jamais en DB). Pour les modifier : SSH + édition manuelle + redeploy.') }}
          </p>
        </div>

        <!-- Cartes de test (visible seulement en TEST) -->
        <div v-if="paymentForm.SYSTEMPAY_MODE === 'TEST'" class="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
          <p class="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {{ t('hub.systempay_test_cards', 'Cartes de test SystemPay') }}
          </p>
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-500/70 border-b border-amber-200/50 dark:border-amber-500/20">
                <th class="pb-2 font-medium">Marque</th>
                <th class="pb-2 font-medium">Numéro</th>
                <th class="pb-2 font-medium">CVV</th>
                <th class="pb-2 font-medium">Exp.</th>
                <th class="pb-2 font-medium">Résultat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/30 dark:divide-amber-500/10">
              <tr v-for="card in systempayTestCards" :key="card.number">
                <td class="py-2 text-amber-900 dark:text-amber-200">{{ card.brand }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200 select-all">{{ card.number }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200">{{ card.cvv }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200">{{ card.exp }}</td>
                <td class="py-2 text-amber-700 dark:text-amber-400">{{ card.result }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-3 text-[11px] text-amber-700 dark:text-amber-500/70 leading-relaxed">
            {{ t('hub.systempay_test_cards_note', 'Date d\'expiration future quelconque (ex: 12/30). En mode TEST aucune somme n\'est débitée. Référence officielle Lyra/SystemPay.') }}
          </p>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.payment_note', 'Source : ps_configuration (BANK_WIRE_*, SYSTEMPAY_MODE) + .env du VPS pour les clés sensibles. Lu par /api/payment/systempay-* et /api/checkout/bankwire-details.') }}
      </p>
    </div>
  </div>
</template>
