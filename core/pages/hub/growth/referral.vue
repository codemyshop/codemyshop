<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Partenariat &amp; Croissance</h1>
          <p class="text-xs text-gray-400 mt-0.5">Programme de recommandation premium entre dirigeants</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
          Phase 3 &middot; Flywheel
        </span>
      </div>
    </header>

    <div class="p-6 max-w-4xl mx-auto space-y-8">

      <!-- The Promise -->
      <div class="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 lg:p-10 text-white shadow-xl overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div class="relative">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-primary-400 uppercase tracking-widest">Club Partenaires</p>
          </div>
          <h2 class="text-2xl lg:text-3xl font-extrabold leading-tight mb-4">
            Recommandez CodeMyShop<br />à un confrère dirigeant.
          </h2>
          <p class="text-gray-300 text-base leading-relaxed mb-6 max-w-lg">
            S'il d&eacute;ploie son infrastructure, nous vous offrons
            <span class="text-white font-bold">2 mois d'infog&eacute;rance</span>
            <span class="text-primary-400 font-bold">(valeur : 1 600 &euro;)</span>.
          </p>
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2 text-gray-400">
              <svg class="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
              Sans engagement
            </div>
            <div class="flex items-center gap-2 text-gray-400">
              <svg class="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
              100% confidentiel
            </div>
            <div class="flex items-center gap-2 text-gray-400">
              <svg class="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
              Entre dirigeants
            </div>
          </div>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 lg:p-8">
        <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Introduire un confrère</h3>
        <p class="text-xs text-gray-400 mb-6">Nous le contacterons de votre part avec discr&eacute;tion et professionnalisme.</p>

        <form @submit.prevent="submitInvite" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Entreprise *</label>
              <input
                v-model="form.companyName"
                required
                type="text"
                placeholder="Ex: Maison Dupont, VapeStore Lyon..."
                class="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email du dirigeant *</label>
              <input
                v-model="form.contactEmail"
                required
                type="email"
                placeholder="direction@entreprise.fr"
                class="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Message personnalis&eacute;
              <span class="text-gray-400 font-normal normal-case ml-1">(optionnel)</span>
            </label>
            <textarea
              v-model="form.message"
              rows="3"
              placeholder="Un mot pour contextualiser l'introduction — ex: « On en a parlé lors du salon... »"
              class="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900 resize-none"
            />
          </div>

          <p v-if="error" class="text-sm text-danger-500">{{ error }}</p>

          <button
            type="submit"
            :disabled="submitting || !form.companyName.trim() || !form.contactEmail.trim()"
            class="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
            {{ submitting ? 'Envoi en cours...' : 'Envoyer l\'introduction' }}
          </button>
        </form>

        <!-- Success toast -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div v-if="success" class="mt-4 flex items-center gap-3 bg-success-50 border border-success-100 rounded-xl p-4">
            <svg class="w-5 h-5 text-success-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-success-700">Introduction envoy&eacute;e avec succ&egrave;s</p>
              <p class="text-xs text-success-600">Alexandre prendra contact sous 24h. Merci pour votre confiance.</p>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Introduction tracking -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Vos introductions</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ referrals.length }} introduction(s) &middot; {{ deployedCount }} d&eacute;ploy&eacute;e(s)</p>
          </div>
          <div v-if="deployedCount > 0" class="flex items-center gap-1.5 bg-success-50 text-success-700 text-xs font-bold px-3 py-1.5 rounded-full border border-success-100">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
            {{ deployedCount * 1600 }} &euro; &eacute;conomis&eacute;s
          </div>
        </div>

        <div v-if="referralsLoading" class="p-6 space-y-3">
          <div v-for="i in 3" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        <div v-else-if="!referrals.length" class="p-10 text-center text-gray-400">
          <svg class="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
          <p class="text-sm">Aucune introduction pour le moment</p>
          <p class="text-xs text-gray-300 mt-1">Utilisez le formulaire ci-dessus pour recommander un confrère</p>
        </div>

        <div v-else>
          <div
            v-for="r in referrals"
            :key="r.id"
            class="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <!-- Icone -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
              :class="statusStyle(r.status).bg"
            >
              {{ r.companyName.charAt(0).toUpperCase() }}
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{{ r.companyName }}</p>
              <p class="text-xs text-gray-400 truncate">{{ r.contactEmail }} &middot; {{ formatDate(r.createdAt) }}</p>
            </div>

            <!-- Badge statut -->
            <span
              class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
              :class="statusStyle(r.status).badge"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="statusStyle(r.status).dot" />
              {{ statusStyle(r.status).label }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */
import type { Referral, ReferralStatus } from '~/server/utils/referrals'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()
const { header } = useHeaderDb()

const referrerName = computed(() =>
  header.value?.logo?.text ?? resolvedClientId.value
)

// ── Form ──────────────────────────────────────────────────────────────────────

const form = reactive({
  companyName:  '',
  contactEmail: '',
  message:      '',
})
const submitting = ref(false)
const success    = ref(false)
const error      = ref('')

async function submitInvite() {
  if (submitting.value) return
  submitting.value = true
  error.value      = ''
  success.value    = false

  try {
    await $fetch('/api/growth/invite', {
      method: 'POST',
      body: {
        referrerId:   resolvedClientId.value,
        referrerName: referrerName.value,
        companyName:  form.companyName,
        contactEmail: form.contactEmail,
        message:      form.message || undefined,
      },
    })
    success.value    = true
    form.companyName  = ''
    form.contactEmail = ''
    form.message      = ''
    await loadReferrals()
    setTimeout(() => { success.value = false }, 5000)
  } catch (e: any) {
    error.value = e.data?.message || 'Erreur lors de l\'envoi'
  } finally {
    submitting.value = false
  }
}

// ── Referrals list ────────────────────────────────────────────────────────────

const referrals        = ref<Referral[]>([])
const referralsLoading = ref(true)

const deployedCount = computed(() =>
  referrals.value.filter(r => r.status === 'deployed').length
)

async function loadReferrals() {
  try {
    referrals.value = await $fetch<Referral[]>('/api/growth/referrals', {
      query: { referrerId: resolvedClientId.value },
    })
  } catch {
    referrals.value = []
  } finally {
    referralsLoading.value = false
  }
}

// ── Status styles ─────────────────────────────────────────────────────────────

function statusStyle(status: ReferralStatus) {
  switch (status) {
    case 'deployed':
      return {
        label: 'Infrastructure d\u00e9ploy\u00e9e — R\u00e9compense d\u00e9bloqu\u00e9e !',
        badge: 'bg-success-50 text-success-700 border border-success-100',
        dot:   'bg-success-400',
        bg:    'bg-success-100 text-success-700',
      }
    case 'audit':
      return {
        label: 'Audit en cours',
        badge: 'bg-primary-50 text-primary-700 border border-primary-100',
        dot:   'bg-primary-400',
        bg:    'bg-primary-100 text-primary-700',
      }
    default:
      return {
        label: 'Invitation envoy\u00e9e',
        badge: 'bg-gray-100 dark:bg-slate-800 text-gray-600 border border-gray-200 dark:border-slate-700',
        dot:   'bg-gray-400',
        bg:    'bg-gray-100 dark:bg-slate-800 text-gray-600',
      }
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(loadReferrals)
</script>
