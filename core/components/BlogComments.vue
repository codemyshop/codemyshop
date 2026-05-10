<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

const { t } = useT()

const props = defineProps<{
  articleId: number
  articleTitle: string
}>()

const { public: publicConfig } = useRuntimeConfig()
const responderName = (publicConfig.ownerName as string) || (publicConfig.brandName as string) || 'L\'auteur'
const responderAvatar = (publicConfig.ownerAvatar as string) || ''

interface Comment {
  id: string
  author: string
  content: string
  aiResponse: string | null
  aiRespondedAt: string | null
  createdAt: string
}

const { data: comments, refresh } = await useFetch<Comment[]>(`/api/blog/comments/${props.articleId}`, {
  default: () => [],
})

const form = reactive({ author: '', email: '', content: '' })
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

function formatDate(raw: string): string {
  if (!raw) return ''
  return new Date(raw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function submit() {
  if (!form.author.trim() || !form.email.trim() || !form.content.trim()) return
  submitting.value = true
  errorMsg.value = ''

  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/blog/comments', {
      method: 'POST',
      body: { articleId: props.articleId, ...form },
    })
    if (res.success) {
      submitted.value = true
      form.author = ''
      form.email = ''
      form.content = ''
      // Refresh after a delay (the comment is pending, not yet visible)
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.message || t('common.common_error_generic')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mt-14">
    <div class="flex items-center gap-2 mb-6">
      <svg class="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ t('blogcomments.comments_section_title') }}
        <span v-if="comments?.length" class="text-sm font-normal text-gray-400 dark:text-slate-400 ml-1">({{ comments.length }})</span>
      </h2>
    </div>

    <!-- Commentaires existants -->
    <div v-if="comments?.length" class="space-y-5 mb-10">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden"
      >
        <!-- Visitor comment -->
        <div class="px-5 py-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400">
              {{ comment.author.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-white">{{ comment.author }}</p>
              <p class="text-[10px] text-gray-400 dark:text-slate-400">{{ formatDate(comment.createdAt) }}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ comment.content }}</p>
        </div>

        <!-- AI response (if available) -->
        <div
          v-if="comment.aiResponse"
          class="px-5 py-4 bg-primary-50/50 dark:bg-primary-500/[0.04] border-t border-primary-100 dark:border-primary-500/10"
        >
          <div class="flex items-center gap-2 mb-2">
            <img v-if="responderAvatar" :src="responderAvatar" :alt="responderName" class="w-8 h-8 rounded-full object-cover" loading="lazy" onerror="this.style.display='none'">
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-white">
                {{ responderName }}
                <span class="ml-1.5 text-[9px] font-medium text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-full align-middle">via IA</span>
              </p>
              <p class="text-[10px] text-gray-400 dark:text-slate-400">{{ formatDate(comment.aiRespondedAt || '') }}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ comment.aiResponse }}</p>
        </div>
      </div>
    </div>

    <!-- Formulaire -->
    <div class="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <div v-if="submitted" class="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4">
        {{ t('blogcomments.comments_submit_success_message') }}
      </div>
      <form v-else @submit.prevent="submit" class="space-y-4">
        <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-1">{{ t('blogcomments.comments_form_subtitle') }}</h3>
        <p class="text-xs text-gray-400 dark:text-slate-400 mb-3">{{ t('blogcomments.comments_form_hint') }}</p>

        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label for="comment-author" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{{ t('blogcomments.comments_label_author') }}</label>
            <input
              id="comment-author"
              v-model="form.author"
              type="text"
              required
              maxlength="100"
              :placeholder="t('blogcomments.comments_placeholder_author')"
              class="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
          </div>
          <div>
            <label for="comment-email" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{{ t('blogcomments.comments_label_email') }} <span class="text-gray-300 dark:text-slate-600">{{ t('blogcomments.comments_email_not_displayed') }}</span></label>
            <input
              id="comment-email"
              v-model="form.email"
              type="email"
              required
              :placeholder="t('blogcomments.comments_placeholder_email')"
              class="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
          </div>
        </div>

        <div>
          <label for="comment-content" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{{ t('blogcomments.comments_label_content') }}</label>
          <textarea
            id="comment-content"
            v-model="form.content"
            rows="4"
            required
            minlength="10"
            maxlength="2000"
            :placeholder="t('blogcomments.comments_placeholder_content')"
            class="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
          />
          <p class="text-[10px] text-gray-300 dark:text-slate-600 mt-1 text-right">{{ form.content.length }} / 2000</p>
        </div>

        <div v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</div>

        <button
          type="submit"
          :disabled="submitting"
          class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {{ submitting ? t('blogcomments.comments_submit_button_loading') : t('blogcomments.comments_submit_button_default') }}
        </button>
        <p
          class="text-[10px] text-gray-400 dark:text-slate-600 leading-relaxed mt-3"
          v-html="t('blogcomments.comments_privacy_notice')"
        />
      </form>
    </div>
  </section>
</template>
