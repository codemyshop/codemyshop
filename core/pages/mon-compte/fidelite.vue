
<script setup lang="ts">
import type { LoyaltyAccountResponse, LoyaltyTier, LoyaltyTransaction } from '~/server/api/loyalty/account.get'
import type { LoyaltyConvertResponse } from '~/server/api/loyalty/convert.post'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const { loggedIn, customer, checkSession } = useCustomerAuth()

const data = ref<LoyaltyAccountResponse | null>(null)
const loading = ref(true)
const converting = ref(false)
const lastResult = ref<LoyaltyConvertResponse | null>(null)
const errorMsg = ref('')

const formatDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('fr-FR') : ''
const formatPoints = (n: number) => Math.abs(n).toLocaleString('fr-FR')
const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const typeLabel = computed<Record<LoyaltyTransaction['type'], string>>(() => ({
  credit: t('account.account_tx_credit', 'Crédit'),
  debit: t('account.account_tx_debit', 'Conversion'),
  expire: t('account.account_tx_expire', 'Expiration'),
  adjust: t('account.account_tx_adjust', 'Ajustement'),
}))

async function loadAccount() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion?redirect=/mon-compte/fidelite')
  }
  loading.value = true
  errorMsg.value = ''
  try {
    data.value = await $fetch<LoyaltyAccountResponse>('/api/loyalty/account')
  } catch (e: any) {
    errorMsg.value = getApiErrorMessage(e, t)
  } finally {
    loading.value = false
  }
}

async function convert(tier: LoyaltyTier) {
  if (!tier.affordable || converting.value) return
  converting.value = true
  errorMsg.value = ''
  lastResult.value = null
  try {
    const res = await $fetch<LoyaltyConvertResponse>('/api/loyalty/convert', {
      method: 'POST',
      body: { multiplier: tier.multiplier },
    })
    lastResult.value = res
    if (res.success) {
      await loadAccount()
    } else {
      errorMsg.value = res.error || t('api.error_generic', 'Une erreur est survenue.')
    }
  } catch (e: any) {
    errorMsg.value = getApiErrorMessage(e, t)
  } finally {
    converting.value = false
  }
}

async function copyCode(code: string, ev: MouseEvent) {
  const btn = ev.currentTarget as HTMLButtonElement
  const originalText = btn.textContent
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = code; ta.style.position = 'fixed'; ta.style.left = '-9999px'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }
  btn.textContent = '✓ Copié'
  btn.classList.add('!bg-emerald-700')
  setTimeout(() => {
    btn.textContent = originalText
    btn.classList.remove('!bg-emerald-700')
  }, 1600)
}

onMounted(loadAccount)

useHead({ title: t('account.account_fidelity_title', 'Mes points de fidélité') })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        
        <div class="flex items-center justify-between mb-8">
          <div>
            <NuxtLink to="/mon-compte" class="text-xs text-gray-400 hover:text-primary-600">{{ t('account.account_back_link', '← Mon compte') }}</NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900 mt-1">{{ t('account.account_fidelity_page_title', 'Mes points de fidélité') }}</h1>
          </div>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('common.common_loading', 'Chargement…') }}</div>

        <template v-else-if="data">
          
          <div class="bg-white rounded-xl p-6 border border-gray-100 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-wider text-gray-400 mb-1">{{ t('account.account_balance_label', 'Solde actuel') }}</p>
                <p class="text-4xl font-bold text-gray-900">{{ formatPoints(data.balance) }} <span class="text-lg font-normal text-gray-500">{{ t('account.account_points_unit', 'points') }}</span></p>
                <p class="text-xs text-gray-400 mt-2">
                  {{ t('account.account_earned_label', 'Total gagné') }}&nbsp;: <strong class="text-gray-600">{{ formatPoints(data.totalEarned) }}</strong>
                  &nbsp;·&nbsp;
                  {{ t('account.account_spent_label', 'Total utilisé') }}&nbsp;: <strong class="text-gray-600">{{ formatPoints(data.totalSpent) }}</strong>
                </p>
              </div>
              <div class="hidden sm:flex items-center justify-center w-20 h-20 rounded-full bg-primary-50 text-primary-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                </svg>
              </div>
            </div>
          </div>

          
          <div v-if="lastResult?.success" class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">✓</div>
              <div>
                <p class="font-semibold text-emerald-900">{{ t('account.account_voucher_ready_title', 'Votre bon de réduction est prêt') }}</p>
                <p class="text-sm text-emerald-800 mt-1">
                  {{ t('account.account_voucher_code_label', 'Code à saisir au panier :') }}
                  <code class="bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono text-emerald-900 ml-1">{{ lastResult.code }}</code>
                </p>
                <p class="text-xs text-emerald-700 mt-2">
                  {{ t('account.account_voucher_amount_label', 'Montant') }}&nbsp;: <strong>{{ formatEur(lastResult.valueEur || 0) }}</strong>
                  &nbsp;·&nbsp;
                  {{ t('account.account_voucher_valid_label', 'Valable jusqu\'au') }} <strong>{{ formatDate(lastResult.validUntil) }}</strong>
                  &nbsp;·&nbsp;
                  {{ t('account.account_voucher_non_cumul', 'Non cumulable avec un autre code promo.') }}
                </p>
              </div>
            </div>
          </div>

          
          <div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-800">
            {{ errorMsg }}
          </div>

          
          <div class="bg-white rounded-xl p-6 border border-gray-100 mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-1">{{ t('account.account_convert_title', 'Convertir mes points') }}</h2>
            <p class="text-sm text-gray-500 mb-5">
              {{ t('account.account_convert_subtitle', 'Chaque conversion génère un bon nominatif valable {days} jours. Non cumulable avec un autre code promo.').replace('{days}', String(data.config.validityDays)) }}
            </p>

            <div class="grid sm:grid-cols-2 gap-4">
              <button
                v-for="tier in data.tiers"
                :key="tier.multiplier"
                :disabled="!tier.affordable || converting"
                class="text-left rounded-lg border-2 p-5 transition-all"
                :class="tier.affordable
                  ? 'border-primary-600 bg-primary-50 hover:bg-primary-100 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'"
                @click="convert(tier)"
              >
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-xl font-bold" :class="tier.affordable ? 'text-primary-700' : 'text-gray-500'">
                    {{ formatPoints(tier.points) }} pts
                  </span>
                  <span class="text-sm text-gray-500">→</span>
                  <span class="text-xl font-bold" :class="tier.affordable ? 'text-emerald-700' : 'text-gray-500'">
                    {{ formatEur(tier.valueEur) }}
                  </span>
                </div>
                <p v-if="tier.affordable" class="text-xs text-primary-700">
                  {{ converting ? t('account.account_convert_loading', 'Conversion en cours…') : t('account.account_convert_button_label', 'Cliquer pour convertir') }}
                </p>
                <p v-else class="text-xs text-gray-400">
                  {{ t('account.account_convert_missing_points', 'Il manque {missing} points.').replace('{missing}', formatPoints(tier.points - data.balance)) }}
                </p>
              </button>
            </div>
          </div>

          
          <div class="grid lg:grid-cols-12 gap-6">
          <div class="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-7">
            <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('account.account_history_title', 'Historique') }}</h2>
            <div v-if="data.transactions.length === 0" class="text-sm text-gray-400 py-6 text-center">
              {{ t('account.account_history_empty', 'Aucune transaction pour le moment. Passez commande pour commencer à gagner des points.') }}
            </div>
            <div v-else class="divide-y divide-gray-100">
              <div v-for="tx in data.transactions" :key="tx.id" class="py-3 flex items-center justify-between text-sm">
                <div>
                  <p class="font-medium text-gray-800">
                    <span
                      class="inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2"
                      :class="{
                        'bg-emerald-100 text-emerald-700': tx.type === 'credit',
                        'bg-blue-100 text-blue-700': tx.type === 'debit',
                        'bg-gray-200 text-gray-700': tx.type === 'expire',
                        'bg-amber-100 text-amber-700': tx.type === 'adjust',
                      }"
                    >{{ typeLabel[tx.type] }}</span>
                    <span v-if="tx.idOrder && tx.idOrder > 0">{{ t('account.account_tx_order', 'Commande #') }}{{ tx.idOrder }}</span>
                    <span v-else-if="tx.cartRuleCode">
                      {{ t('account.account_tx_voucher', 'Bon') }} <code class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ tx.cartRuleCode }}</code>
                      <span v-if="tx.cartRuleAmount" class="text-gray-500"> ({{ formatEur(tx.cartRuleAmount) }})</span>
                    </span>
                    <span v-else-if="tx.type === 'adjust'" class="text-gray-500">{{ t('account.account_tx_admin_adjust', 'Ajustement administrateur') }}</span>
                    <span v-else-if="tx.type === 'expire'" class="text-gray-500">{{ t('account.account_tx_expired', 'Points expirés') }}</span>
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ formatDate(tx.dateAdd) }}
                    <span v-if="tx.expiresAt && tx.type === 'credit'">
                      {{ t('account.account_expiry_label', '· Expire le {date}').replace('{date}', formatDate(tx.expiresAt)) }}
                    </span>
                  </p>
                </div>
                <div
                  class="font-semibold whitespace-nowrap"
                  :class="tx.points > 0 ? 'text-emerald-600' : 'text-gray-700'"
                >
                  {{ tx.points > 0 ? '+' : '−' }}{{ formatPoints(tx.points) }} pts
                </div>
              </div>
            </div>
          </div>

          
          <div class="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-5">
            <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('account.account_vouchers_title', 'Mes bons de fidélité') }}</h2>
            <div v-if="!data.vouchers || data.vouchers.length === 0" class="text-sm text-gray-400 py-6 text-center">
              {{ t('account.account_vouchers_empty', 'Aucun bon pour le moment. Convertissez vos points pour générer votre premier bon.') }}
            </div>
            <div v-else class="space-y-3">
              
              <div
                v-for="v in data.vouchers"
                :key="v.code"
                :class="v.status === 'active'
                  ? 'bg-emerald-50 border border-emerald-200 rounded-xl p-4'
                  : v.status === 'used'
                    ? 'bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-80'
                    : 'bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 opacity-60'"
              >
                <div class="flex items-center justify-between mb-2">
                  <span
                    class="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                    :class="v.status === 'active'
                      ? 'bg-emerald-200 text-emerald-800'
                      : v.status === 'used'
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-gray-200 text-gray-500'"
                  >
                    {{ v.status === 'active' ? t('account.account_voucher_status_active', 'Actif') : v.status === 'used' ? t('account.account_voucher_status_used', 'Utilisé') : t('account.account_voucher_status_expired', 'Expiré') }}
                  </span>
                  <strong
                    class="text-base"
                    :class="v.status === 'active' ? 'text-emerald-700' : v.status === 'expired' ? 'text-gray-400 line-through' : 'text-gray-600'"
                  >
                    {{ formatEur(v.amount) }}
                  </strong>
                </div>
                <div v-if="v.status === 'active'" class="flex gap-2 items-center">
                  <code class="flex-1 bg-white border border-dashed border-emerald-300 px-2 py-1.5 rounded text-emerald-800 font-mono text-sm font-bold">{{ v.code }}</code>
                  <button
                    type="button"
                    class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded transition-colors"
                    @click="copyCode(v.code, $event)"
                  >
                    {{ t('account.account_copy_button', 'Copier') }}
                  </button>
                </div>
                <code v-else class="font-mono text-xs" :class="v.status === 'expired' ? 'text-gray-400 line-through' : 'text-gray-500'">{{ v.code }}</code>
                <p class="text-xs mt-2" :class="v.status === 'active' ? 'text-gray-500' : 'text-gray-400'">
                  <template v-if="v.status === 'active'">{{ t('account.account_voucher_expires_label', 'Expire le {date}').replace('{date}', formatDate(v.dateTo)) }}</template>
                  <template v-else-if="v.status === 'used'">{{ t('account.account_voucher_used_label', 'Utilisé sur commande #{id}').replace('{id}', String(v.idOrder)) }}</template>
                  <template v-else>{{ t('account.account_voucher_expired_label', 'Expiré le {date}').replace('{date}', formatDate(v.dateTo)) }}</template>
                </p>
              </div>
            </div>
          </div>
          </div>
        </template>

      </div>
    </div>
  </NuxtLayout>
</template>
