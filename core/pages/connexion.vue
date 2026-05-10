<!--
  Page connexion client B2B — /connexion

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const router = useRouter()
const route = useRoute()
const customerAuth = useCustomerAuth()
const error = ref('')
const loading = ref(false)
const form = reactive({ email: '', password: '' })

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')

// Whitelist of allowed paths for `?next=` — prevents open redirect.
// Only internal relative paths are allowed (start with '/' and
// not '//' which could point elsewhere after URL normalization).
function safeNext(): string {
  const raw = String(route.query.next || '').trim()
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res = await customerAuth.login(form.email, form.password)
    if (res.success) {
      router.push(safeNext())
      return
    }
    error.value = t('auth.login_error_invalid')
  } catch (err: any) {
    error.value = err.data?.message ?? t('auth.login_error_invalid')
  } finally {
    loading.value = false
  }
}

useHead({ title: brand ? `Se connecter — ${brand}` : 'Se connecter' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('auth.login_page_title') }}</h1>
        <p class="text-sm text-gray-500 mb-6">{{ t('auth.login_subtitle') }}</p>

        <form class="space-y-4" @submit.prevent="onSubmit">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_email') }}</label>
            <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password') }}</label>
            <input v-model="form.password" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
          </div>

          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

          <button type="submit" :disabled="loading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ loading ? t('auth.login_loading') : t('auth.login_button') }}
          </button>

          <p class="text-xs text-gray-400 text-center pt-1">
            <NuxtLink to="/mot-de-passe-oublie" class="text-primary-600 hover:underline">
              {{ t('auth.login_forgot_password', 'Mot de passe oublié ?') }}
            </NuxtLink>
          </p>
        </form>

        <p class="text-xs text-gray-400 text-center mt-4">
          {{ t('auth.login_no_account') }} <NuxtLink to="/inscription" class="text-primary-600 hover:underline">{{ t('auth.login_create_account') }}</NuxtLink>
        </p>
      </div>
    </div>
  </NuxtLayout>
</template>
