
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('academy.academy_register_modal_title') }}</h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-6">{{ t('academy.academy_register_modal_subtitle') }}</p>

        <form @submit.prevent="register" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">{{ t('academy.academy_label_pseudo') }}</label>
            <input
              v-model="pseudo"
              type="text"
              minlength="3"
              maxlength="30"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
              :placeholder="t('academy.register_pseudo_placeholder')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">{{ t('auth.label_email') }}</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
              :placeholder="t('auth.placeholder_email')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">{{ t('auth.label_password') }}</label>
            <input
              v-model="password"
              type="password"
              minlength="8"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
              :placeholder="t('academy.register_password_placeholder')"
            />
          </div>

          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {{ loading ? t('academy.academy_register_button_loading') : t('academy.academy_register_button_default') }}
          </button>
        </form>

        <button @click="$emit('close')" class="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          {{ t('common.common_cancel') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useT()

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ registered: [student: any]; close: [] }>()

const pseudo = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function register() {
  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/academy/register', {
      method: 'POST',
      body: { email: email.value, password: password.value, pseudo: pseudo.value },
    })

    if ((result as any).success) {
      emit('registered', (result as any).student)
    } else {
      error.value = (result as any).error || t('common.common_error_generic')
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || t('common.common_error_server')
  } finally {
    loading.value = false
  }
}
</script>
