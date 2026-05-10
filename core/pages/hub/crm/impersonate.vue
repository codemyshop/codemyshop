<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Page Mode Commercial — verticale food, brique food-impersonate.

  3 panneaux :
    1. Session active (si présente) avec bouton Quitter
    2. Recherche client + raison + bouton "Prendre la main"
    3. Audit RGPD — 50 dernières sessions (filtre status)

  ACL côté API : sales / commercial / founder / root / SaaS.
  Cette page est gatée côté sidebar par feature flag food-impersonate ;
  les non-habilités obtiendront un 403 sur les endpoints (et l'UI le reflète).
-->
<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">🎭 Mode Commercial</h1>
        <p class="text-xs text-gray-400 mt-0.5">Impersonation B2B · session 2h max · audit RGPD</p>
      </div>
      <button @click="loadAll" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
        Actualiser
      </button>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- Panneau 1 — Session active -->
      <section v-if="active" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎭</span>
          <div class="flex-1">
            <p class="font-semibold text-orange-800 dark:text-orange-200">
              Vous êtes actuellement connecté en tant que
              {{ active.customerLabel || active.customerEmail || ('client #' + active.idCustomer) }}
            </p>
            <p class="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
              Session #{{ active.idSession }} ouverte à {{ formatDateTime(active.startedAt) }} · expire à {{ formatDateTime(active.expiresAt) }}
            </p>
            <p v-if="active.reason" class="text-xs text-orange-700/70 dark:text-orange-300/70 mt-0.5 italic">Raison : « {{ active.reason }} »</p>
          </div>
          <button @click="quit" :disabled="busy" class="text-sm px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold disabled:opacity-50">
            Quitter la session
          </button>
        </div>
      </section>

      <!-- Panel 2 — Start -->
      <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4 text-gray-700 dark:text-slate-200">Prendre la main sur un client</h2>

        <div class="space-y-3">
          <label class="block text-xs">
            <span class="text-gray-500 dark:text-slate-400">Recherche client (nom, email, société, id)</span>
            <input
              v-model="search"
              @input="debouncedSearch"
              type="text"
              placeholder="Tapez 3 caractères minimum…"
              class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950"
            />
          </label>

          <div v-if="searchLoading" class="text-xs text-gray-400 py-2">Recherche…</div>
          <ul v-else-if="searchResults.length > 0" class="border border-gray-100 dark:border-slate-800 rounded-lg max-h-64 overflow-auto divide-y divide-gray-100 dark:divide-slate-800">
            <li v-for="c in searchResults" :key="c.id"
              @click="pick(c)"
              class="px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex items-center justify-between"
              :class="picked?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/30' : ''"
            >
              <div>
                <p class="font-medium text-gray-800 dark:text-slate-100">
                  {{ [c.firstname, c.lastname].filter(Boolean).join(' ') || c.email }}
                  <span v-if="c.company" class="text-gray-400 text-xs font-normal ml-1">· {{ c.company }}</span>
                </p>
                <p class="text-xs text-gray-500">{{ c.email }} · {{ c.nbOrders }} commande{{ c.nbOrders > 1 ? 's' : '' }}</p>
              </div>
              <span class="text-xs text-gray-400">#{{ c.id }}</span>
            </li>
          </ul>
          <p v-else-if="search.length >= 3" class="text-xs text-gray-400 py-2">Aucun client trouvé.</p>

          <label class="block text-xs">
            <span class="text-gray-500 dark:text-slate-400">Raison <span class="text-red-500">*</span> (audit RGPD — obligatoire)</span>
            <input
              v-model="reason"
              type="text"
              maxlength="255"
              placeholder="Ex : commande téléphonique, support panier abandonné…"
              class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950"
            />
          </label>

          <div class="flex items-center justify-between gap-3 pt-2">
            <p class="text-xs text-gray-400">
              <span v-if="picked">Cible : <strong>{{ pickedLabel }}</strong></span>
              <span v-else class="italic">Sélectionnez un client…</span>
            </p>
            <button
              @click="start"
              :disabled="!canStart"
              class="text-sm px-4 py-2 rounded-lg font-semibold text-white"
              :class="canStart ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed'"
            >
              {{ busy ? 'Ouverture…' : 'Prendre la main' }}
            </button>
          </div>
          <p v-if="errorMsg" class="text-xs text-red-600 mt-1">{{ errorMsg }}</p>
        </div>
      </section>

      <!-- Panneau 3 — Audit -->
      <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Audit · {{ sessions.length }} dernière{{ sessions.length > 1 ? 's' : '' }} session{{ sessions.length > 1 ? 's' : '' }}</h2>
          <select v-model="statusFilter" @change="loadSessions" class="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-950">
            <option value="">Tous les statuts</option>
            <option value="active">Active</option>
            <option value="closed">Fermée</option>
            <option value="expired">Expirée</option>
            <option value="revoked">Révoquée</option>
          </select>
        </div>

        <div v-if="sessions.length === 0" class="text-xs text-gray-400 py-6 text-center">Aucune session enregistrée.</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-xs">
            <thead class="text-gray-500 dark:text-slate-400 text-left">
              <tr>
                <th class="py-2 px-2">#</th>
                <th class="py-2 px-2">Commercial</th>
                <th class="py-2 px-2">Client</th>
                <th class="py-2 px-2">Démarrée</th>
                <th class="py-2 px-2">Durée</th>
                <th class="py-2 px-2">Status</th>
                <th class="py-2 px-2">Raison</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-for="s in sessions" :key="s.idSession">
                <td class="py-2 px-2 text-gray-400">#{{ s.idSession }}</td>
                <td class="py-2 px-2">{{ s.employeeLabel || s.employeeEmail || ('emp #' + s.idEmployee) }}</td>
                <td class="py-2 px-2">{{ s.customerLabel || s.customerEmail || ('client #' + s.idCustomer) }}</td>
                <td class="py-2 px-2 whitespace-nowrap">{{ formatDateTime(s.startedAt) }}</td>
                <td class="py-2 px-2 whitespace-nowrap text-gray-500">{{ duration(s) }}</td>
                <td class="py-2 px-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="statusBadge(s.status)">
                    {{ s.status }}
                  </span>
                  <span v-if="s.closeReason" class="text-[10px] text-gray-400 ml-1">{{ s.closeReason }}</span>
                </td>
                <td class="py-2 px-2 text-gray-500 truncate max-w-xs" :title="s.reason">{{ s.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Customer {
  id: number
  firstname: string
  lastname: string
  email: string
  company: string | null
  nbOrders: number
}

interface SessionRow {
  idSession: number
  idEmployee: number
  idCustomer: number
  customerEmail: string | null
  customerLabel: string | null
  employeeEmail: string | null
  employeeLabel: string | null
  startedAt: string
  expiresAt: string
  endedAt: string | null
  reason: string
  status: 'active' | 'closed' | 'expired' | 'revoked'
  closeReason: string
}

const active = ref<SessionRow | null>(null)
const sessions = ref<SessionRow[]>([])
const search = ref('')
const searchResults = ref<Customer[]>([])
const searchLoading = ref(false)
const picked = ref<Customer | null>(null)
const reason = ref('')
const busy = ref(false)
const errorMsg = ref('')
const statusFilter = ref('')

const pickedLabel = computed(() => {
  if (!picked.value) return ''
  return [picked.value.firstname, picked.value.lastname].filter(Boolean).join(' ').trim() || picked.value.email
})

const canStart = computed(() => !!picked.value && reason.value.trim().length > 0 && !busy.value && !active.value)

let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (search.value.trim().length < 3) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(runSearch, 250)
}

async function runSearch() {
  searchLoading.value = true
  try {
    const res = await $fetch<{ customers: Customer[] }>(`/api/bo/customers?search=${encodeURIComponent(search.value)}&perPage=20`, {
      credentials: 'include',
    })
    searchResults.value = res?.customers ?? []
  } catch (err) {
    console.error('[impersonate] search error', err)
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function pick(c: Customer) {
  picked.value = c
}

async function start() {
  if (!canStart.value || !picked.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ ok: boolean; session: SessionRow }>('/api/impersonate/start', {
      method: 'POST',
      credentials: 'include',
      body: { idCustomer: picked.value.id, reason: reason.value.trim() },
    })
    active.value = res.session
    picked.value = null
    reason.value = ''
    search.value = ''
    searchResults.value = []
    await loadSessions()
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err: any) {
    errorMsg.value = err?.statusMessage || err?.data?.statusMessage || err?.message || 'Erreur ouverture session'
  } finally {
    busy.value = false
  }
}

async function quit() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch('/api/impersonate/stop', {
      method: 'POST',
      credentials: 'include',
      body: { closeReason: 'manual' },
    })
    active.value = null
    await loadSessions()
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err) {
    console.error('[impersonate] stop error', err)
  } finally {
    busy.value = false
  }
}

async function loadActive() {
  try {
    const res = await $fetch<{ active: SessionRow | null }>('/api/impersonate/active', { credentials: 'include' })
    active.value = res?.active ?? null
  } catch {
    active.value = null
  }
}

async function loadSessions() {
  try {
    const params = new URLSearchParams()
    if (statusFilter.value) params.set('status', statusFilter.value)
    const url = `/api/impersonate/sessions${params.toString() ? '?' + params.toString() : ''}`
    const res = await $fetch<{ sessions: SessionRow[] }>(url, { credentials: 'include' })
    sessions.value = res?.sessions ?? []
  } catch (err: any) {
    if (err?.statusCode === 403) sessions.value = []
    else console.error('[impersonate] sessions error', err)
  }
}

async function loadAll() {
  await Promise.all([loadActive(), loadSessions()])
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function duration(s: SessionRow): string {
  const end = s.endedAt ? new Date(s.endedAt).getTime() : (s.status === 'active' ? Date.now() : new Date(s.expiresAt).getTime())
  const start = new Date(s.startedAt).getTime()
  if (!start || !end || end < start) return '—'
  const mins = Math.floor((end - start) / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
    case 'expired': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'revoked': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    default: return 'bg-gray-100 text-gray-600'
  }
}

onMounted(loadAll)
</script>
