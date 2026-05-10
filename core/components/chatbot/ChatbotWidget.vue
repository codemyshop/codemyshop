<template>
  <!-- Widget chatbot — bouton flottant + carte de chat. Mount unique côté
       layout. Conversation persistante en localStorage : si l'user navigue
       entre les pages OU ferme le widget sans cliquer "Envoyer", on reprend
       la conversation au prochain accès. Multi-produits : chaque clic sur
       "Négocier" depuis un produit ajoute le produit à la conversation
       existante, jusqu'au CTA final "Envoyer ma demande". -->
  <div class="fixed bottom-6 right-4 z-50 flex items-end gap-2 pointer-events-none">
    <div
      v-if="open"
      class="pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 sm:w-96 flex flex-col overflow-hidden"
      style="height: 540px; max-height: calc(100vh - 6rem);"
    >
      <header class="flex items-center justify-between bg-primary-600 text-white px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base shrink-0">{{ humanTakeover ? '👤' : '🌿' }}</div>
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-tight truncate">{{ humanTakeover && agentFirstname ? agentFirstname : brandName }}</p>
            <p class="text-[10px] text-white/70 leading-tight">{{ headerSubtitle }}</p>
          </div>
        </div>
        <button @click="closeWidget" class="text-white/80 hover:text-white text-xl leading-none p-1" :aria-label="t('chatbot.chatbot_close_button_aria')">×</button>
      </header>

      <!-- Banner takeover (sales representative took control) -->
      <div v-if="humanTakeover"
        class="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 px-3 py-2 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shrink-0">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        {{ t('chatbot.takeover_banner') }}
      </div>

      <div ref="messagesEl" class="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950">
        <div v-for="(m, i) in messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <div
            class="max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line"
            :class="m.role === 'user'
              ? 'bg-primary-600 text-white rounded-br-md'
              : m.role === 'agent'
                ? 'bg-emerald-600 text-white border border-emerald-700 rounded-bl-md'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'"
            v-html="renderMarkdown(m.content)"
          />
        </div>

        <div v-if="botTyping" class="flex justify-start">
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-3 py-2 flex gap-1">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block typing-dot" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block typing-dot" style="animation-delay: 0.15s" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block typing-dot" style="animation-delay: 0.3s" />
          </div>
        </div>

        <div v-if="!botTyping && !humanTakeover && pendingOptions?.length && !terminal" class="flex flex-col gap-1.5 mt-2">
          <button
            v-for="opt in pendingOptions"
            :key="opt"
            @click="sendReply(opt)"
            class="text-left text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            :disabled="sending"
          >{{ opt }}</button>
        </div>

        <p v-if="error" class="text-xs text-red-500 px-1">{{ error }}</p>
      </div>

      <form
        v-if="canType"
        @submit.prevent="submitText"
        class="border-t border-slate-200 dark:border-slate-700 p-2 flex items-end gap-2 bg-white dark:bg-slate-900"
      >
        <textarea
          v-model="textInput"
          rows="1"
          :placeholder="textPlaceholder"
          class="flex-1 text-sm resize-none border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-300"
          @keydown.enter.exact.prevent="submitText"
          :disabled="sending"
        />
        <button type="submit" :disabled="sending || !textInput.trim()" class="text-xs px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">➤</button>
      </form>

      <div v-else-if="terminal" class="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-center bg-white dark:bg-slate-900">
        <button @click="restart" class="text-xs text-primary-600 hover:underline">{{ t('chatbot.chatbot_restart_button') }}</button>
      </div>
    </div>

    <button
      v-if="!open"
      @click="openWidget('global')"
      class="pointer-events-auto bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center transition-colors relative"
      :aria-label="t('chatbot.chatbot_open_button_aria')"
    >
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
      <!-- Badge number of products under negotiation (visible if conversation pending) -->
      <span
        v-if="hasPendingSession && pendingProductsCount > 0"
        class="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center px-1 shadow"
      >{{ pendingProductsCount }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getApiErrorMessage } from '~/utils/api-error'

const { t } = useT()
const runtimeConfig = useRuntimeConfig()
const brandName = String((runtimeConfig.public as any).brandName || 'Boutique')

interface ChatMsg { role: 'bot' | 'user' | 'agent'; content: string }

/**
 * Renders a sanitized mini-subset of markdown for bot/agent messages.
 * Escape HTML d'abord (anti XSS), puis transforme :
 *   - **gras**  → <strong>gras</strong>
 *   - [label](/url) → <a href="/url">label</a> (URLs internes uniquement, /xxx)
 * Other characters remain unchanged.
 */
function renderMarkdown(raw: string): string {
  if (!raw) return ''
  // 1. Escape HTML
  const esc = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  // 2. **gras** → <strong>
  let out = esc.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  // 3. [label](/url) → <a> (URLs internes seulement, no protocol allowed)
  out = out.replace(
    /\[([^\]]+)\]\((\/[^\s)]+)\)/g,
    '<a href="$2" class="underline font-semibold">$1</a>',
  )
  return out
}

const SESSION_KEY = 'chatbot_session_v1'
interface ChatbotSession { conversationId: number; conversationToken: string; scenario: string }

const open = ref(false)
const messages = ref<ChatMsg[]>([])
const pendingOptions = ref<string[]>([])
const conversationId = ref<number | null>(null)
const conversationToken = ref<string>('')
const productIdContext = ref<number | null>(null)
const currentScenario = ref<string>('global')
const expectsText = ref(false)
const terminal = ref(false)
const botTyping = ref(false)
const sending = ref(false)
const error = ref('')
const textInput = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const hasPendingSession = ref(false)
const pendingProductsCount = ref(0)
const humanTakeover = ref(false)
const agentFirstname = ref('')

const headerSubtitle = computed(() => {
  if (terminal.value) return t('chatbot.chatbot_subtitle_terminal')
  if (humanTakeover.value) return t('chatbot.chatbot_subtitle_takeover')
  if (currentScenario.value === 'product') return t('chatbot.chatbot_subtitle_product')
  if (currentScenario.value === 'order')   return t('chatbot.chatbot_subtitle_order')
  if (currentScenario.value === 'human')   return t('chatbot.chatbot_subtitle_human')
  return t('chatbot.chatbot_subtitle_default')
})
// During takeover: text input always active (the bot no longer asks questions).
const canType = computed(() => (humanTakeover.value || expectsText.value) && !terminal.value)
const textPlaceholder = computed(() =>
  humanTakeover.value
    ? t('chatbot.takeover_input_placeholder')
    : t('chatbot.chatbot_text_input_placeholder'),
)

function scrollToBottom() {
  nextTick(() => { if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight })
}

function readSession(): ChatbotSession | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s?.conversationId && s?.conversationToken) return s as ChatbotSession
  } catch { /* ignore */ }
  return null
}
function saveSession(s: ChatbotSession) {
  if (import.meta.client) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}
function clearSession() {
  if (import.meta.client) localStorage.removeItem(SESSION_KEY)
  hasPendingSession.value = false
  pendingProductsCount.value = 0
}

async function probePendingSession() {
  const s = readSession()
  if (!s) return
  try {
    const state = await $fetch<any>('/api/chatbot/state', {
      query: { conversationId: s.conversationId, token: s.conversationToken },
    })
    if (state?.open) {
      hasPendingSession.value = true
      pendingProductsCount.value = (state.products || []).length
    } else {
      clearSession()
    }
  } catch { clearSession() }
}

async function openWidget(scenario: string, productId: number | null = null, qty: number | null = null) {
  open.value = true
  const session = readSession()
  if (session) {
    await resumeFromSession(session, scenario, productId, qty)
    return
  }
  await startConv(scenario, productId, qty)
}

async function resumeFromSession(session: ChatbotSession, scenario: string, productId: number | null, qty: number | null = null) {
  error.value = ''
  botTyping.value = true
  try {
    const state = await $fetch<any>('/api/chatbot/state', {
      query: { conversationId: session.conversationId, token: session.conversationToken },
    })
    if (!state?.open) {
      clearSession()
      await startConv(scenario, productId, qty)
      return
    }
    conversationId.value = session.conversationId
    conversationToken.value = session.conversationToken
    currentScenario.value = String(state.scenario || scenario)
    productIdContext.value = state.productIdContext || null
    messages.value = (state.messages || []).map((m: any) => ({ role: m.role, content: String(m.content || '') }))
    pendingOptions.value = state.currentType === 'buttons' ? (state.currentOptions || []) : []
    expectsText.value = state.currentType === 'text'
    terminal.value = false
    pendingProductsCount.value = (state.products || []).length
    humanTakeover.value = Boolean(state.humanTakeover)
    agentFirstname.value = String(state.agentFirstname || '')
    // Unconditional poll: we must detect the sales takeover even
    // if the conversation started in pure bot mode.
    startStatePolling()

    // If we reopen via a click "Negotiate" on a new product, we call
    // add-product to add this product to the conversation.
    if (scenario === 'product' && productId && productId !== state.productIdContext) {
      botTyping.value = true
      const r = await $fetch<any>('/api/chatbot/add-product', {
        method: 'POST',
        body: {
          conversationId: session.conversationId,
          conversationToken: session.conversationToken,
          productId,
          qty: qty && qty > 1 ? qty : undefined,
        },
      })
      productIdContext.value = productId
      currentScenario.value = 'product'
      // If qty pre-filled: the backend pushed a user message "Target qty: X"
      // that the state doesn't have yet. We add it optimistically on the frontend.
      if (qty && qty > 1) {
        messages.value.push({ role: 'user', content: t('chatbot.chatbot_user_qty_msg').replace('{qty}', String(qty)) })
      }
      messages.value.push({ role: 'bot', content: r.content })
      pendingOptions.value = r.options || []
      expectsText.value = r.type === 'text'
    }
  } catch (err: any) {
    error.value = getApiErrorMessage(err, t)
    clearSession()
    await startConv(scenario, productId)
    return
  } finally {
    botTyping.value = false
  }
  scrollToBottom()
}

async function restart() {
  clearSession()
  await startConv('global', null)
}

function closeWidget() {
  open.value = false
  stopStatePolling()
}

async function startConv(scenario: string, productId: number | null, qty: number | null = null) {
  error.value = ''
  messages.value = []
  pendingOptions.value = []
  conversationId.value = null
  conversationToken.value = ''
  currentScenario.value = scenario
  productIdContext.value = productId
  expectsText.value = false
  terminal.value = false
  botTyping.value = true
  scrollToBottom()
  try {
    const res = await $fetch<any>('/api/chatbot/start', {
      method: 'POST',
      body: { scenario, productId, qty: qty && qty > 1 ? qty : undefined },
    })
    // If qty pre-filled, we inject the user bubble into the timeline
    if (qty && qty > 1) {
      messages.value.push({ role: 'user', content: `Qté visée : ${qty}` })
    }
    conversationId.value = res.conversationId
    conversationToken.value = res.conversationToken
    saveSession({
      conversationId: res.conversationId,
      conversationToken: res.conversationToken,
      scenario,
    })
    hasPendingSession.value = true
    handleBotMessage(res.message)
    // Poll from the start: allows the visitor to see a takeover
    // triggered by the sales representative while browsing/thinking.
    startStatePolling()
  } catch (err: any) {
    botTyping.value = false
    error.value = getApiErrorMessage(err, t)
  }
}

async function sendReply(message: string) {
  if (!conversationId.value || sending.value) return
  messages.value.push({ role: 'user', content: message })
  pendingOptions.value = []
  sending.value = true
  botTyping.value = true
  scrollToBottom()
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 350))
  try {
    const res = await $fetch<any>('/api/chatbot/reply', {
      method: 'POST',
      body: {
        conversationId: conversationId.value,
        conversationToken: conversationToken.value,
        message,
      },
    })
    handleBotMessage(res.message)
    // Special case: click "Add another product" → close widget,
    // keep the session, wait for the next click on a product's Negotiate button.
    if ((res.message as any)?.awaitMoreProduct || res?.awaitMoreProduct) {
      open.value = false
    }
  } catch (err: any) {
    botTyping.value = false
    error.value = getApiErrorMessage(err, t)
  } finally {
    sending.value = false
  }
}

function submitText() {
  const v = textInput.value.trim()
  if (!v) return
  textInput.value = ''
  sendReply(v)
}

function handleBotMessage(msg: { type: 'buttons' | 'text'; content: string; options?: string[]; terminal?: boolean; nodeKey?: string; humanTakeover?: boolean }) {
  botTyping.value = false
  // In takeover mode, the backend returns content='' — we push nothing
  // (agent messages will arrive via polling state.get).
  if (msg.humanTakeover) {
    humanTakeover.value = true
    pendingOptions.value = []
    expectsText.value = false
    terminal.value = false
    startStatePolling()
    scrollToBottom()
    return
  }
  messages.value.push({ role: 'bot', content: msg.content })
  pendingOptions.value = msg.type === 'buttons' && msg.options ? msg.options : []
  expectsText.value = msg.type === 'text' && !msg.terminal
  terminal.value = Boolean(msg.terminal)
  if (terminal.value) {
    // Conversation sent → local cleanup
    setTimeout(() => clearSession(), 500)
  }
  scrollToBottom()
}

// ─── Polling state.get while conversation is open ──────────────
// Starts at start/resume and runs continuously (4s). Allows the visitor
// to see the sales takeover in real-time even if the conversation was in
// bot mode. Stopped when widget closed (closeWidget) or conversation closes
// (terminal/server status='closed').
let statePollTimer: any = null
function startStatePolling() {
  if (statePollTimer || !import.meta.client) return
  statePollTimer = setInterval(refreshState, 4000)
}
function stopStatePolling() {
  if (statePollTimer) { clearInterval(statePollTimer); statePollTimer = null }
}
async function refreshState() {
  if (!conversationId.value || !conversationToken.value || !open.value) return
  try {
    const state = await $fetch<any>('/api/chatbot/state', {
      query: { conversationId: conversationId.value, token: conversationToken.value },
    })
    if (!state?.open) {
      // Conversation closed on the server side (e.g.: sales representative clicked "Close")
      stopStatePolling()
      humanTakeover.value = false
      return
    }

    const wasTakeover = humanTakeover.value
    const nowTakeover = Boolean(state.humanTakeover)
    agentFirstname.value = String(state.agentFirstname || '')

    if (nowTakeover) {
      // First-time switch: we hide the FSM options, we disable
      // waiting for text input prompted by the bot. The composer remains
      // unrestricted because canType is true via humanTakeover.
      if (!wasTakeover) {
        humanTakeover.value = true
        pendingOptions.value = []
        expectsText.value = false
        botTyping.value = false
      }
      // Reconciliation timeline (nouveaux messages agent + greeting bot
      // injected by takeoverConversation server-side).
      const serverMessages = (state.messages || []).map((m: any) => ({
        role: m.role as 'bot' | 'user' | 'agent', content: String(m.content || ''),
      }))
      if (serverMessages.length !== messages.value.length) {
        messages.value = serverMessages
        scrollToBottom()
      }
    } else if (wasTakeover) {
      // Very rare: sales representative canceled the takeover (no UI yet
      // but possible via DB). We remain in "unrestricted input" mode for
      // now — the bot doesn't resume on its own.
      humanTakeover.value = false
    }
  } catch { /* silent — re-essayé au prochain tick */ }
}

function onChatbotOpenEvent(e: Event) {
  const detail = (e as CustomEvent).detail || {}
  openWidget(detail.scenario || 'global', detail.productId || null, detail.qty || null)
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('chatbot:open', onChatbotOpenEvent)
    probePendingSession()
  }
})
onBeforeUnmount(() => {
  stopStatePolling()
  if (import.meta.client) window.removeEventListener('chatbot:open', onChatbotOpenEvent)
})
</script>

<style scoped>
.typing-dot {
  animation: typing-bob 1.2s infinite ease-in-out;
}
@keyframes typing-bob {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-3px); opacity: 1; }
}
</style>
