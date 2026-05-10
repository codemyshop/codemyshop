<!--
  Mon compte — Carnet d'adresses
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import type { AddressData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const brandName = String((_cfg.public as any).brandName ?? '')
const { customer, checkSession } = useCustomerAuth()
const { isB2b } = useB2bVisibility()
const addresses = ref<AddressData[]>([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const form = reactive({
  company: '', firstname: '', lastname: '',
  address1: '', address2: '', postcode: '', city: '', phone: '',
  countryId: 8,
})

function resetForm() {
  Object.assign(form, { company: '', firstname: '', lastname: '', address1: '', address2: '', postcode: '', city: '', phone: '', countryId: 8 })
  editingId.value = null
}

function startEdit(addr: AddressData) {
  editingId.value = addr.id ?? null
  Object.assign(form, {
    company: addr.company || '',
    firstname: addr.firstname || '',
    lastname: addr.lastname || '',
    address1: addr.address1 || '',
    address2: addr.address2 || '',
    postcode: addr.postcode || '',
    city: addr.city || '',
    phone: addr.phone || '',
    countryId: addr.countryId || 8,
  })
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  resetForm()
}

async function deleteAddress(addr: AddressData) {
  if (!addr.id) return
  if (!confirm(`Supprimer l'adresse « ${addr.company || addr.alias || `${addr.firstname} ${addr.lastname}`} » ?`)) return
  deletingId.value = addr.id
  try {
    await $fetch(`/api/catalogue/customer/addresses/${addr.id}`, { method: 'DELETE' })
    addresses.value = addresses.value.filter(a => a.id !== addr.id)
  } catch { /* ignore */ }
  finally { deletingId.value = null }
}
const countries = ref<{ id: number; name: string }[]>([])
onMounted(async () => {
  try {
    countries.value = await $fetch<{ id: number; name: string }[]>('/api/catalogue/countries', { query: { clientId } })
  } catch { /* fallback France */ }
})

async function loadAddresses() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion')
  }
  loading.value = true
  try {
    addresses.value = await $fetch<AddressData[]>('/api/catalogue/customer/addresses', {
      query: { customerId: customer.value!.customerId },
    })
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function onSaveAddress() {
  if (!customer.value) return
  saving.value = true
  try {
    const payload = {
      firstname: form.firstname || customer.value.firstname,
      lastname: form.lastname || customer.value.lastname,
      company: form.company, address1: form.address1,
      address2: form.address2, postcode: form.postcode,
      city: form.city, phone: form.phone,
      countryId: form.countryId,
    }
    if (editingId.value) {
      const updated = await $fetch<AddressData>(`/api/catalogue/customer/addresses/${editingId.value}`, {
        method: 'PUT',
        body: payload,
      })
      const idx = addresses.value.findIndex(a => a.id === editingId.value)
      if (idx >= 0) addresses.value[idx] = updated
    } else {
      const addr = await $fetch<AddressData>('/api/catalogue/customer/addresses', {
        method: 'POST',
        body: { ...payload, customerId: customer.value.customerId, alias: 'Livraison' },
      })
      addresses.value.push(addr)
    }
    showForm.value = false
    resetForm()
  } catch { /* ignore */ }
  finally { saving.value = false }
}

onMounted(loadAddresses)
useHead({ title: brandName ? `Mes adresses — ${brandName}` : 'Mes adresses' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <NuxtLink to="/mon-compte" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">{{ t('account.addresses_title') }}</h1>
          </div>
          <button v-if="!showForm" class="text-sm text-primary-600 hover:underline" @click="showForm = true">+ {{ t('account.addresses_add') }}</button>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading') }}</div>

        <div v-else class="space-y-4">
          <!-- Adresses existantes -->
          <div v-for="addr in addresses" :key="addr.id" class="bg-white rounded-xl p-5 border border-gray-100 flex justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-gray-900">{{ addr.company || `${addr.firstname} ${addr.lastname}` }}</p>
              <p class="text-sm text-gray-600">{{ addr.address1 }}</p>
              <p v-if="addr.address2" class="text-sm text-gray-600">{{ addr.address2 }}</p>
              <p class="text-sm text-gray-600">{{ addr.postcode }} {{ addr.city }}</p>
              <p v-if="addr.phone" class="text-xs text-gray-400 mt-1">{{ addr.phone }}</p>
            </div>
            <div class="shrink-0 flex flex-col gap-2 text-xs">
              <button
                class="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-primary-600 hover:text-primary-600 transition-colors"
                @click="startEdit(addr)"
              >Éditer</button>
              <button
                :disabled="deletingId === addr.id"
                class="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-400 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
                @click="deleteAddress(addr)"
              >{{ deletingId === addr.id ? '…' : 'Supprimer' }}</button>
            </div>
          </div>

          <!-- New/edit address form -->
          <form v-if="showForm" class="bg-white rounded-xl p-6 border border-primary-600 space-y-4" @submit.prevent="onSaveAddress">
            <h2 class="text-sm font-bold text-gray-900">{{ editingId ? 'Modifier l\'adresse' : t('account.addresses_new_title') }}</h2>
            <div v-if="isB2b">
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_company') }}</label>
              <input v-model="form.company" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_firstname') }}</label>
                <input v-model="form.firstname" type="text" required :placeholder="customer?.firstname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_lastname') }}</label>
                <input v-model="form.lastname" type="text" required :placeholder="customer?.lastname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.addresses_label_address') }}</label>
              <input v-model="form.address1" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.addresses_label_postcode') }}</label>
                <input v-model="form.postcode" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.addresses_label_city') }}</label>
                <input v-model="form.city" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.addresses_label_country') }}</label>
              <select v-model="form.countryId" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none bg-white">
                <option v-if="!countries.length" :value="8">France</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.addresses_label_phone') }}</label>
              <input v-model="form.phone" type="tel" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="flex gap-3">
              <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="cancelForm">{{ t('account.addresses_cancel') }}</button>
              <button type="submit" :disabled="saving" class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ saving ? t('account.addresses_saving') : t('account.addresses_save') }}
              </button>
            </div>
          </form>

          <div v-if="!addresses.length && !showForm" class="text-center py-12 text-gray-400 text-sm">
            <p>{{ t('account.addresses_empty') }}</p>
            <button class="mt-3 text-primary-600 hover:underline text-sm" @click="showForm = true">{{ t('account.addresses_add_link') }}</button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
