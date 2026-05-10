<!--
  Page inscription — /inscription

  Mode B2B (PS_B2B_ENABLE=1 ou runtimeConfig.public.b2bMode=true) :
  collecte company + SIRET + activité. Mode B2C : signup minimal
  (prénom, nom, email, password). Title et placeholders adaptés.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const { isB2b } = useB2bVisibility()
const router = useRouter()
const error = ref('')
const loading = ref(false)

const cfg = useRuntimeConfig()
const clientId = String((cfg.public as any).clientId ?? '')
const brand = String((cfg.public as any).brandName ?? '')

const form = reactive({
  company: '', siret: '', activityCode: '', firstname: '', lastname: '', email: '', password: '', confirmPassword: '',
})

async function onSubmit() {
  error.value = ''
  if (form.password !== form.confirmPassword) { error.value = t('auth.register_password_mismatch'); return }
  if (form.password.length < 8) { error.value = t('auth.register_password_min_length'); return }

  loading.value = true
  try {
    const res = await $fetch('/api/catalogue/customer/register', {
      method: 'POST',
      body: {
        clientId,
        firstname: form.firstname, lastname: form.lastname,
        email: form.email, password: form.password,
        // B2B fields: sent only if the tenant is in B2B mode,
        // otherwise they remain absent/empty and the API skips validation
        // SIRET / company required.
        company: isB2b.value ? form.company : undefined,
        siret: isB2b.value ? form.siret : undefined,
        activityCode: isB2b.value && form.activityCode ? form.activityCode : undefined,
      },
    })
    if (res.success) router.push('/')
  } catch (err: any) {
    error.value = err.data?.message ?? t('auth.register_error_generic')
  } finally {
    loading.value = false
  }
}

const headTitle = computed(() => {
  const base = isB2b.value
    ? t('auth.head_title_register_b2b', 'Créer un compte professionnel')
    : t('auth.head_title_register_b2c', 'Créer un compte')
  return brand ? `${base} — ${brand}` : base
})
useHead({ title: () => headTitle.value })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('auth.register_page_title') }}</h1>
        <p class="text-sm text-gray-500 mb-6">{{ t('auth.register_subtitle') }}</p>

        <form class="space-y-4" @submit.prevent="onSubmit">
          <template v-if="isB2b">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_company') }} *</label>
              <input v-model="form.company" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_company')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET</label>
              <input v-model="form.siret" type="text" maxlength="14" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_siret')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_activity', 'Votre activité') }}</label>
              <select v-model="form.activityCode" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none bg-white">
                <option value="">— {{ t('common.select_option', 'Sélectionner') }} —</option>
                <option v-for="a in CUSTOMER_ACTIVITIES" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_firstname') }} *</label>
              <input v-model="form.firstname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_lastname') }} *</label>
              <input v-model="form.lastname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">{{ isB2b ? t('auth.label_email_pro') : t('auth.label_email') }} *</label>
            <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="isB2b ? t('auth.placeholder_email_pro') : t('auth.placeholder_email')" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password_field') }} *</label>
              <input v-model="form.password" type="password" required minlength="8" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_confirm_password') }} *</label>
              <input v-model="form.confirmPassword" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
          </div>

          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

          <button type="submit" :disabled="loading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ loading ? t('auth.register_loading') : t('auth.register_button') }}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-4">
          {{ t('auth.register_already_client') }} <NuxtLink to="/connexion" class="text-primary-600 hover:underline">{{ t('auth.login_button') }}</NuxtLink>
        </p>
      </div>
    </div>
  </NuxtLayout>
</template>
