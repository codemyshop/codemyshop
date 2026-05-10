<!--
  /**
   *
   * Newsletter form in the footer (below social networks). Enabled/disabled
   * via `cs_footer_config.newsletter_enabled` (toggle builder).
   *
   * GDPR: requires an explicit consent checkbox. The `consent-text`
   * is snapshotted server-side in `cs_newsletter_subscriber.consent_text`
   * at the moment of opt-in to track informed consent.
   *
   * All visible labels go through `t('footer.newsletter.*')` (rule
   * 10bis CLAUDE.md — zero hardcoded strings).
   */
-->
<template>
  <div class="space-y-3">
    <p class="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-400/80">
      {{ title || t('footer.newsletter.title') }}
    </p>
    <p v-if="description" class="text-xs text-gray-400 leading-relaxed">
      {{ description }}
    </p>

    <form
      class="space-y-2"
      novalidate
      @submit.prevent="submit"
    >
      <!-- Honeypot (invisible aux humains, rempli par les bots) -->
      <input
        v-model="honeypot"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        class="absolute -left-[9999px] w-px h-px"
        aria-hidden="true"
      />

      <div class="flex gap-2">
        <input
          v-model="email"
          type="email"
          required
          :placeholder="placeholder || t('footer.newsletter.placeholder')"
          :aria-label="t('footer.newsletter.aria_email')"
          class="flex-1 px-3 py-2 bg-white/[0.04] border border-white/15 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-primary-400/60 transition-colors"
          :disabled="state === 'sending' || state === 'success'"
        />
        <button
          type="submit"
          :disabled="!canSubmit || state === 'sending' || state === 'success'"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {{ ctaLabel || t('footer.newsletter.cta') }}
        </button>
      </div>

      <label class="flex items-start gap-2 text-[10px] text-gray-400 leading-relaxed cursor-pointer select-none">
        <input
          v-model="consent"
          type="checkbox"
          required
          class="mt-0.5 w-3 h-3 accent-primary-500 cursor-pointer shrink-0"
        />
        <span>{{ consentText || t('footer.newsletter.consent_default') }}</span>
      </label>
    </form>

    <!-- Statuts (toujours rendus pour éviter le flash) -->
    <p
      v-if="state === 'success'"
      class="text-[11px] text-emerald-400 leading-relaxed"
    >
      {{ t('footer.newsletter.success') }}
    </p>
    <p
      v-else-if="state === 'error'"
      class="text-[11px] text-rose-400 leading-relaxed"
    >
      {{ errorMessage || t('footer.newsletter.error') }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  placeholder?: string
  ctaLabel?: string
  consentText?: string
  locale?: string | number
}>()

const { t } = useT()

const email     = ref('')
const consent   = ref(false)
const honeypot  = ref('')
const state     = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const canSubmit = computed(
  () => EMAIL_RE.test(email.value.trim()) && consent.value === true,
)

async function submit() {
  if (!canSubmit.value || state.value === 'sending') return
  state.value = 'sending'
  errorMessage.value = ''
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: {
        email:     email.value.trim(),
        locale:    props.locale != null ? String(props.locale) : undefined,
        source:    'footer',
        sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        website:   honeypot.value,
      },
    })
    state.value = 'success'
    email.value = ''
    consent.value = false
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.data?.statusMessage || ''
  }
}
</script>
