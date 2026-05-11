<template>
  
  <div class="relative">

    
    <button
      v-if="customer"
      @click="toggleDropdown"
      class="flex items-center gap-2 focus:outline-none group"
      :aria-label="t('account.menu_label')"
    >
      <span class="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center group-hover:bg-primary-700 transition-colors">
        {{ initials }}
      </span>
    </button>

    <button
      v-else
      @click="openLoginModal"
      class="text-gray-600 hover:text-primary-600 transition-colors focus:outline-none"
      :aria-label="t('auth.login_button')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9A3.75 3.75 0 1 1 8.25 9a3.75 3.75 0 0 1 7.5 0Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 20.25a8.25 8.25 0 0 1 15 0" />
      </svg>
    </button>

    
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="dropdownOpen && customer"
        class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 py-1 z-50 origin-top-right"
        @click.stop
      >
        <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ customer.firstname }} {{ customer.lastname }}</p>
          <p class="text-xs text-gray-500 dark:text-slate-400 truncate">{{ customer.email }}</p>
        </div>

        <NuxtLink
          to="/mon-compte"
          class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          @click="dropdownOpen = false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          {{ t('account.account_title') }}
        </NuxtLink>

        <div class="border-t border-gray-100 dark:border-slate-800 my-1" />

        <button
          @click="handleLogout"
          class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          {{ t('auth.logout') }}
        </button>
      </div>
    </Transition>
  </div>

  
  <div
    v-if="dropdownOpen"
    class="fixed inset-0 z-40"
    @click="dropdownOpen = false"
  />

  
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="loginModalOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-10"
        @click.self="closeLoginModal"
      >
        <div class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-7" @click.stop>
          <button
            type="button"
            class="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
            :aria-label="t('common.close')"
            @click="closeLoginModal"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-1">{{ t('auth.login_page_title') }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mb-5">{{ t('auth.login_subtitle') }}</p>

          <form class="space-y-3" @submit.prevent="onLoginSubmit">
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">{{ t('auth.label_email') }}</label>
              <input
                ref="emailInput"
                v-model="loginForm.email"
                type="email"
                required
                autocomplete="email"
                class="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
                :placeholder="t('auth.placeholder_email')"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">{{ t('auth.label_password') }}</label>
              <input
                v-model="loginForm.password"
                type="password"
                required
                autocomplete="current-password"
                class="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
              />
            </div>

            <p v-if="loginError" class="text-rose-600 text-xs">{{ loginError }}</p>

            <button
              type="submit"
              :disabled="loginLoading"
              class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {{ loginLoading ? t('auth.login_loading') : t('auth.login_button') }}
            </button>

            <p class="text-xs text-center mt-1">
              <NuxtLink to="/mot-de-passe-oublie" class="text-gray-500 hover:text-primary-600 hover:underline" @click="closeLoginModal">
                {{ t('auth.login_forgot_password') }}
              </NuxtLink>
            </p>
          </form>

          <p class="text-xs text-gray-400 text-center mt-4">
            {{ t('auth.login_no_account') }}
            <NuxtLink to="/inscription" class="text-primary-600 hover:underline" @click="closeLoginModal">
              {{ t('auth.login_create_account') }}
            </NuxtLink>
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const customerAuth = useCustomerAuth()
const { t } = useT()

const dropdownOpen = ref(false)
const loginModalOpen = ref(false)
const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)
const emailInput = ref<HTMLInputElement | null>(null)

const customer = computed(() => customerAuth.customer.value)

const initials = computed(() => {
  const c = customer.value
  if (!c) return ''
  return (c.firstname?.[0] ?? '') + (c.lastname?.[0] ?? '')
})

const toggleDropdown = () => { dropdownOpen.value = !dropdownOpen.value }

function openLoginModal() {
  loginModalOpen.value = true
  loginError.value = ''
  loginForm.email = ''
  loginForm.password = ''
  
  nextTick(() => emailInput.value?.focus())
}

function closeLoginModal() {
  loginModalOpen.value = false
  loginError.value = ''
}

async function onLoginSubmit() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await customerAuth.login(loginForm.email, loginForm.password)
    if (res.success) {
      closeLoginModal()
      
      
      return
    }
    loginError.value = res.error || t('auth.login_error_invalid')
  } catch (err: any) {
    loginError.value = err?.data?.message ?? t('auth.login_error_invalid')
  } finally {
    loginLoading.value = false
  }
}

const handleLogout = async () => {
  dropdownOpen.value = false
  await customerAuth.logout()
}

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (loginModalOpen.value) closeLoginModal()
    else dropdownOpen.value = false
  })
})
</script>
