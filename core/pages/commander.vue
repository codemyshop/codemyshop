
<script setup lang="ts">
definePageMeta({ layout: false })

const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')
const { loggedIn, customer, login, logout, loading: authLoading, checkSession } = useCustomerAuth()
const {
  items, cartId, totalHT, totalTTC, totalFormatted, totalTTCFormatted,
  subtotalHT, subtotalFormatted,
  discountCode, discountHT, applyPromoCode, removePromoCode,
  initServerCart, clearCart, isServerMode,
  appliedCorseTva,
} = useServerCart(clientId)
const { t } = useHubT()
const {
  step, loading, error,
  addresses, selectedAddressId,
  carriers, selectedCarrierId, selectedCarrier, shippingPrice,
  paymentMethod, createdOrder,
  loadAddresses, createAddress, updateAddress, deleteAddress,
  loadCarriers, placeOrder, goToStep,
} = useCheckout(clientId)

const promoInput = ref('')
const promoError = ref('')
const promoLoading = ref(false)

async function onApplyPromo() {
  if (!promoInput.value.trim()) return
  promoError.value = ''
  promoLoading.value = true
  try {
    await applyPromoCode(promoInput.value.trim())
    promoInput.value = ''
  } catch (err: any) {
    promoError.value = err?.data?.message || t('checkout.checkout_promo_invalid', 'Code invalide')
  } finally {
    promoLoading.value = false
  }
}

async function onRemovePromo() {
  promoLoading.value = true
  try { await removePromoCode() } finally { promoLoading.value = false }
}

const finalTotalTTC = computed(() => Math.max(0, totalTTC.value - discountHT.value) + shippingPrice.value)

const bankwireDetails = ref<{ owner: string; details: string; address: string; customText: string } | null>(null)
async function loadBankwireDetails() {
  try {
    bankwireDetails.value = await $fetch('/api/checkout/bankwire-details', { query: { clientId } })
  } catch {  }
}
watch(() => createdOrder.value, async (o) => {
  if (o && paymentMethod.value === 'bankwire' && !bankwireDetails.value) {
    await loadBankwireDetails()
  }
})

onMounted(async () => {
  
  goToStep('auth')
  await checkSession()
  
  if (loggedIn.value && customer.value) {
    if (!isServerMode.value) {
      await initServerCart(customer.value.customerId)
    }
    await loadAddresses(customer.value.customerId)
    goToStep('address')
  }
})

watch(loggedIn, async (v, oldV) => {
  if (v && !oldV && customer.value) {
    if (!isServerMode.value) {
      await initServerCart(customer.value.customerId)
    }
    if (step.value === 'auth') {
      await loadAddresses(customer.value.customerId)
      goToStep('address')
    }
  }
})

const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')

async function onLogin() {
  loginError.value = ''
  try {
    await login(loginForm.email, loginForm.password)
  } catch (err: any) {
    loginError.value = err.data?.message ?? t('auth.login_error_invalid')
  }
}

async function onContinueAsLoggedIn() {
  if (!customer.value) return
  if (!isServerMode.value) await initServerCart(customer.value.customerId)
  await loadAddresses(customer.value.customerId)
  goToStep('address')
}

async function onLogout() {
  await logout()
  
  
  clearCart()
  loginForm.email = ''
  loginForm.password = ''
}

const addressForm = reactive({
  company: '', firstname: '', lastname: '',
  address1: '', address2: '', postcode: '', city: '',
  phone: '', countryId: 8,
})
const countries = ref<{ id: number; name: string }[]>([])
onMounted(async () => {
  try {
    countries.value = await $fetch<{ id: number; name: string }[]>('/api/catalogue/countries', { query: { clientId } })
  } catch {  }
})
const showNewAddress = ref(false)
const editingAddressId = ref<number | null>(null)

function startEditAddress(addr: any) {
  editingAddressId.value = addr.id
  addressForm.company = addr.company || ''
  addressForm.firstname = addr.firstname || ''
  addressForm.lastname = addr.lastname || ''
  addressForm.address1 = addr.address1 || ''
  addressForm.address2 = addr.address2 || ''
  addressForm.postcode = addr.postcode || ''
  addressForm.city = addr.city || ''
  addressForm.phone = addr.phone || ''
  addressForm.countryId = addr.countryId || 8
  showNewAddress.value = true
}

function resetAddressForm() {
  editingAddressId.value = null
  addressForm.company = ''
  addressForm.firstname = ''
  addressForm.lastname = ''
  addressForm.address1 = ''
  addressForm.address2 = ''
  addressForm.postcode = ''
  addressForm.city = ''
  addressForm.phone = ''
  addressForm.countryId = 8
  showNewAddress.value = false
}

async function onSaveAddress() {
  if (!customer.value) return
  if (editingAddressId.value) {
    
    const addr = await updateAddress(editingAddressId.value, {
      company: addressForm.company,
      firstname: addressForm.firstname || customer.value.firstname,
      lastname: addressForm.lastname || customer.value.lastname,
      address1: addressForm.address1,
      address2: addressForm.address2,
      postcode: addressForm.postcode,
      city: addressForm.city,
      phone: addressForm.phone,
      countryId: addressForm.countryId,
    })
    if (addr) resetAddressForm()
  } else {
    
    const addr = await createAddress({
      customerId: customer.value.customerId,
      alias: t('checkout.checkout_address_alias_default', 'Livraison'),
      company: addressForm.company,
      firstname: addressForm.firstname || customer.value.firstname,
      lastname: addressForm.lastname || customer.value.lastname,
      address1: addressForm.address1,
      address2: addressForm.address2,
      postcode: addressForm.postcode,
      city: addressForm.city,
      countryId: addressForm.countryId,
      phone: addressForm.phone,
    })
    if (addr) resetAddressForm()
  }
}

async function onDeleteAddress(addrId: number) {
  await deleteAddress(addrId)
}

async function goToShipping() {
  if (!selectedAddressId.value) return
  await loadCarriers({
    addressId: selectedAddressId.value,
    totalHT: totalHT.value,
  })
  goToStep('shipping')
}

async function goToPayment() {
  if (!selectedCarrierId.value) return
  goToStep('payment')
}

async function onPlaceOrder() {
  if (!cartId.value || !customer.value) return
  const order = await placeOrder(cartId.value, customer.value.customerId, customer.value.email)
  if (!order) return

  
  if (paymentMethod.value === 'systempay') {
    try {
      const formData = await $fetch<{ url: string; fields: Record<string, string> }>('/api/payment/systempay-form', {
        method: 'POST',
        body: {
          orderId: order.id,
          orderReference: order.reference,
          amount: order.totalPaidTTC,
          customerEmail: customer.value.email,
        },
      })

      
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = formData.url
      for (const [name, value] of Object.entries(formData.fields)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      }
      document.body.appendChild(form)
      clearCart()
      form.submit()
      return
    } catch (err: any) {
      error.value = t('checkout.systempay_error')
      console.error('[systempay] Erreur génération formulaire:', err?.message)
      return
    }
  }

  clearCart()
}

const steps = computed(() => [
  { key: 'auth', num: 1, label: t('checkout.step_connexion') },
  { key: 'address', num: 2, label: t('checkout.step_adresses') },
  { key: 'shipping', num: 3, label: t('checkout.step_livraison') },
  { key: 'payment', num: 4, label: t('checkout.step_paiement') },
])

const stepNum = computed(() => {
  if (step.value === 'confirmation') return 5
  return steps.value.find(s => s.key === step.value)?.num || 1
})

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

useListingBodyId('checkout')

useHead({ title: _brand ? `Commander — ${_brand}` : 'Commander' })
</script>

<template>
  <NuxtLayout name="checkout">
    <div class="min-h-screen bg-gray-50">

      
      <div v-if="step !== 'confirmation'" class="bg-white border-b border-gray-100">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div class="flex items-center justify-between">
            <div
              v-for="s in steps"
              :key="s.num"
              class="flex items-center gap-2"
              :class="s.num < stepNum ? 'text-primary-600' : s.num === stepNum ? 'text-gray-900' : 'text-gray-300'"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                :class="s.num < stepNum ? 'bg-primary-600 border-primary-600 text-white' : s.num === stepNum ? 'border-primary-600 text-primary-600' : 'border-gray-200 text-gray-300'"
              >
                <span v-if="s.num < stepNum">✓</span>
                <span v-else>{{ s.num }}</span>
              </div>
              <span class="text-xs font-semibold hidden sm:inline">{{ s.label }}</span>
              <div v-if="s.num < 4" class="w-8 sm:w-16 h-px mx-1" :class="s.num < stepNum ? 'bg-primary-600' : 'bg-gray-200'" />
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        
        <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ error }}
        </div>

        
        <div v-if="step === 'auth'" class="bg-white rounded-2xl p-8 shadow-sm">
          
          <template v-if="loggedIn && customer">
            <h2 class="text-xl font-bold text-gray-900 mb-2">{{ t('checkout.auth_already_title') }}</h2>
            <p class="text-sm text-gray-500 mb-6">{{ t('checkout.auth_already_subtitle') }}</p>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_email_pro') }}</label>
                <input
                  :value="customer.email"
                  type="email"
                  disabled
                  aria-readonly="true"
                  class="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-600 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                :disabled="loading"
                class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors"
                @click="onContinueAsLoggedIn"
              >
                {{ t('checkout.auth_continue_as_logged_in') }}
              </button>
              <p class="text-xs text-gray-400 text-center">
                {{ t('checkout.auth_not_you') }}
                <button type="button" class="text-primary-600 hover:underline" @click="onLogout">
                  {{ t('auth.logout') }}
                </button>
              </p>
            </div>
          </template>

          
          <template v-else>
            <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.auth_title') }}</h2>
            <p class="text-sm text-gray-500 mb-6">{{ t('checkout.auth_subtitle') }}</p>
            <form class="space-y-4" @submit.prevent="onLogin">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_email_pro') }}</label>
                <input v-model="loginForm.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password') }}</label>
                <input v-model="loginForm.password" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <p v-if="loginError" class="text-red-500 text-xs">{{ loginError }}</p>
              <button type="submit" :disabled="authLoading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ authLoading ? t('auth.login_loading') : t('auth.login_button') }}
              </button>
              <p class="text-xs text-gray-400 text-center">
                {{ t('auth.login_no_account') }} <NuxtLink to="/inscription" class="text-primary-600 hover:underline">{{ t('auth.login_create_account') }}</NuxtLink>
              </p>
            </form>
          </template>
        </div>

        
        <div v-if="step === 'address'" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.address_title') }}</h2>

          
          <div v-if="addresses.length && !showNewAddress" class="space-y-3 mb-6">
            <label
              v-for="addr in addresses"
              :key="addr.id"
              class="flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="selectedAddressId === addr.id ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="selectedAddressId" :value="addr.id" type="radio" name="address" class="accent-primary-600 mt-1" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ addr.company || `${addr.firstname} ${addr.lastname}` }}</p>
                <p class="text-xs text-gray-500">{{ addr.address1 }}<span v-if="addr.address2">, {{ addr.address2 }}</span></p>
                <p class="text-xs text-gray-500">{{ addr.postcode }} {{ addr.city }}</p>
                <p v-if="addr.phone" class="text-xs text-gray-400">{{ addr.phone }}</p>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <button type="button" @click.prevent="startEditAddress(addr)" class="text-[10px] text-gray-400 hover:text-primary-600 transition-colors" :title="t('common.common_edit', 'Modifier')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" /></svg>
                </button>
                <button type="button" @click.prevent="onDeleteAddress(addr.id!)" class="text-[10px] text-gray-400 hover:text-red-500 transition-colors" :title="t('common.common_delete', 'Supprimer')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </label>
            <button class="text-sm text-primary-600 hover:underline" @click="showNewAddress = true">{{ t('checkout.address_new') }}</button>
          </div>

          
          <form v-if="!addresses.length || showNewAddress" class="space-y-4" @submit.prevent="onSaveAddress">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_company') }}</label>
              <input v-model="addressForm.company" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_firstname') }}</label>
                <input v-model="addressForm.firstname" type="text" required :placeholder="customer?.firstname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_lastname') }}</label>
                <input v-model="addressForm.lastname" type="text" required :placeholder="customer?.lastname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_address') }}</label>
              <input v-model="addressForm.address1" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_postcode') }}</label>
                <input v-model="addressForm.postcode" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_city') }}</label>
                <input v-model="addressForm.city" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_country') }}</label>
              <select v-model="addressForm.countryId" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none bg-white">
                <option v-if="!countries.length" :value="8">{{ t('checkout.checkout_country_france', 'France') }}</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_phone') }}</label>
              <input v-model="addressForm.phone" type="tel" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="flex gap-3">
              <button v-if="addresses.length" type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="resetAddressForm">{{ t('checkout.cancel') }}</button>
              <button type="submit" :disabled="loading" class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ loading ? t('checkout.saving') : editingAddressId ? t('checkout.edit_address') : t('checkout.save_address') }}
              </button>
            </div>
          </form>

          <div v-if="addresses.length && !showNewAddress" class="flex gap-3 mt-6">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('auth')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300"
              :disabled="!selectedAddressId"
              @click="goToShipping"
            >
              {{ t('checkout.continue') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'shipping'" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.shipping_title') }}</h2>

          <div v-if="loading" class="text-center py-8 text-gray-400 text-sm">{{ t('checkout.shipping_loading') }}</div>

          <div v-else class="space-y-3 mb-6">
            <label
              v-for="carrier in carriers"
              :key="carrier.id"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="selectedCarrierId === carrier.id ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="selectedCarrierId" :value="carrier.id" type="radio" name="carrier" class="accent-primary-600" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ carrier.name }}</p>
                <p class="text-xs text-gray-500">{{ carrier.delay }}</p>
              </div>
              <span v-if="carrier.price > 0" class="text-sm font-bold text-primary-600">{{ formatPrice(carrier.price) }}</span>
              <span v-else-if="!carrier.isFree" class="text-sm font-bold text-primary-600">{{ t('checkout.shipping_free') }}</span>
            </label>
          </div>

          <div class="flex gap-3">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('address')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300"
              :disabled="!selectedCarrierId"
              @click="goToPayment"
            >
              {{ t('checkout.continue_payment') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'payment'" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.payment_title') }}</h2>

          
          <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ t('checkout.summary') }}</h3>

            <table class="w-full text-xs text-gray-600">
              <thead>
                <tr class="text-left text-gray-400 uppercase tracking-wide text-[10px]">
                  <th class="font-medium pb-2 pr-2">{{ t('checkout.checkout_table_product', 'Produit') }}</th>
                  <th class="font-medium pb-2 pr-2 hidden sm:table-cell">{{ t('checkout.checkout_table_ref', 'Réf.') }}</th>
                  <th class="font-medium pb-2 pr-2 text-center">{{ t('checkout.checkout_table_qty', 'Qté') }}</th>
                  
                  <th class="font-medium pb-2 pr-2 text-right hidden sm:table-cell">{{ t('checkout.checkout_table_unit_price', 'Prix unitaire') }}</th>
                  <th class="font-medium pb-2 text-right">{{ t('checkout.checkout_table_total_ht', 'Total HT') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id" class="border-t border-gray-200/60">
                  <td class="py-2 pr-2">{{ item.name }}</td>
                  <td class="py-2 pr-2 text-gray-400 hidden sm:table-cell">{{ item.ref || '—' }}</td>
                  <td class="py-2 pr-2 text-center">{{ item.quantity }}</td>
                  <td class="py-2 pr-2 text-right text-gray-500 hidden sm:table-cell">
                    <template v-if="item.pricePerKgFormatted">{{ item.pricePerKgFormatted }} {{ item.unitLabel || 'HT/K' }}</template>
                    <template v-else>{{ formatPrice(item.priceRaw) }} HT</template>
                  </td>
                  <td class="py-2 text-right">{{ formatPrice(item.priceRaw * item.quantity) }}</td>
                </tr>
              </tbody>
            </table>

            
            <CartFirstOrderBanner class="mt-3" />

            
            <div class="border-t border-gray-200 mt-3 pt-3">
              <div v-if="discountCode" class="flex items-center justify-between text-xs">
                <span class="text-gray-700">Code promo : <strong>{{ discountCode }}</strong></span>
                <button class="text-[10px] text-gray-400 hover:text-red-500" :disabled="promoLoading" @click="onRemovePromo">{{ t('checkout.checkout_promo_remove', 'Retirer') }}</button>
              </div>
              <form v-else class="flex gap-2" @submit.prevent="onApplyPromo">
                <input
                  v-model="promoInput"
                  type="text"
                  :placeholder="t('checkout.checkout_promo_placeholder', 'Code promo')"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-primary-600 focus:outline-none"
                />
                <button
                  type="submit"
                  :disabled="promoLoading || !promoInput.trim()"
                  class="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg transition-colors"
                >{{ promoLoading ? t('checkout.checkout_promo_loading', '…') : t('checkout.checkout_promo_apply', 'Appliquer') }}</button>
              </form>
              <p v-if="promoError" class="text-[10px] text-red-500 mt-1">{{ promoError }}</p>
            </div>

            
            <div v-if="appliedCorseTva" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
              <p class="font-semibold text-blue-900">TVA Corse appliquée — 2,1 %</p>
              <p class="text-[11px] text-blue-800 mt-0.5 leading-snug">
                Votre adresse en Corse bénéficie automatiquement du taux de TVA réduit applicable aux produits alimentaires.
              </p>
            </div>

            <div class="border-t border-gray-200 mt-3 pt-3 space-y-1">
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ t('checkout.subtotal_ht') }}</span>
                <span>{{ subtotalFormatted }}</span>
              </div>
              <div v-if="discountCode && discountHT > 0" class="flex justify-between text-xs text-emerald-700">
                <span>{{ t('checkout.checkout_discount_label', 'Remise « {code} »').replace('{code}', discountCode) }}</span>
                <span>− {{ formatPrice(discountHT) }}</span>
              </div>
              <div v-if="discountCode && discountHT > 0" class="flex justify-between text-xs text-gray-500">
                <span>Total HT</span>
                <span>{{ totalFormatted }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ t('checkout.vat') }}</span>
                <span>{{ formatPrice(totalTTC - totalHT) }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>Livraison<span v-if="selectedCarrier"> — {{ selectedCarrier.name }}</span></span>
                <span>{{ shippingPrice > 0 ? formatPrice(shippingPrice) : t('checkout.shipping_free') }}</span>
              </div>
              <div class="flex justify-between text-sm font-bold text-gray-900 pt-1">
                <span>{{ t('checkout.total_ttc') }}</span>
                <span class="text-primary-600">{{ formatPrice(finalTotalTTC) }}</span>
              </div>
            </div>
          </div>

          
          <div class="space-y-3 mb-6">
            <label
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'bankwire' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="bankwire" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.bankwire_title') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.bankwire_desc') }}</p>
              </div>
            </label>
            <label
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'systempay' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="systempay" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.systempay_title') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.systempay_desc') }}</p>
              </div>
            </label>
          </div>

          <div class="flex gap-3">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('shipping')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300"
              :disabled="loading"
              @click="onPlaceOrder"
            >
              {{ loading ? t('checkout.placing_order') : t('checkout.confirm_order') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'confirmation' && createdOrder" class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('checkout.confirmed_title') }}</h2>
          <p class="text-sm text-gray-500 mb-6">
            Votre commande <strong class="text-gray-900">#{{ createdOrder.reference }}</strong> a été enregistrée.
          </p>

          <div class="bg-gray-50 rounded-xl p-4 text-left mb-6 max-w-md mx-auto">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_reference') }}</span>
                <span class="font-semibold">#{{ createdOrder.reference }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_status') }}</span>
                <span class="font-semibold text-orange-600">{{ createdOrder.status }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_payment') }}</span>
                <span class="font-semibold">{{ createdOrder.payment }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2">
                <span class="text-gray-500">{{ t('checkout.subtotal_ht') }}</span>
                <span class="font-bold text-primary-600">{{ formatPrice(createdOrder.totalPaidHT) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.total_ttc') }}</span>
                <span class="font-bold text-primary-600">{{ formatPrice(createdOrder.totalPaidTTC) }}</span>
              </div>
            </div>
          </div>

          <div v-if="paymentMethod === 'bankwire'" class="bg-blue-50 rounded-xl p-4 text-left mb-6 max-w-md mx-auto text-sm text-blue-800">
            <p class="font-semibold mb-2">{{ t('checkout.bankwire_instructions_title') }}</p>
            <p class="mb-3">{{ t('checkout.bankwire_instructions_body').replace('%s', createdOrder.reference) }}</p>

            
            <div v-if="bankwireDetails && (bankwireDetails.details || bankwireDetails.owner)" class="bg-white border border-blue-200 rounded-lg p-3 my-3 text-xs space-y-1.5 font-mono">
              <div v-if="bankwireDetails.owner" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_owner', 'Bénéficiaire') }}</span>
                <span class="text-blue-900 font-semibold">{{ bankwireDetails.owner }}</span>
              </div>
              <div v-if="bankwireDetails.details" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_details', 'Coordonnées') }}</span>
                <span class="text-blue-900 whitespace-pre-line">{{ bankwireDetails.details }}</span>
              </div>
              <div v-if="bankwireDetails.address" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_address', 'Adresse banque') }}</span>
                <span class="text-blue-900 whitespace-pre-line">{{ bankwireDetails.address }}</span>
              </div>
              <div class="flex flex-col pt-2 border-t border-blue-100">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_reference', 'Référence à indiquer') }}</span>
                <span class="text-blue-900 font-bold">#{{ createdOrder.reference }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_amount', 'Montant') }}</span>
                <span class="text-blue-900 font-bold">{{ formatPrice(createdOrder.totalPaidTTC) }}</span>
              </div>
            </div>

            <p class="mt-1 text-xs text-blue-600">{{ t('checkout.bankwire_instructions_note') }}</p>
          </div>

          <div class="flex gap-3 justify-center">
            <NuxtLink to="/" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50">
              {{ t('checkout.back_to_shop') }}
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>
  </NuxtLayout>
</template>
