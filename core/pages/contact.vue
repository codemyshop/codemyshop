
<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: false })

const { t } = useHubT()

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const contactEmail = String((cfg.public as any).contactEmail ?? '')
const contactPhone = String((cfg.public as any).contactPhone ?? '')
const contactDescription = String((cfg.public as any).contactDescription ?? '')
const warehouses = ((cfg.public as any).warehouses ?? []) as Array<{ label: string; address_html: string }>

const telHref = computed(() => contactPhone ? `tel:${contactPhone.replace(/[^+\d]/g, '')}` : '')

useHead({
  title: brand ? `Nous contacter — ${brand}` : 'Nous contacter',
  meta: contactDescription ? [{ name: 'description', content: contactDescription }] : [],
})

const form = reactive({ company: '', siret: '', name: '', email: '', phone: '', message: '' })
const sent      = ref(false)
const submitting = ref(false)
const errorMsg  = ref('')

interface SiretLookup {
  status: 'idle' | 'pending' | 'ok' | 'error'
  companyName?: string
  city?: string
  error?: string
}
const siretLookup = reactive<SiretLookup>({ status: 'idle' })
let siretDebounce: ReturnType<typeof setTimeout> | null = null

function onSiretInput() {
  const cleaned = form.siret.replace(/\D/g, '')
  if (siretDebounce) clearTimeout(siretDebounce)
  if (cleaned.length === 0) { siretLookup.status = 'idle'; return }
  if (cleaned.length < 14)  { siretLookup.status = 'pending'; return }
  siretLookup.status = 'pending'
  siretDebounce = setTimeout(async () => {
    try {
      const r = await $fetch<{ valid: boolean; companyName?: string; city?: string; error?: string }>(
        '/api/siret-verify', { query: { siret: cleaned } },
      )
      if (r.valid) {
        siretLookup.status = 'ok'
        siretLookup.companyName = r.companyName
        siretLookup.city = r.city
      } else {
        siretLookup.status = 'error'
        siretLookup.error = r.error || 'SIRET introuvable'
      }
    } catch {
      siretLookup.status = 'error'
      siretLookup.error = 'Vérification indisponible, réessayez.'
    }
  }, 500)
}

interface EmailLookup {
  status: 'idle' | 'pending' | 'ok' | 'unknown' | 'rejected' | 'mx_missing' | 'invalid'
}
const emailLookup = reactive<EmailLookup>({ status: 'idle' })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onEmailBlur() {
  const v = form.email.trim()
  if (!v || !EMAIL_RE.test(v)) { emailLookup.status = 'invalid'; return }
  emailLookup.status = 'pending'
  try {
    const r = await $fetch<{ status: string }>('/api/email-verify', { query: { email: v } })
    if (r.status === 'ok') emailLookup.status = 'ok'
    else if (r.status === 'rejected') emailLookup.status = 'rejected'
    else if (r.status === 'mx_missing') emailLookup.status = 'mx_missing'
    else emailLookup.status = 'unknown'  
  } catch {
    emailLookup.status = 'unknown'
  }
}
function onEmailInput() {
  
  if (emailLookup.status !== 'idle') emailLookup.status = 'idle'
}

const siretValid = computed(() => siretLookup.status === 'ok')
const emailBlocked = computed(() => emailLookup.status === 'rejected' || emailLookup.status === 'mx_missing' || emailLookup.status === 'invalid')
const canSubmit = computed(() => !submitting.value && siretValid.value && !emailBlocked.value)

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        company: form.company,
        siret:   form.siret.replace(/\D/g, ''),
        name:    form.name,
        email:   form.email,
        phone:   form.phone,
        message: form.message,
      },
    })
    sent.value = true
  }
  catch (err: unknown) {
    errorMsg.value = getApiErrorMessage(err, t)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-white">

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">{{ t('contact.contact_page_title') }}</h1>

        <div class="grid md:grid-cols-2 gap-12">

          
          <div>
            <div class="space-y-6">
              <div v-if="contactPhone">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_phone') }}</h2>
                <a :href="telHref" class="text-lg font-semibold text-primary-600 hover:underline">{{ contactPhone }}</a>
              </div>
              <div v-if="contactEmail">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_email') }}</h2>
                <a :href="`mailto:${contactEmail}`" class="text-lg font-semibold text-primary-600 hover:underline">{{ contactEmail }}</a>
              </div>
              <div>
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_hours') }}</h2>
                <p class="text-sm text-gray-600 leading-relaxed">
                  {{ t('contact.contact_hours_weekday') }}<br>
                  {{ t('contact.contact_hours_friday') }}
                </p>
              </div>
              <div v-if="warehouses.length">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_warehouses') }}</h2>
                <p v-for="(w, i) in warehouses" :key="i" class="text-sm text-gray-600" :class="{ 'mt-2': i > 0 }">
                  <strong>{{ w.label }}</strong><br>
                  <span v-html="w.address_html" />
                </p>
              </div>
            </div>
          </div>

          
          <div>
            <div v-if="sent" class="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <p class="text-emerald-700 font-semibold">{{ t('contact.contact_sent_title') }}</p>
              <p class="text-sm text-emerald-600 mt-1">{{ t('contact.contact_sent_subtitle') }}</p>
            </div>
            <form v-else class="space-y-4" @submit.prevent="onSubmit">
              <div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                {{ errorMsg }}
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_company') }}</label>
                <input v-model="form.company" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET <span class="text-red-500">*</span></label>
                <input
                  v-model="form.siret"
                  type="text"
                  inputmode="numeric"
                  maxlength="17"
                  placeholder="12345678901234"
                  required
                  :class="[
                    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none',
                    siretLookup.status === 'ok' ? 'border-emerald-500 focus:border-emerald-600' :
                    siretLookup.status === 'error' ? 'border-red-500 focus:border-red-600' :
                    'border-gray-200 focus:border-primary-600',
                  ]"
                  @input="onSiretInput"
                />
                <p v-if="siretLookup.status === 'pending'" class="mt-1 text-xs text-gray-400">Vérification…</p>
                <p v-else-if="siretLookup.status === 'ok'" class="mt-1 text-xs text-emerald-700">
                  ✓ {{ siretLookup.companyName }}<span v-if="siretLookup.city"> · {{ siretLookup.city }}</span>
                </p>
                <p v-else-if="siretLookup.status === 'error'" class="mt-1 text-xs text-red-600">
                  ✗ {{ siretLookup.error }}
                </p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_name') }}</label>
                  <input v-model="form.name" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_phone_field') }}</label>
                  <input v-model="form.phone" type="tel" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">
                  {{ t('contact.contact_label_email_field') }} <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  :class="[
                    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none',
                    emailLookup.status === 'ok' ? 'border-emerald-500 focus:border-emerald-600' :
                    emailLookup.status === 'rejected' || emailLookup.status === 'mx_missing' || emailLookup.status === 'invalid' ? 'border-red-500 focus:border-red-600' :
                    emailLookup.status === 'unknown' ? 'border-amber-400 focus:border-amber-500' :
                    'border-gray-200 focus:border-primary-600',
                  ]"
                  @blur="onEmailBlur"
                  @input="onEmailInput"
                />
                <p v-if="emailLookup.status === 'pending'" class="mt-1 text-xs text-gray-400">Vérification de l'adresse…</p>
                <p v-else-if="emailLookup.status === 'ok'" class="mt-1 text-xs text-emerald-700">✓ Adresse vérifiée</p>
                <p v-else-if="emailLookup.status === 'rejected'" class="mt-1 text-xs text-red-600">✗ Cette adresse n'existe pas</p>
                <p v-else-if="emailLookup.status === 'mx_missing'" class="mt-1 text-xs text-red-600">✗ Domaine email invalide</p>
                <p v-else-if="emailLookup.status === 'invalid'" class="mt-1 text-xs text-red-600">✗ Format email invalide</p>
                <p v-else-if="emailLookup.status === 'unknown'" class="mt-1 text-xs text-amber-700">⚠ Adresse non vérifiable, votre demande sera traitée mais vérifiez l'orthographe.</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_message') }}</label>
                <textarea v-model="form.message" rows="5" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none resize-none" />
              </div>
              <button
                type="submit"
                :disabled="!canSubmit"
                class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {{ submitting ? t('contact.contact_submitting') : t('contact.contact_submit') }}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
