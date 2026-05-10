<!--
  Academy Q&A — UGC simplifié
  Question pré-remplie + email = zéro friction

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <div class="mt-8 border-t border-gray-200 dark:border-white/[0.06] pt-6">
    <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
      <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
      {{ t('academy.academy_qa_section_title') }} <span v-if="qaList.length" class="text-gray-400 dark:text-slate-600 font-normal">({{ qaList.length }})</span>
    </h4>

    <!-- Q&A existantes -->
    <div v-for="qa in qaList" :key="qa.id_qa" :id="`qa-${qa.id_qa}`" class="mb-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200/60 dark:border-white/[0.06] p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-primary-600 dark:text-primary-400">{{ qa.pseudo }}</span>
        <span class="text-[10px] text-gray-400 dark:text-slate-600">{{ formatDate(qa.date_add) }}</span>
      </div>
      <p class="text-sm text-gray-800 dark:text-slate-200 font-medium mb-3">{{ qa.question }}</p>
      <div v-if="qa.ai_answer" class="bg-primary-50 dark:bg-primary-500/10 rounded-lg p-3 border border-primary-200/50 dark:border-primary-500/20">
        <p class="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">{{ t('academy.academy_qa_ai_answer_label') }}</p>
        <p class="text-xs text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ qa.ai_answer }}</p>
      </div>
      <button @click="upvote(qa)" class="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" :class="qa.voted ? 'text-primary-500 dark:text-primary-400' : ''">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
        {{ qa.upvotes }}
      </button>
    </div>

    <!-- ═══ SIMPLIFIED FORM ═══ -->
    <div class="mt-4 p-5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06]">

      <!-- Step 1: Pre-filled question + email -->
      <div v-if="step === 'ask'">
        <p class="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3">{{ t('academy.academy_qa_hint_text') }}</p>
        <textarea
          v-model="question"
          rows="2"
          maxlength="1000"
          class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors resize-none mb-3"
          :placeholder="suggestedQuestion || t('academy.academy_qa_textarea_placeholder')"
        />
        <div class="flex gap-2">
          <input
            v-model="email"
            type="email"
            required
            class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
            :placeholder="t('academy.academy_qa_email_placeholder')"
          />
          <button
            @click="submitEmail"
            :disabled="!email || question.length < 10 || submitting"
            class="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {{ submitting ? t('academy.academy_qa_submit_button_loading') : t('academy.academy_qa_submit_button_default') }}
          </button>
        </div>
        <p class="text-[10px] text-gray-400 dark:text-slate-600 mt-2" v-html="t('academy.academy_qa_privacy_notice')" />
      </div>

      <!-- Step 2: Password (existing email) -->
      <div v-if="step === 'password'">
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">{{ t('academy.academy_qa_password_hint') }}</p>
        <form @submit.prevent="submitPassword" class="flex gap-2">
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
            :placeholder="t('academy.password_placeholder')"
            autofocus
          />
          <button
            type="submit"
            :disabled="!password || submitting"
            class="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            {{ submitting ? t('academy.academy_qa_password_button_loading') : t('academy.academy_qa_password_button_default') }}
          </button>
        </form>
        <button @click="step = 'ask'" class="text-[10px] text-gray-400 hover:text-gray-600 mt-2">{{ t('academy.academy_qa_back_to_email') }}</button>
      </div>

      <!-- Step 3: Success -->
      <div v-if="step === 'done'" class="text-center py-2">
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{{ t('academy.academy_qa_success_title') }}</p>
        <p class="text-xs text-gray-400 dark:text-slate-600">{{ t('academy.academy_qa_success_message') }}</p>
        <button @click="resetForm" class="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2">{{ t('academy.academy_qa_ask_another') }}</button>
      </div>

      <!-- Erreur -->
      <p v-if="submitError" class="text-xs text-red-500 mt-2">{{ submitError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useT()

interface QaEntry {
  id_qa: number
  question: string
  ai_answer: string
  pseudo: string
  upvotes: number
  date_add: string
  voted?: boolean
}

const props = defineProps<{
  moduleSlug: string
  lessonIndex: number
  suggestedQuestion?: string
}>()

const qaList = ref<QaEntry[]>([])
const step = ref<'ask' | 'password' | 'done'>('ask')
const question = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)
const submitError = ref('')

// Load the suggested question from the DB
async function loadSuggestion() {
  try {
    const result = await $fetch<{ success: boolean; question: string | null }>('/api/academy/suggestion', {
      params: { module_slug: props.moduleSlug, lesson_index: props.lessonIndex },
    })
    if (result.question) {
      question.value = result.question
    } else if (props.suggestedQuestion) {
      question.value = props.suggestedQuestion
    }
  } catch {
    if (props.suggestedQuestion) question.value = props.suggestedQuestion
  }
}

// Load the Q&A
async function loadQa() {
  try {
    const result = await $fetch<{ success: boolean; qa: QaEntry[] }>('/api/academy/qa', {
      params: { module_slug: props.moduleSlug, lesson_index: props.lessonIndex },
    })
    if (result.success) qaList.value = result.qa
  } catch { /* silently fail */ }
}

onMounted(() => { loadQa(); loadSuggestion() })
watch(() => props.lessonIndex, () => { loadQa(); loadSuggestion(); resetForm() })

// Step 1: submit the email
async function submitEmail() {
  submitError.value = ''
  submitting.value = true

  try {
    const result = await $fetch<{ success: boolean; needsPassword?: boolean; qa?: QaEntry; error?: string }>('/api/academy/qa', {
      method: 'POST',
      body: {
        module_slug: props.moduleSlug,
        lesson_index: props.lessonIndex,
        question: question.value,
        email: email.value,
      },
    })

    if (result.needsPassword) {
      step.value = 'password'
    } else if (result.success) {
      if (result.qa) qaList.value.unshift(result.qa)
      step.value = 'done'
    } else {
      submitError.value = result.error || t('common.common_error_generic')
    }
  } catch (err: any) {
    submitError.value = err?.data?.message || t('common.common_error_server')
  } finally {
    submitting.value = false
  }
}

// Step 2: submit with password
async function submitPassword() {
  submitError.value = ''
  submitting.value = true

  try {
    const result = await $fetch<{ success: boolean; qa?: QaEntry; error?: string }>('/api/academy/qa', {
      method: 'POST',
      body: {
        module_slug: props.moduleSlug,
        lesson_index: props.lessonIndex,
        question: question.value,
        email: email.value,
        password: password.value,
      },
    })

    if (result.success) {
      if (result.qa) qaList.value.unshift(result.qa)
      step.value = 'done'
    } else {
      submitError.value = result.error || t('academy.auth_error_credentials')
    }
  } catch (err: any) {
    submitError.value = err?.data?.message || t('common.common_error_server')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  step.value = 'ask'
  question.value = props.suggestedQuestion || ''
  password.value = ''
  submitError.value = ''
}

async function upvote(qa: QaEntry) {
  if (qa.voted) return
  try {
    const result = await $fetch<{ success: boolean; upvotes: number }>(`/api/academy/qa/${qa.id_qa}/upvote`, { method: 'POST' })
    if (result.success) { qa.upvotes = result.upvotes; qa.voted = true }
  } catch { /* ignore */ }
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}
</script>
