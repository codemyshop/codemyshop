
<script setup lang="ts">
import type { CustomerData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const { customer, checkSession } = useCustomerAuth()
const { isB2b } = useB2bVisibility()

const profile = ref<CustomerData | null>(null)
const loading = ref(true)
const saving = ref(false)
const savedMsg = ref('')

const form = reactive({ firstname: '', lastname: '', company: '', siret: '', email: '' })
const pwForm = reactive({ newPassword: '', confirmPassword: '' })
const pwError = ref('')
const pwSuccess = ref('')
const pwSaving = ref(false)

async function loadProfile() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo('/connexion')
  }
  loading.value = true
  try {
    profile.value = await $fetch<CustomerData>('/api/catalogue/customer/profile', {
      query: { customerId: customer.value!.customerId },
    })
    form.firstname = profile.value.firstname
    form.lastname = profile.value.lastname
    form.company = profile.value.company || ''
    form.siret = profile.value.siret || ''
    form.email = profile.value.email
  } catch {  }
  finally { loading.value = false }
}

async function onSaveProfile() {
  if (!customer.value) return
  saving.value = true
  savedMsg.value = ''
  try {
    await $fetch('/api/catalogue/customer/profile', {
      method: 'PUT',
      body: { customerId: customer.value.customerId, ...form },
    })
    savedMsg.value = t('account.profile_saved')
    setTimeout(() => { savedMsg.value = '' }, 3000)
  } catch { savedMsg.value = t('account.profile_save_error') }
  finally { saving.value = false }
}

async function onChangePassword() {
  pwError.value = ''
  pwSuccess.value = ''

  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = t('account.profile_password_mismatch')
    return
  }
  if (pwForm.newPassword.length < 8) {
    pwError.value = t('account.profile_password_min_length')
    return
  }

  pwSaving.value = true
  try {
    await $fetch('/api/catalogue/customer/password', {
      method: 'PUT',
      body: { newPassword: pwForm.newPassword },
    })
    pwSuccess.value = t('account.profile_password_changed')
    Object.assign(pwForm, { newPassword: '', confirmPassword: '' })
    setTimeout(() => { pwSuccess.value = '' }, 3000)
  } catch (err: any) {
    pwError.value = err?.data?.message || t('account.profile_password_error')
  } finally { pwSaving.value = false }
}

onMounted(loadProfile)
useHead({ title: brandName ? `Mon profil — ${brandName}` : 'Mon profil' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        <div class="flex items-center gap-3 mb-8">
          <NuxtLink to="/mon-compte" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('account.profile_title') }}</h1>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading') }}</div>

        <div v-else class="space-y-8">
          
          <form class="bg-white rounded-xl p-6 border border-gray-100 space-y-4" @submit.prevent="onSaveProfile">
            <h2 class="text-sm font-bold text-gray-500">{{ t('account.profile_personal_info') }}</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_firstname') }}</label>
                <input v-model="form.firstname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_lastname') }}</label>
                <input v-model="form.lastname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_email') }}</label>
              <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div v-if="isB2b" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_company') }}</label>
                <input v-model="form.company" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET</label>
                <input v-model="form.siret" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button type="submit" :disabled="saving" class="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ saving ? t('account.profile_saving') : t('account.profile_save') }}
              </button>
              <span v-if="savedMsg" class="text-sm text-primary-600">{{ savedMsg }}</span>
            </div>
          </form>

          
          <form class="bg-white rounded-xl p-6 border border-gray-100 space-y-4" @submit.prevent="onChangePassword">
            <h2 class="text-sm font-bold text-gray-500">{{ t('account.profile_change_password') }}</h2>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_new_password') }}</label>
              <input v-model="pwForm.newPassword" type="password" required minlength="8" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_confirm_new_password') }}</label>
              <input v-model="pwForm.confirmPassword" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <p v-if="pwError" class="text-red-500 text-xs">{{ pwError }}</p>
            <p v-if="pwSuccess" class="text-primary-600 text-xs">{{ pwSuccess }}</p>
            <button type="submit" :disabled="pwSaving" class="py-3 px-6 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
              {{ pwSaving ? t('account.profile_password_changing') : t('account.profile_password_button') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
