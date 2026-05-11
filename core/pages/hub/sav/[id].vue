<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/hub/sav" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div v-if="thread" class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
            Ticket #{{ thread.id }}
          </h1>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :class="statusClass(thread.status)">
            {{ statusLabel(thread.status) }}
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ thread.customerName }} — {{ thread.email }}
          <span v-if="thread.orderReference" class="ml-2 text-gray-300">•</span>
          <span v-if="thread.orderReference" class="ml-2">
            Commande <NuxtLink :to="`/hub/orders/${thread.orderId}`" class="text-primary-600 hover:underline font-medium">{{ thread.orderReference }}</NuxtLink>
          </span>
        </p>
      </div>
      <div v-else class="flex-1" />
    </header>

    <div v-if="loading" class="flex-1 overflow-auto px-6 py-6">
      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-96 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-96 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="thread" class="flex-1 overflow-auto px-6 py-6">
      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        <div class="lg:col-span-2 space-y-6">
          
          <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <header class="flex items-center justify-between mb-5">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Conversation</h2>
              <span class="text-xs text-gray-400">{{ messages.length }} message{{ messages.length > 1 ? 's' : '' }}</span>
            </header>

            <div v-if="!messages.length" class="text-center py-8 text-xs text-gray-400">
              Aucun message dans ce ticket.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex"
                :class="m.fromEmployee ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm"
                  :class="m.fromEmployee
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 rounded-tl-sm'"
                >
                  <div class="text-[10px] font-medium mb-1" :class="m.fromEmployee ? 'text-white/70' : 'text-gray-400'">
                    <span v-if="m.fromEmployee">
                      ★ {{ (m.employeeFirstname || m.employeeLastname) ? `${m.employeeFirstname} ${m.employeeLastname}`.trim() : 'Équipe' }}
                    </span>
                    <span v-else>
                      {{ thread.customerName }}
                    </span>
                    <span class="ml-1.5 opacity-80">— {{ formatDateTime(m.dateAdd) }}</span>
                  </div>
                  <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ m.message }}</p>
                </div>
              </div>
            </div>
          </section>

          
          <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <header class="mb-4">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Répondre au client</h2>
              <p class="text-[11px] text-gray-400 mt-0.5">
                La réponse est envoyée par email via PrestaShop (template reply_msg) depuis l'adresse du tenant.
              </p>
            </header>

            <textarea
              v-model="reply"
              rows="6"
              placeholder="Bonjour, suite à votre demande concernant…"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none resize-y"
            />

            <div class="flex items-center justify-between mt-4 flex-wrap gap-3">
              <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                Statut après envoi
                <select
                  v-model="replyStatus"
                  class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="closed">Fermé</option>
                  <option value="pending1">En attente client</option>
                  <option value="pending2">En attente interne</option>
                  <option value="open">Laisser ouvert</option>
                </select>
              </label>

              <div class="flex items-center gap-2">
                <span v-if="replySuccess" class="text-xs text-green-600 font-medium">
                  Envoyé {{ replySuccess.to ? `à ${replySuccess.to}` : '' }}
                  <span v-if="replySuccess.mail_sent === false" class="text-amber-600">(mail KO — message enregistré)</span>
                </span>
                <span v-if="replyError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="replyError">
                  {{ replyError }}
                </span>
                <button
                  type="button"
                  @click="sendReply"
                  :disabled="sending || !reply.trim()"
                  class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
                >
                  {{ sending ? 'Envoi…' : 'Envoyer la réponse' }}
                </button>
              </div>
            </div>
          </section>
        </div>

        
        <aside class="space-y-6">
          
          <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Statut du ticket</h2>
            <div class="space-y-2">
              <button
                v-for="s in ALL_STATUSES"
                :key="s.value"
                type="button"
                @click="updateStatus(s.value)"
                :disabled="thread.status === s.value || updatingStatus"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                :class="thread.status === s.value
                  ? 'bg-primary-600 text-white cursor-default'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700'"
              >
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="s.dot" />
                  {{ s.label }}
                </span>
                <span v-if="thread.status === s.value" class="text-[10px]">●</span>
              </button>
            </div>
          </section>

          
          <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Client</h2>
            <div v-if="customer" class="space-y-2 text-xs">
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Nom</span>
                <NuxtLink :to="`/hub/contacts/${customer.id}`" class="text-primary-600 hover:underline font-medium truncate">
                  {{ customer.firstname }} {{ customer.lastname }}
                </NuxtLink>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Email</span>
                <span class="text-gray-700 dark:text-slate-200 truncate">{{ customer.email }}</span>
              </div>
              <div v-if="customer.company" class="flex justify-between gap-3">
                <span class="text-gray-400">Société</span>
                <span class="text-gray-700 dark:text-slate-200 truncate">{{ customer.company }}</span>
              </div>
              <div v-if="customer.siret" class="flex justify-between gap-3">
                <span class="text-gray-400">SIRET</span>
                <span class="text-gray-700 dark:text-slate-200 font-mono">{{ customer.siret }}</span>
              </div>
              <div class="flex justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <span class="text-gray-400">Commandes</span>
                <span class="text-gray-700 dark:text-slate-200 font-bold">{{ customer.nbOrders }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">CA TTC</span>
                <span class="text-gray-700 dark:text-slate-200 font-bold">{{ formatEur(customer.totalSpent) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Inscrit le</span>
                <span class="text-gray-700 dark:text-slate-200">{{ formatDate(customer.dateAdd) }}</span>
              </div>
            </div>
            <div v-else class="text-xs text-gray-400">
              Ticket anonyme (formulaire contact) — pas de compte client associé.
            </div>
          </section>

          
          <section v-if="order" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Commande liée</h2>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Référence</span>
                <NuxtLink :to="`/hub/orders/${order.id}`" class="text-primary-600 hover:underline font-mono font-bold">
                  {{ order.reference }}
                </NuxtLink>
              </div>
              <div v-if="order.statusName" class="flex justify-between gap-3">
                <span class="text-gray-400">Statut</span>
                <span class="text-gray-700 dark:text-slate-200">{{ order.statusName }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Total TTC</span>
                <span class="text-gray-700 dark:text-slate-200 font-bold">{{ formatEur(order.totalPaidTTC) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-gray-400">Date</span>
                <span class="text-gray-700 dark:text-slate-200">{{ formatDate(order.dateAdd) }}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <p class="text-sm text-gray-500">Ticket introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('crm_sav')) {
  navigateTo('/hub/dashboard')
}

const route = useRoute()

const thread = ref<any>(null)
const customer = ref<any>(null)
const order = ref<any>(null)
const messages = ref<any[]>([])
const loading = ref(true)

const reply = ref('')
const replyStatus = ref<'open' | 'closed' | 'pending1' | 'pending2'>('closed')
const sending = ref(false)
const replyError = ref<string | null>(null)
const replySuccess = ref<{ to?: string; mail_sent?: boolean } | null>(null)

const updatingStatus = ref(false)

const ALL_STATUSES = [
  { value: 'open',     label: 'Ouvert',             dot: 'bg-red-400' },
  { value: 'pending1', label: 'En attente client',  dot: 'bg-amber-400' },
  { value: 'pending2', label: 'En attente interne', dot: 'bg-amber-400' },
  { value: 'closed',   label: 'Fermé',              dot: 'bg-emerald-400' },
]

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/sav/${route.params.id}`)
    thread.value = data.thread
    customer.value = data.customer
    order.value = data.order
    messages.value = data.messages ?? []
  } catch (err) {
    console.error('Load SAV thread error:', err)
    thread.value = null
  } finally {
    loading.value = false
  }
}

async function sendReply() {
  if (!reply.value.trim()) return
  sending.value = true
  replyError.value = null
  replySuccess.value = null
  try {
    const res = await $fetch<any>(`/api/bo/sav/${route.params.id}/reply`, {
      method: 'POST',
      body: { message: reply.value, status: replyStatus.value },
    })
    replySuccess.value = { to: res?.to, mail_sent: res?.mail_sent }
    reply.value = ''
    
    await load()
    setTimeout(() => { replySuccess.value = null }, 5000)
  } catch (err: any) {
    console.error('Reply error:', err)
    replyError.value = err?.data?.message || err?.message || 'Échec de l\'envoi'
    setTimeout(() => { replyError.value = null }, 6000)
  } finally {
    sending.value = false
  }
}

async function updateStatus(status: string) {
  if (!thread.value || thread.value.status === status) return
  updatingStatus.value = true
  try {
    await $fetch(`/api/bo/sav/${route.params.id}/status`, {
      method: 'PUT',
      body: { status },
    })
    thread.value.status = status
  } catch (err) {
    console.error('Status update error:', err)
  } finally {
    updatingStatus.value = false
  }
}

function statusClass(s: string) {
  if (s === 'open') return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  if (s === 'closed') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
  return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
}

function statusLabel(s: string) {
  if (s === 'open') return 'Ouvert'
  if (s === 'closed') return 'Fermé'
  if (s === 'pending1') return 'En attente client'
  if (s === 'pending2') return 'En attente interne'
  return s
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatDateTime(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(load)
</script>
