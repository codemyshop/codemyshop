<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    
    <nav class="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      <button
        v-for="m in modes"
        :key="m.key"
        @click="activeMode = m.key"
        class="px-5 py-2.5 text-xs font-semibold transition-colors border-b-2"
        :class="activeMode === m.key
          ? 'border-primary-600 text-primary-700 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'"
      >
        {{ m.label }}
      </button>
    </nav>

    
    <ChatbotScenarioEditor v-if="activeMode === 'scenario'" />

    
  
  <div v-show="activeMode === 'chat'" class="flex min-h-0 overflow-hidden flex-1">
    
    <aside class="w-96 shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800">
      <header class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Chatbot</h1>
          <span v-if="counts.unread > 0" class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold">
            {{ counts.unread }} non lu{{ counts.unread > 1 ? 's' : '' }}
          </span>
        </div>
        <input
          v-model="search"
          type="text"
          placeholder="Email, nom, société, token…"
          class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
          @keyup.enter="reload(true)"
        />
      </header>

      
      <nav class="flex border-b border-gray-100 dark:border-slate-800 shrink-0 text-[11px]">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="setTab(tab.key)"
          class="flex-1 px-2 py-2 font-medium transition-colors border-b-2"
          :class="activeTab === tab.key
            ? 'border-primary-600 text-primary-700 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[16px] text-[9px] px-1 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200">
            {{ tab.count }}
          </span>
        </button>
      </nav>

      
      <div class="flex-1 overflow-y-auto">
        <p v-if="loadingList && items.length === 0" class="text-xs text-gray-400 px-4 py-8 text-center">Chargement…</p>
        <p v-else-if="items.length === 0" class="text-xs text-gray-400 px-4 py-8 text-center">Aucune conversation.</p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-slate-800">
          <li v-for="c in items" :key="c.idConversation">
            <button
              @click="select(c.token)"
              class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors flex gap-3 items-start"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedToken === c.token }"
            >
              <div class="shrink-0 mt-0.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-[11px] font-bold">
                  {{ initials(c) }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {{ displayName(c) }}
                  </p>
                  <span class="text-[10px] text-gray-400 shrink-0">{{ relTime(c.lastMessageAt || c.dateUpd) }}</span>
                </div>
                <p class="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                  {{ c.capturedCompany || c.capturedEmail || '—' }}
                </p>
                <p class="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                  <span v-if="c.lastMessageRole === 'user'" class="text-gray-700 dark:text-slate-200">{{ c.lastMessageSnippet }}</span>
                  <span v-else-if="c.lastMessageRole === 'agent'" class="text-emerald-700 dark:text-emerald-300">↩ {{ c.lastMessageSnippet }}</span>
                  <span v-else class="text-gray-400 italic">{{ c.lastMessageSnippet }}</span>
                </p>
                <div class="flex items-center gap-1 mt-1.5">
                  <span class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                    :class="scenarioBadgeClass(c.scenario)">
                    {{ scenarioLabel(c.scenario) }}
                  </span>
                  <span v-if="c.humanTakeover" class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                    Takeover
                  </span>
                  <span v-if="c.unreadForAdmin" class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold">
                    ●
                  </span>
                  <span v-if="c.status === 'closed'" class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 font-semibold">
                    Clos
                  </span>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </aside>

    
    <main class="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-50 dark:bg-slate-950">
      <div v-if="!detail" class="flex-1 flex items-center justify-center text-xs text-gray-400">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <p>Sélectionnez une conversation</p>
        </div>
      </div>

      <template v-else>
        
        <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
              {{ displayName(detail.conversation) }}
              <span v-if="detail.conversation.capturedCompany" class="text-gray-500 font-normal">— {{ detail.conversation.capturedCompany }}</span>
            </h2>
            <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
              <span v-if="detail.conversation.capturedEmail">{{ detail.conversation.capturedEmail }}</span>
              <span v-if="detail.conversation.capturedPhone">· {{ detail.conversation.capturedPhone }}</span>
              <span v-if="detail.conversation.capturedSiret">· SIRET {{ detail.conversation.capturedSiret }}</span>
              <span class="text-gray-400">· #{{ detail.conversation.idConversation }}</span>
              <a v-if="detail.productContext" :href="`/produit/${detail.productContext.linkRewrite || detail.productContext.idProduct}`" target="_blank" class="text-primary-600 hover:underline">
                🛒 {{ detail.productContext.name }}
              </a>
              <a v-if="detail.conversation.idSmartlead" :href="`/hub/leads`" class="text-primary-600 hover:underline">
                Lead #{{ detail.conversation.idSmartlead }}
              </a>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="detail.conversation.humanTakeover" class="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
              👤 Vous parlez · {{ detail.employee?.firstname || 'agent' }}
            </span>
            <button
              v-else-if="detail.conversation.status !== 'closed'"
              @click="takeover()"
              :disabled="takeoverLoading"
              class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              Reprendre la main
            </button>
            
            <NuxtLink
              v-if="detail.linkedProject"
              :to="`/hub/projects/${detail.linkedProject.idSmartproject}`"
              target="_blank"
              class="text-xs px-3 py-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60 rounded-lg transition-colors flex items-center gap-1"
              :title="`Ouvrir l'item pipeline #${detail.linkedProject.idSmartproject}`"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
              Item #{{ detail.linkedProject.idSmartproject }}
            </NuxtLink>
            <button
              v-else
              @click="openProjectModal()"
              class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
              title="Créer un item de pipeline depuis cette conversation"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Item pipeline
            </button>
            <button
              v-if="detail.conversation.status !== 'closed'"
              @click="closeIt()"
              :disabled="closeLoading"
              class="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >Clôturer</button>
          </div>
        </header>

        
        <div class="flex-1 flex min-h-0 min-w-0">
          
          <div class="flex-1 flex flex-col min-w-0 min-h-0">
            <div ref="threadEl" class="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
              <div v-for="m in detail.messages" :key="m.idMessage"
                class="flex"
                :class="{
                  'justify-end': m.role === 'agent',
                  'justify-start': m.role === 'user',
                  'justify-center': m.role === 'bot',
                }">
                <div
                  class="max-w-[75%] rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap"
                  :class="bubbleClass(m.role)"
                >
                  <p v-if="m.role === 'bot'" class="text-[9px] uppercase tracking-wider text-gray-400 mb-1">Bot</p>
                  <p v-if="m.role === 'agent'" class="text-[9px] uppercase tracking-wider text-emerald-200 mb-1">Vous</p>
                  {{ m.content }}
                  <p class="text-[9px] mt-1 opacity-60 text-right">{{ relTime(m.dateAdd) }}</p>
                </div>
              </div>
            </div>

            
            <div v-if="detail.conversation.humanTakeover && detail.conversation.status !== 'closed'"
              class="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shrink-0">
              <form @submit.prevent="sendReply" class="flex gap-2">
                <textarea
                  v-model="replyMessage"
                  rows="2"
                  placeholder="Tapez votre réponse… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                  class="flex-1 text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                  @keydown.enter.exact.prevent="sendReply"
                />
                <button type="submit" :disabled="!replyMessage.trim() || sending"
                  class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors self-end">
                  Envoyer
                </button>
              </form>
            </div>
            <div v-else-if="!detail.conversation.humanTakeover && detail.conversation.status !== 'closed'"
              class="border-t border-gray-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-[11px] text-amber-800 dark:text-amber-300 shrink-0">
              💡 Le bot pilote actuellement la conversation. Cliquez « Reprendre la main » pour répondre à la place du bot.
            </div>
            <div v-else class="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-[11px] text-gray-500 dark:text-slate-400 shrink-0">
              Conversation clôturée.
            </div>
          </div>

          
          <aside class="w-72 shrink-0 bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 overflow-y-auto p-4 space-y-4 text-xs">
            <div v-if="detail.products.length > 0">
              <h3 class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mb-2">Produits négociés ({{ detail.products.length }})</h3>
              <ul class="space-y-2">
                <li v-for="p in detail.products" :key="p.idLink" class="border border-gray-100 dark:border-slate-800 rounded-lg p-2">
                  <p class="font-medium text-gray-800 dark:text-slate-100 text-[11px] truncate">{{ p.productName || `Produit #${p.idProduct}` }}</p>
                  <dl class="mt-1 space-y-0.5 text-[10px] text-gray-600 dark:text-slate-400">
                    <div v-if="p.qty"><span class="font-medium">Qté :</span> {{ p.qty }}</div>
                    <div v-if="p.freq"><span class="font-medium">Fréquence :</span> {{ p.freq }}</div>
                    <div v-if="p.targetPrice"><span class="font-medium">Prix cible :</span> {{ p.targetPrice }}</div>
                  </dl>
                </li>
              </ul>
            </div>

            <div v-if="detail.answers.length > 0">
              <h3 class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mb-2">Qualif chatbot</h3>
              <dl class="space-y-2">
                <div v-for="a in detail.answers" :key="a.idAnswer">
                  <dt class="font-medium text-gray-700 dark:text-slate-200 text-[11px]">{{ a.recapLabel || a.nodeKey }}</dt>
                  <dd class="text-gray-600 dark:text-slate-400 text-[11px]">{{ a.answer || '—' }}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mb-2">Métadonnées</h3>
              <dl class="space-y-1 text-[10px]">
                <div><dt class="inline font-medium text-gray-500">Tunnel :</dt> <dd class="inline text-gray-700 dark:text-slate-300">{{ scenarioLabel(detail.conversation.scenario) }}</dd></div>
                <div><dt class="inline font-medium text-gray-500">Démarré :</dt> <dd class="inline text-gray-700 dark:text-slate-300">{{ formatDate(detail.conversation.dateAdd) }}</dd></div>
                <div v-if="detail.conversation.humanTakeoverAt"><dt class="inline font-medium text-gray-500">Takeover :</dt> <dd class="inline text-gray-700 dark:text-slate-300">{{ formatDate(detail.conversation.humanTakeoverAt) }}</dd></div>
                <div><dt class="inline font-medium text-gray-500">Token :</dt> <dd class="inline text-gray-400 font-mono break-all">{{ detail.conversation.token.slice(0, 16) }}…</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </template>
    </main>

    
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="projectModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="projectModalOpen = false">
          <form @submit.prevent="submitProjectModal" class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">Créer un item pipeline</h2>
              <button type="button" @click="projectModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </header>

            <div class="px-6 py-5 space-y-4">
              <p class="text-[11px] text-gray-500 dark:text-slate-400">
                Si un lead avec cet email existe déjà, il sera réutilisé. Sinon il sera créé.
              </p>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Email <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="projectForm.email"
                  type="email"
                  required
                  placeholder="contact@société.fr"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">SIRET (14 chiffres)</label>
                <input
                  v-model="projectForm.siret"
                  type="text"
                  inputmode="numeric"
                  pattern="\d{14}"
                  placeholder="01234567890123"
                  maxlength="14"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Titre du projet <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="projectForm.project_title"
                  type="text"
                  required
                  placeholder="Ex. Demande échantillons amandes 25t"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Description
                  <span class="text-gray-400 font-normal">(récap pré-rempli depuis la conversation)</span>
                </label>
                <textarea
                  v-model="projectForm.needs"
                  rows="6"
                  placeholder="Besoins, contexte, niveau d'urgence…"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                />
              </div>

              <p v-if="projectModalError" class="text-xs text-rose-500">{{ projectModalError }}</p>
            </div>

            <footer class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
              <button type="button" @click="projectModalOpen = false" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Annuler</button>
              <button type="submit" :disabled="createProjectLoading" class="text-xs px-4 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {{ createProjectLoading ? 'Envoi…' : 'Envoyer' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>
    </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import ChatbotScenarioEditor from '~/components/chatbot/ScenarioEditor.vue'

type Mode = 'chat' | 'scenario'
const modes: { key: Mode; label: string }[] = [
  { key: 'chat',     label: '💬 Conversations' },
  { key: 'scenario', label: '🧩 Scénario' },
]
const activeMode = ref<Mode>('chat')

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface ConversationItem {
  idConversation:    number
  token:             string
  scenario:          string
  status:            string
  humanTakeover:     boolean
  unreadForAdmin:    boolean
  capturedFirstname: string
  capturedLastname:  string
  capturedEmail:     string
  capturedCompany:   string
  capturedPhone:     string
  productIdContext:  number | null
  idEmployee:        number | null
  idSmartlead:       number | null
  lastMessageAt:     string | null
  lastMessageRole:   string | null
  lastMessageSnippet: string
  dateAdd:           string
  dateUpd:           string
}

const items = ref<ConversationItem[]>([])
const counts = ref({ botOpen: 0, takeoverOpen: 0, closed: 0, unread: 0 })
const loadingList = ref(false)
const search = ref('')
type TabKey = 'open' | 'takeover' | 'closed'
const activeTab = ref<TabKey>('open')

const tabs = computed<Array<{ key: TabKey; label: string; count: number }>>(() => [
  { key: 'open',     label: 'Bot actif', count: counts.value.botOpen },
  { key: 'takeover', label: 'Takeover',  count: counts.value.takeoverOpen },
  { key: 'closed',   label: 'Clos',      count: counts.value.closed },
])

function setTab(key: TabKey) {
  activeTab.value = key
  reload(true)
}

const selectedToken = ref<string | null>(null)
const detail = ref<any>(null)
const takeoverLoading = ref(false)
const closeLoading = ref(false)
const createProjectLoading = ref(false)
const sending = ref(false)

const projectModalOpen = ref(false)
const projectModalError = ref('')
const projectForm = ref({
  email:         '',
  siret:         '',
  project_title: '',
  needs:         '',
})
const replyMessage = ref('')
const threadEl = ref<HTMLElement | null>(null)

async function reload(resetSelection = false) {
  loadingList.value = true
  try {
    
    let status = 'open', takeover = 'all'
    if (activeTab.value === 'open')     { status = 'open';   takeover = '0' }
    if (activeTab.value === 'takeover') { status = 'open';   takeover = '1' }
    if (activeTab.value === 'closed')   { status = 'closed'; takeover = 'all' }

    const r = await $fetch<any>('/api/bo/chatbot/conversations', {
      query: { status, takeover, search: search.value, perPage: 100 },
    })
    items.value = r.items || []
    counts.value = r.counts || counts.value
    if (resetSelection && selectedToken.value && !items.value.some(i => i.token === selectedToken.value)) {
      selectedToken.value = null
      detail.value = null
    }
  } catch (e) {
    console.error('[hub/chatbot] reload error', e)
  } finally {
    loadingList.value = false
  }
}

async function loadDetail(token: string) {
  try {
    const r = await $fetch<any>(`/api/bo/chatbot/${token}`)
    detail.value = r
    
    if (r?.conversation?.unreadForAdmin) {
      $fetch(`/api/bo/chatbot/${token}/mark-read`, { method: 'POST' }).catch(() => {})
    }
    await nextTick()
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  } catch (e) {
    console.error('[hub/chatbot] loadDetail error', e)
    detail.value = null
  }
}

async function select(token: string) {
  selectedToken.value = token
  await loadDetail(token)
  
  reload()
}

async function takeover() {
  if (!detail.value?.conversation?.token) return
  takeoverLoading.value = true
  try {
    await $fetch(`/api/bo/chatbot/${detail.value.conversation.token}/takeover`, { method: 'POST' })
    await loadDetail(detail.value.conversation.token)
    reload()
  } catch (e: any) {
    alert(e?.data?.statusMessage || e?.message || 'Erreur takeover')
  } finally {
    takeoverLoading.value = false
  }
}

function openProjectModal() {
  if (!detail.value?.conversation) return
  const c = detail.value.conversation
  
  const scenarioPrefix = ({
    product: 'Demande produit',
    order:   'SAV commande',
    human:   'Contact direct',
  } as any)[c.scenario] || 'Nouveau client B2B'
  const fallbackName = c.capturedCompany
    || `${c.capturedFirstname || ''} ${c.capturedLastname || ''}`.trim()
    || c.capturedEmail
    || 'prospect'

  
  const lines: string[] = []
  if (detail.value.products?.length) {
    lines.push(`🛒 Produits négociés (${detail.value.products.length}) :`)
    for (const p of detail.value.products) {
      const parts = [p.productName || `Produit #${p.idProduct}`]
      if (p.qty)         parts.push(`qté ${p.qty}`)
      if (p.freq)        parts.push(`fréquence ${p.freq}`)
      if (p.targetPrice) parts.push(`prix cible ${p.targetPrice}`)
      lines.push('• ' + parts.join(' · '))
    }
  }
  if (detail.value.answers?.length) {
    if (lines.length) lines.push('')
    lines.push('📋 Qualif chatbot :')
    for (const a of detail.value.answers) {
      if (a.recapLabel && a.answer) lines.push(`• ${a.recapLabel} : ${a.answer}`)
    }
  }

  projectForm.value = {
    email:         c.capturedEmail || '',
    siret:         c.capturedSiret || '',
    project_title: `${scenarioPrefix} — ${fallbackName}`,
    needs:         lines.join('\n'),
  }
  projectModalError.value = ''
  projectModalOpen.value = true
}

async function submitProjectModal() {
  if (!detail.value?.conversation?.token) return
  projectModalError.value = ''
  createProjectLoading.value = true
  try {
    const r = await $fetch<any>(`/api/bo/chatbot/${detail.value.conversation.token}/create-project`, {
      method: 'POST',
      body: {
        email:         projectForm.value.email.trim(),
        siret:         projectForm.value.siret.replace(/\D/g, ''),
        project_title: projectForm.value.project_title.trim(),
        needs:         projectForm.value.needs.trim(),
      },
    })
    projectModalOpen.value = false
    await loadDetail(detail.value.conversation.token)
    reload()
    if (r?.idSmartproject) {
      window.open(`/hub/projects/${r.idSmartproject}`, '_blank')
    }
  } catch (e: any) {
    projectModalError.value = e?.data?.statusMessage || e?.message || 'Erreur création item pipeline'
  } finally {
    createProjectLoading.value = false
  }
}

async function closeIt() {
  if (!detail.value?.conversation?.token) return
  if (!confirm('Clôturer cette conversation ?')) return
  closeLoading.value = true
  try {
    await $fetch(`/api/bo/chatbot/${detail.value.conversation.token}/close`, { method: 'POST' })
    await loadDetail(detail.value.conversation.token)
    reload()
  } catch (e: any) {
    alert(e?.data?.statusMessage || e?.message || 'Erreur clôture')
  } finally {
    closeLoading.value = false
  }
}

async function sendReply() {
  const msg = replyMessage.value.trim()
  if (!msg || !detail.value?.conversation?.token || sending.value) return
  sending.value = true
  try {
    await $fetch(`/api/bo/chatbot/${detail.value.conversation.token}/reply`, {
      method: 'POST', body: { message: msg },
    })
    replyMessage.value = ''
    await loadDetail(detail.value.conversation.token)
    reload()
  } catch (e: any) {
    alert(e?.data?.statusMessage || e?.message || 'Erreur envoi')
  } finally {
    sending.value = false
  }
}

let pollTimer: any = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (document.hidden) return
    await reload()
    if (selectedToken.value) await loadDetail(selectedToken.value)
  }, 3000)
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }

onMounted(() => { reload(); startPolling() })
onUnmounted(() => stopPolling())

watch(threadEl, async () => {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
})

function displayName(c: any): string {
  const n = `${c.capturedFirstname || ''} ${c.capturedLastname || ''}`.trim()
  if (n) return n
  if (c.capturedEmail) return c.capturedEmail
  if (c.capturedCompany) return c.capturedCompany
  return `Visiteur #${c.idConversation}`
}
function initials(c: any): string {
  const f = (c.capturedFirstname || '').charAt(0).toUpperCase()
  const l = (c.capturedLastname || '').charAt(0).toUpperCase()
  if (f || l) return (f + l) || '?'
  if (c.capturedEmail) return c.capturedEmail.charAt(0).toUpperCase()
  return '?'
}
function scenarioLabel(s: string): string {
  return ({ global: 'B2B', product: 'Produit', order: 'SAV', human: 'Contact' } as any)[s] || s
}
function scenarioBadgeClass(s: string): string {
  return ({
    global:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    product: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    order:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    human:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  } as any)[s] || 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
}
function bubbleClass(role: string): string {
  if (role === 'agent') return 'bg-emerald-600 text-white'
  if (role === 'user')  return 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100'
  return 'bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 italic'
}
function relTime(d: string | null): string {
  if (!d) return ''
  const t = new Date(d).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}
function formatDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(d) }
}
</script>
