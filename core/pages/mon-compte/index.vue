<!--
  Mon compte — Dashboard client
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import type { OrderData, AddressData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const { loggedIn, customer, checkSession, logout } = useCustomerAuth()

const orders = ref<OrderData[]>([])
const addresses = ref<AddressData[]>([])
const wishlistCount = ref(0)
const loading = ref(true)

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

async function loadData() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion')
  }
  loading.value = true
  try {
    const [ordersRes, addrsRes, wlRes] = await Promise.all([
      $fetch<OrderData[]>('/api/orders', { query: { customerId: customer.value!.customerId, clientId, limit: 5 } }),
      $fetch<AddressData[]>('/api/catalogue/customer/addresses', { query: { customerId: customer.value!.customerId } }),
      $fetch<any>('/api/wishlist/lists').catch(() => null),
    ])
    orders.value = ordersRes || []
    addresses.value = addrsRes || []
    const lists = wlRes?.lists || wlRes?.data?.lists || []
    wishlistCount.value = Array.isArray(lists) ? lists.reduce((s: number, l: any) => s + Number(l.item_count || l.itemCount || 0), 0) : 0
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function onLogout() {
  await logout()
  navigateTo('/')
}

onMounted(loadData)

useHead({ title: 'Mon compte — Example Shop' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ t('account.account_title') }}</h1>
            <p v-if="customer" class="text-sm text-gray-500">{{ customer?.firstname }} {{ customer?.lastname }} — {{ customer?.email }}</p>
          </div>
          <button class="text-sm text-gray-400 hover:text-red-500" @click="onLogout">{{ t('account.account_logout') }}</button>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading') }}</div>

        <div v-else class="grid md:grid-cols-2 gap-6">

          <!-- Navigation rapide -->
          <NuxtLink to="/mon-compte/commandes" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_orders') }}</h2>
            <p class="text-sm text-gray-500">{{ orders.length }} commande{{ orders.length > 1 ? 's' : '' }}</p>
            <div v-if="orders.length" class="mt-3 space-y-1">
              <div v-for="o in orders.slice(0, 3)" :key="o.id" class="flex justify-between text-xs text-gray-400">
                <span>#{{ o.reference }} — {{ formatDate(o.dateAdd) }}</span>
                <span class="font-semibold text-gray-600">{{ formatPrice(o.totalPaidTTC) }}</span>
              </div>
            </div>
          </NuxtLink>

          <NuxtLink to="/mon-compte/adresses" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_addresses') }}</h2>
            <p class="text-sm text-gray-500">{{ addresses.length }} adresse{{ addresses.length > 1 ? 's' : '' }}</p>
            <div v-if="addresses.length" class="mt-3 space-y-1">
              <div v-for="a in addresses.slice(0, 2)" :key="a.id" class="text-xs text-gray-400">
                {{ a.company || `${a.firstname} ${a.lastname}` }} — {{ a.postcode }} {{ a.city }}
              </div>
            </div>
          </NuxtLink>

          <NuxtLink to="/mon-compte/profil" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_profile') }}</h2>
            <p class="text-sm text-gray-500">{{ t('account.account_profile_desc') }}</p>
          </NuxtLink>

          <NuxtLink to="/mon-compte/fidelite" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">Mes points de fidélité</h2>
            <p class="text-sm text-gray-500">Solde, historique et conversion en bons de réduction.</p>
          </NuxtLink>

          <NuxtLink to="/favoris" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">Mes favoris</h2>
            <p class="text-sm text-gray-500">{{ wishlistCount }} produit{{ wishlistCount > 1 ? 's' : '' }} dans vos listes</p>
          </NuxtLink>

          <NuxtLink to="/" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_back_to_shop') }}</h2>
            <p class="text-sm text-gray-500">{{ t('account.account_continue_shopping') }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
