<!--
  Page réinitialisation mot de passe — /reinitialiser-mot-de-passe?token=…&email=…
  Formulaire nouveau mot de passe → POST /api/catalogue/customer/password-reset.

  Token + email lus depuis la query string. Si absents → message d'erreur.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const route = useRoute()
const router = useRouter()
const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')

const token = String(route.query.token || '')
const email = String(route.query.email || '')

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const tokenMissing = computed(() => !token || !email)

async function onSubmit() {
  error.value = ''
  if (newPassword.value.length < 8) {
    error.value = t('auth.reset_password_too_short', 'Mot de passe trop court (8 caractères minimum).')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('auth.reset_password_mismatch', 'Les mots de passe ne correspondent pas.')
    return
  }

  loading.value = true
  try {
    await $fetch('/api/catalogue/customer/password-reset', {
      method: 'POST',
      body: { email, token, newPassword: newPassword.value },
    })
    success.value = true
    setTimeout(() => router.push('/connexion'), 2000)
  } catch (err: any) {
    error.value = err.data?.message ?? t('auth.reset_password_error', 'Une erreur est survenue, réessayez.')
  } finally {
    loading.value = false
  }
}

useHead({ title: brand ? `Nouveau mot de passe — ${brand}` : 'Nouveau mot de passe' })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          {{ t('auth.reset_password_title', 'Choisir un nouveau mot de passe') }}
        </h1>

        <div v-if="tokenMissing" class="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {{ t('auth.reset_password_invalid_link', 'Lien invalide ou incomplet. Demandez un nouveau lien depuis la page « Mot de passe oublié ».') }}
        </div>

        <div v-else-if="success" class="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {{ t('auth.reset_password_success', 'Mot de passe mis à jour. Redirection vers la connexion…') }}
        </div>

        <form v-else class="space-y-4" @submit.prevent="onSubmit">
          <p class="text-sm text-gray-500 mb-2">
            {{ t('auth.reset_password_subtitle', 'Pour le compte') }}
            <strong>{{ email }}</strong>
          </p>

          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              {{ t('auth.reset_password_new', 'Nouveau mot de passe') }}
            </label>
            <input
              v-model="newPassword"
              type="password"
              required
              autocomplete="new-password"
              minlength="8"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              {{ t('auth.reset_password_confirm', 'Confirmer le mot de passe') }}
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              minlength="8"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none"
            />
          </div>

          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {{ loading ? t('auth.reset_password_loading', 'Mise à jour…') : t('auth.reset_password_button', 'Mettre à jour') }}
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
