<!--
  Page devis B2B — /devis
  Double parcours :
  - Client connecté → convertit le devis en panier PS + redirige vers /commander
  - Visiteur non connecté → formulaire B2B → SmartLead + SmartProject
  clientId via useRuntimeConfig().public.clientId.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: 'funnel' })

const router = useRouter()
const { items, updateQuantity, removeFromQuote, totalItems, clearQuote } = useQuoteCart()
const { showPrices } = useB2bVisibility()
const customerAuth = useCustomerAuth()
const { t } = useHubT()

const _cfg = useRuntimeConfig()
const _clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')

// Server-side cart — to migrate quote → cart when logged in
const { addToCart, initServerCart } = useServerCart(_clientId)

// Onglet actif : 'login' ou 'quote'
const activeTab = ref<'login' | 'quote'>('quote')

// ── Formulaire connexion client ───────────────────────────────────────
const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)
const converting = ref(false)

async function loginAndConvert() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await customerAuth.login(loginForm.email, loginForm.password)
    if (!res.success) {
      loginError.value = t('devis.devis_login_error')
      return
    }

    // Migrate quote items to the server-side cart
    converting.value = true
    for (const item of items.value) {
      await addToCart({
        id: item.id,
        name: item.name,
        price: '',
        priceRaw: 0,
        image: item.image,
        ref: item.reference,
      }, item.quantity)
    }
    clearQuote()
    router.push('/commander')
  } catch (err: any) {
    loginError.value = err?.data?.message || t('devis.devis_login_error_generic')
  } finally {
    loginLoading.value = false
    converting.value = false
  }
}

// ── Formulaire demande de devis (prospect) ────────────────────────────
const form = reactive({
  firstname: '',
  lastname: '',
  email: '',
  phone: '',
  company: '',
  siret: '',
  activite: 'Grossiste',
  message: '',
})

const activiteOptions = computed(() => [
  { value: 'GMS', label: t('devis.devis_activity_gms') },
  { value: 'Supérette', label: t('devis.devis_activity_superette') },
  { value: 'Indépendant', label: t('devis.devis_activity_independant') },
  { value: 'Primeur', label: t('devis.devis_activity_primeur') },
  { value: 'Marché', label: t('devis.devis_activity_marche') },
  { value: 'CHR', label: t('devis.devis_activity_chr') },
  { value: 'Boucherie orientale', label: t('devis.devis_activity_boucherie') },
  { value: 'Grossiste', label: t('devis.devis_activity_grossiste') },
  { value: 'Intermédiaire (GMS)', label: t('devis.devis_activity_intermediaire') },
  { value: 'Epicerie fine', label: t('devis.devis_activity_epicerie') },
  { value: 'Autre', label: t('devis.devis_activity_autre') },
])

const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

async function submitQuote() {
  errorMsg.value = ''

  if (!form.firstname.trim() || !form.lastname.trim()) {
    errorMsg.value = t('devis.devis_validation_name')
    return
  }
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMsg.value = t('devis.devis_validation_email')
    return
  }
  if (!form.company.trim()) {
    errorMsg.value = t('devis.devis_validation_company')
    return
  }
  if (!items.value.length) {
    errorMsg.value = t('devis.devis_validation_empty')
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/quote/submit', {
      method: 'POST',
      body: {
        ...form,
        items: items.value.map(i => ({
          id: i.id,
          name: i.name,
          reference: i.reference,
          quantity: i.quantity,
        })),
      },
    })
    submitted.value = true
    clearQuote()
  } catch (err: any) {
    errorMsg.value = err?.data?.message || t('devis.devis_error_generic')
  } finally {
    submitting.value = false
  }
}

useHead({ title: _brand ? `Demande de devis — ${_brand}` : 'Demande de devis' })
</script>

<template>
  <div class="bg-white">

      <!-- Breadcrumb -->
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <NuxtLink to="/" class="hover:text-primary-600">{{ t('cart.breadcrumb_home') }}</NuxtLink>
            <span>/</span>
            <span class="text-gray-700 font-medium">{{ t('devis.devis_breadcrumb') }}</span>
          </nav>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        <!-- Confirmation (envoi prospect) -->
        <div v-if="submitted" class="max-w-lg mx-auto text-center py-20">
          <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-600/10 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-3">{{ t('devis.devis_sent_title') }}</h1>
          <p class="text-gray-500 mb-6">
            {{ t('devis.devis_sent_body') }}
          </p>
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl text-sm"
          >
            {{ t('devis.devis_back_home') }}
          </NuxtLink>
        </div>

        <!-- Contenu principal -->
        <template v-else>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            {{ t('devis.devis_title') }}
            <span v-if="totalItems" class="text-gray-400 font-normal text-base">
              ({{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }})
            </span>
          </h1>
          <p class="text-sm text-gray-500 mb-8">
            {{ t('devis.devis_subtitle') }}
          </p>

          <div class="grid lg:grid-cols-3 gap-8">

            <!-- Liste produits (2/3) -->
            <div class="lg:col-span-2">
              <div v-if="items.length" class="space-y-3 mb-8">
                <div
                  v-for="item in items"
                  :key="item.id"
                  class="flex items-start gap-4 p-4 border border-gray-100 rounded-xl"
                >
                  <div class="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-contain p-2" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ item.name }}</h3>
                    <p v-if="item.reference" class="text-[10px] text-gray-400 mt-0.5">{{ t('catalogue.label_ref') }} {{ item.reference }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex items-center border border-gray-200 rounded-lg">
                      <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.id, item.quantity - 1)">−</button>
                      <span class="w-8 h-8 flex items-center justify-center text-sm font-semibold">{{ item.quantity }}</span>
                      <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.id, item.quantity + 1)">+</button>
                    </div>
                    <button class="text-gray-300 hover:text-red-500 transition-colors" @click="removeFromQuote(item.id)">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Devis vide -->
              <div v-else class="text-center py-16 border border-dashed border-gray-200 rounded-xl mb-8">
                <p class="text-gray-400 text-sm mb-4">{{ t('devis.devis_empty') }}</p>
                <NuxtLink to="/" class="text-primary-600 text-sm font-medium hover:underline">
                  {{ t('devis.devis_browse_catalogue') }}
                </NuxtLink>
              </div>
            </div>

            <!-- Sidebar : double parcours (1/3) -->
            <div class="lg:col-span-1">
              <div class="bg-gray-50 rounded-2xl p-6 sticky top-24">

                <!-- Onglets -->
                <div class="flex rounded-lg bg-gray-200 p-0.5 mb-5">
                  <button
                    class="flex-1 py-2 text-xs font-semibold rounded-md transition-colors"
                    :class="activeTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    @click="activeTab = 'login'"
                  >
                    {{ t('devis.devis_tab_login') }}
                  </button>
                  <button
                    class="flex-1 py-2 text-xs font-semibold rounded-md transition-colors"
                    :class="activeTab === 'quote' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    @click="activeTab = 'quote'"
                  >
                    {{ t('devis.devis_tab_quote') }}
                  </button>
                </div>

                <!-- Tab 1 : Connexion client → convertir en panier + commander -->
                <div v-if="activeTab === 'login'">
                  <p class="text-xs text-gray-500 mb-4">
                    {{ t('devis.devis_login_subtitle') }}
                  </p>

                  <form class="space-y-3" @submit.prevent="loginAndConvert">
                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('auth.label_email') }}</label>
                      <input
                        v-model="loginForm.email"
                        type="email"
                        required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                        :placeholder="t('auth.placeholder_email')"
                      />
                    </div>
                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('auth.label_password') }}</label>
                      <input
                        v-model="loginForm.password"
                        type="password"
                        required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                      />
                    </div>

                    <p v-if="loginError" class="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      {{ loginError }}
                    </p>

                    <button
                      type="submit"
                      :disabled="loginLoading || converting || !items.length"
                      class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      <template v-if="converting">{{ t('devis.devis_converting') }}</template>
                      <template v-else-if="loginLoading">{{ t('auth.login_loading') }}</template>
                      <template v-else>{{ t('devis.devis_login_and_order') }}</template>
                    </button>

                    <p class="text-[10px] text-gray-400 text-center">
                      {{ t('devis.devis_no_account') }}
                      <NuxtLink to="/inscription" class="text-primary-600 hover:underline">{{ t('auth.login_create_account') }}</NuxtLink>
                    </p>
                  </form>
                </div>

                <!-- Tab 2 : Formulaire prospect (demande de devis) -->
                <div v-else>
                  <p class="text-xs text-gray-500 mb-4">
                    {{ t('devis.devis_prospect_subtitle') }}
                  </p>

                  <form class="space-y-3" @submit.prevent="submitQuote">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_firstname') }}</label>
                        <input
                          v-model="form.firstname"
                          type="text"
                          required
                          class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                          :placeholder="t('devis.devis_placeholder_firstname')"
                        />
                      </div>
                      <div>
                        <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_lastname') }}</label>
                        <input
                          v-model="form.lastname"
                          type="text"
                          required
                          class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                          :placeholder="t('devis.devis_placeholder_lastname')"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_email_pro') }}</label>
                      <input
                        v-model="form.email"
                        type="email"
                        required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                        :placeholder="t('devis.devis_placeholder_email')"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_phone') }}</label>
                      <input
                        v-model="form.phone"
                        type="tel"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                        placeholder="01 23 45 67 89"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_company') }}</label>
                      <input
                        v-model="form.company"
                        type="text"
                        required
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                        :placeholder="t('devis.devis_placeholder_company')"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_siret') }}</label>
                      <input
                        v-model="form.siret"
                        type="text"
                        required
                        pattern="\d{3}\s?\d{3}\s?\d{3}\s?\d{5}"
                        :title="t('devis.devis_label_siret_help', '14 chiffres — votre numéro SIRET (ex: 123 456 789 00001)')"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none"
                        placeholder="123 456 789 00001"
                        maxlength="17"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_activity') }}</label>
                      <select
                        v-model="form.activite"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none bg-white"
                      >
                        <option v-for="opt in activiteOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{{ t('devis.devis_label_message') }}</label>
                      <textarea
                        v-model="form.message"
                        rows="3"
                        class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:outline-none resize-none"
                        :placeholder="t('devis.devis_placeholder_message')"
                      />
                    </div>

                    <p v-if="errorMsg" class="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      {{ errorMsg }}
                    </p>

                    <button
                      type="submit"
                      :disabled="submitting || !items.length"
                      class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      {{ submitting ? t('devis.devis_submitting') : t('devis.devis_submit') }}
                    </button>

                    <p class="text-[10px] text-gray-400 text-center mt-2">
                      {{ t('devis.devis_footer') }}
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
</template>
