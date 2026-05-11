
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/catalogue/customer/password-reset-request', {
      method: 'POST',
      body: { email: email.value.trim() },
    })
    submitted.value = true
  } catch (err: any) {
    error.value = err.data?.message ?? t('auth.reset_request_error', 'Une erreur est survenue, réessayez.')
  } finally {
    loading.value = false
  }
}

useHead({ title: brand ? `Mot de passe oublié — ${brand}` : 'Mot de passe oublié' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          {{ t('auth.reset_request_title', 'Mot de passe oublié') }}
        </h1>
        <p class="text-sm text-gray-500 mb-6">
          {{ t('auth.reset_request_subtitle', 'Saisissez votre email, nous vous envoyons un lien pour choisir un nouveau mot de passe.') }}
        </p>

        <div v-if="submitted" class="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {{ t('auth.reset_request_success', 'Si un compte existe avec cet email, un lien vient de vous être envoyé. Vérifiez votre boîte de réception (et les spams).') }}
        </div>

        <form v-else class="space-y-4" @submit.prevent="onSubmit">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              {{ t('auth.label_email', 'Email') }}
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none"
              :placeholder="t('auth.placeholder_email', 'votre@email.com')"
            />
          </div>

          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {{ loading ? t('auth.reset_request_loading', 'Envoi en cours…') : t('auth.reset_request_button', 'Envoyer le lien') }}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-4">
          <NuxtLink to="/connexion" class="text-primary-600 hover:underline">
            {{ t('auth.reset_back_to_login', 'Retour à la connexion') }}
          </NuxtLink>
        </p>
      </div>
    </div>
  </NuxtLayout>
</template>
