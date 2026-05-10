<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Factures</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ total }} facture{{ total > 1 ? 's' : '' }}{{ filterLabel ? ` — ${filterLabel}` : '' }} ·
          <NuxtLink to="/hub/finance/ae" class="text-primary-600 hover:underline">jauge AE →</NuxtLink>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="regime" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800" title="Régime URSSAF micro-entrepreneur">
          <option value="bnc">BNC libérale (25,80%)</option>
          <option value="bic_services">BIC services (21,50%)</option>
          <option value="bic_ventes">BIC ventes (12,40%)</option>
        </select>
        <select v-model="mode" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800">
          <option value="paid">CA encaissé (URSSAF)</option>
          <option value="issued">CA facturé</option>
        </select>
        <input v-model="search" type="text" placeholder="N°, sujet, société, siret…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
      </div>
    </header>

    <!-- Monthly URSSAF summary -->
    <section v-if="monthly.length" class="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/40 px-6 py-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Déclarations URSSAF — {{ mode === 'paid' ? 'CA encaissé' : 'CA facturé' }} mensuel
          </h2>
          <p class="text-[11px] text-gray-400 mt-0.5">
            {{ mode === 'paid'
              ? 'Micro-entrepreneur : CA à déclarer = sommes encaissées dans le mois (date de paiement).'
              : 'Régime réel BIC/BNC : CA constaté = factures émises dans le mois (date d\'émission).' }}
          </p>
        </div>
        <button v-if="selectedMonth" @click="clearMonth" class="text-[11px] text-primary-600 hover:underline">
          ✕ Retirer le filtre ({{ formatMonth(selectedMonth) }})
        </button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div
          v-for="m in monthly"
          :key="m.month"
          :class="[
            'p-3 rounded-lg border transition-all relative',
            selectedMonth === m.month
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-400'
              : urssafStatus(m.month) === 'paid'
                ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-900/10 hover:border-emerald-400'
                : urssafStatus(m.month) === 'overdue'
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-900/10 hover:border-rose-400'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
          ]"
        >
          <button @click="pickMonth(m.month)" class="w-full text-left">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase">{{ formatMonth(m.month) }}</span>
              <span
                v-if="mode === 'paid'"
                class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                :class="statusBadgeClass(m.month)"
              >
                {{ statusBadgeLabel(m.month) }}
              </span>
              <span v-else class="text-[10px] text-gray-400">{{ m.nb }} fact.</span>
            </div>
            <div class="mt-1.5 text-base font-bold text-gray-900 dark:text-slate-100 tabular-nums">
              {{ formatEur(m.ht) }}
            </div>
            <div class="text-[10px] text-gray-400">
              {{ m.nb }} fact. · {{ formatEur(m.ttc) }} TTC
            </div>
            <div v-if="mode === 'paid'" class="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div class="flex items-baseline justify-between">
                <span class="text-[10px] text-gray-400 uppercase">URSSAF</span>
                <span
                  class="text-sm font-semibold tabular-nums"
                  :class="urssafStatus(m.month) === 'paid' ? 'text-emerald-700 dark:text-emerald-400 line-through decoration-2' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ formatEur(urssafForRow(m).total) }}
                </span>
              </div>
              <div class="text-[9px] text-gray-400 tabular-nums">
                cot. {{ formatEur(urssafForRow(m).cotis) }} · CFP {{ formatEur(urssafForRow(m).cfp) }}
              </div>
              <div class="mt-1.5 flex items-baseline justify-between">
                <span class="text-[10px] text-gray-400 uppercase">Solde net</span>
                <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {{ formatEur(Number(m.ht || 0) - urssafForRow(m).total) }}
                </span>
              </div>
              <div v-if="urssafStatus(m.month) === 'paid' && urssafByMonth[m.month]?.paidAt" class="mt-1 text-[9px] text-emerald-700 dark:text-emerald-400">
                ✓ URSSAF payé le {{ formatDate(urssafByMonth[m.month].paidAt) }}
              </div>
              <div v-else-if="urssafDeadline(m.month)" class="mt-1 text-[9px]" :class="urssafStatus(m.month) === 'overdue' ? 'text-rose-600 font-semibold' : 'text-gray-500'">
                {{ urssafStatus(m.month) === 'overdue' ? '⚠ en retard depuis' : 'à payer avant' }} le {{ urssafDeadline(m.month) }}
              </div>
            </div>
            <div v-if="mode === 'issued' && Number(m.draftCount) > 0" class="mt-1 text-[10px] text-amber-600">
              + {{ m.draftCount }} brouillon ({{ formatEur(m.draftTtc) }})
            </div>
          </button>
          <label v-if="mode === 'paid'" class="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              :checked="urssafStatus(m.month) === 'paid'"
              :disabled="urssafBusy === m.month"
              @change="toggleUrssafPaid(m.month, ($event.target as HTMLInputElement).checked)"
              class="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 disabled:opacity-40"
            />
            <span class="text-[10px] text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors">
              <template v-if="urssafBusy === m.month">Sauvegarde…</template>
              <template v-else-if="urssafStatus(m.month) === 'paid'">URSSAF payé</template>
              <template v-else>Marquer URSSAF payé</template>
            </span>
          </label>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <div>
          <span class="font-semibold">Total {{ monthly.length }} mois :</span>
          <span class="tabular-nums ml-1">{{ formatEur(monthlyTotals.ht) }} HT</span>
          <span class="text-gray-400 ml-1">/ {{ formatEur(monthlyTotals.ttc) }} TTC</span>
          <span class="text-gray-400 ml-2">· {{ monthlyTotals.nb }} fact.</span>
          <template v-if="mode === 'paid'">
            <span class="text-emerald-700 dark:text-emerald-400 font-semibold ml-3">
              ✓ URSSAF payé {{ formatEur(urssafSplit.paid) }}
            </span>
            <span v-if="urssafSplit.due > 0" class="text-rose-600 dark:text-rose-400 font-semibold ml-2">
              ⚠ Reste dû {{ formatEur(urssafSplit.due) }}
            </span>
            <span class="text-gray-700 dark:text-slate-200 font-semibold ml-3">
              = Solde net {{ formatEur(monthlyTotals.ht - urssafTotal) }}
            </span>
          </template>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-[10px] text-gray-400">
            Taux {{ currentRegime.label }} : cot. {{ (currentRegime.cotis * 100).toFixed(2) }}% + CFP {{ (currentRegime.cfp * 100).toFixed(2) }}%
          </span>
          <a href="/api/bo/invoices/urssaf" target="_blank" class="text-primary-600 hover:underline">JSON →</a>
        </div>
      </div>
    </section>

    <!-- Pagination top -->
    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="factures"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <div v-if="loading && !invoices.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!invoices.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune facture trouvée</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">N°</th>
            <th class="px-4 py-2.5 font-medium">Sujet</th>
            <th class="px-4 py-2.5 font-medium">Société</th>
            <th class="px-4 py-2.5 font-medium">Émission</th>
            <th class="px-4 py-2.5 font-medium">Encaissement</th>
            <th class="px-4 py-2.5 font-medium">Statut</th>
            <th class="px-4 py-2.5 font-medium text-right">HT</th>
            <th class="px-4 py-2.5 font-medium text-right">TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id"
              class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors"
              :class="{ 'opacity-60': inv.status === 'cancelled' }">
            <td class="px-4 py-2.5 font-mono text-xs">
              {{ inv.invoiceNumber }}
              <span v-if="inv.type === 'avoir'" class="ml-1 text-[10px] text-rose-600 uppercase">avoir</span>
              <span v-else-if="inv.type === 'acompte'" class="ml-1 text-[10px] text-amber-600 uppercase">acompte</span>
            </td>
            <td class="px-4 py-2.5 truncate max-w-[260px]">{{ inv.subject }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 truncate max-w-[180px]">
              {{ inv.clientCompany || '—' }}
              <span v-if="inv.clientSiret" class="block text-[10px] text-gray-400 font-mono">{{ inv.clientSiret }}</span>
            </td>
            <td class="px-4 py-2.5 text-gray-500 text-xs tabular-nums">{{ formatDate(inv.issueDate) }}</td>
            <td class="px-4 py-2.5 text-gray-500 text-xs tabular-nums">{{ formatDate(inv.paidAt) }}</td>
            <td class="px-4 py-2.5">
              <span class="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                    :class="statusClass(inv.status)">{{ statusLabel(inv.status) }}</span>
            </td>
            <td class="px-4 py-2.5 text-right font-medium tabular-nums">{{ formatEur(inv.amountHT) }}</td>
            <td class="px-4 py-2.5 text-right font-bold tabular-nums">{{ formatEur(inv.amountTTC) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="invoices.length" class="bg-gray-50 dark:bg-slate-800/60 font-semibold">
          <tr class="text-xs">
            <td colspan="6" class="px-4 py-2 text-right text-gray-500">Total page ({{ invoices.length }}) :</td>
            <td class="px-4 py-2 text-right tabular-nums">{{ formatEur(pageTotals.ht) }}</td>
            <td class="px-4 py-2 text-right tabular-nums">{{ formatEur(pageTotals.ttc) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination bottom -->
    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="factures" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Invoice {
  id: number
  invoiceNumber: string
  type: 'facture' | 'acompte' | 'avoir'
  subject: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  amountHT: number
  amountVat: number
  amountTTC: number
  vatRate: number
  currency: string
  pdfPath: string | null
  clientId: number | null
  clientCompany: string | null
  clientSiret: string | null
}

interface MonthRow {
  month: string
  nb: number
  ht: number
  ttc: number
  draftCount?: number
  draftTtc?: number
}

interface UrssafDeclaration {
  id: number
  periodMonth: string
  regime: string
  caHT: number
  cotisationsAmount: number
  cfpAmount: number
  totalDue: number
  deadlineDate: string
  declaredAt: string | null
  paidAt: string | null
  receiptPath: string | null
  notes: string | null
}

/**
 * URSSAF self-employed rate 2026 (excluding optional IR payment).
 * Liberal BNC (general scheme, excluding CIPAV): contributions 25.60% + CFP 0.20%
 *   BIC prestations services (artisanales/commerciales) : 21,20% + 0,30%
 *   BIC ventes marchandises : 12,30% + 0,10%
 */
const URSSAF_RATES: Record<string, { label: string; cotis: number; cfp: number }> = {
  bnc:          { label: 'BNC libérale',   cotis: 0.2560, cfp: 0.0020 },
  bic_services: { label: 'BIC services',   cotis: 0.2120, cfp: 0.0030 },
  bic_ventes:   { label: 'BIC ventes',     cotis: 0.1230, cfp: 0.0010 },
}

const invoices = ref<Invoice[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
const loading = ref(false)
const search = ref('')
const selectedMonth = ref<string>('')
const mode = ref<'paid' | 'issued'>('paid')
const regime = ref<'bnc' | 'bic_services' | 'bic_ventes'>('bnc')
const monthlyIssued = ref<MonthRow[]>([])
const monthlyPaid = ref<MonthRow[]>([])
const urssafDeclarations = ref<UrssafDeclaration[]>([])
const urssafBusy = ref<string>('')  // periodMonth en cours de mutation

const urssafByMonth = computed<Record<string, UrssafDeclaration>>(() => {
  const map: Record<string, UrssafDeclaration> = {}
  for (const d of urssafDeclarations.value) map[d.periodMonth] = d
  return map
})

const currentRegime = computed(() => URSSAF_RATES[regime.value])

const monthly = computed<MonthRow[]>(() => mode.value === 'paid' ? monthlyPaid.value : monthlyIssued.value)

const monthlyTotals = computed(() => {
  const init = { nb: 0, ht: 0, ttc: 0 }
  return monthly.value.reduce((acc, m) => ({
    nb: acc.nb + Number(m.nb || 0),
    ht: acc.ht + Number(m.ht || 0),
    ttc: acc.ttc + Number(m.ttc || 0),
  }), init)
})

/**
 * URSSAF self-employed: basis = collected revenue (VAT exemption applies, ex-VAT = inc. VAT).
 * Rounding: each line rounded to the euro (URSSAF convention), total = sum of rounded amounts.
 */
function urssafForRow(m: MonthRow) {
  const base = Number(m.ht || 0)
  const r = currentRegime.value
  const cotis = Math.round(base * r.cotis)
  const cfp = Math.round(base * r.cfp)
  return { cotis, cfp, total: cotis + cfp }
}

const urssafTotal = computed(() => {
  if (mode.value !== 'paid') return 0
  return monthly.value.reduce((acc, m) => acc + urssafForRow(m).total, 0)
})

const urssafSplit = computed(() => {
  let paid = 0
  let due = 0
  for (const m of monthly.value) {
    const total = urssafForRow(m).total
    if (urssafStatus(m.month) === 'paid') paid += total
    else due += total
  }
  return { paid, due }
})

const pageTotals = computed(() => invoices.value.reduce((acc, inv) => {
  const sign = inv.type === 'avoir' ? -1 : 1
  return {
    ht: acc.ht + sign * Number(inv.amountHT || 0),
    ttc: acc.ttc + sign * Number(inv.amountTTC || 0),
  }
}, { ht: 0, ttc: 0 }))

const filterLabel = computed(() => {
  if (!selectedMonth.value) return ''
  return `${mode.value === 'paid' ? 'encaissé en' : 'émis en'} ${formatMonth(selectedMonth.value)}`
})

function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}

function pickMonth(m: string) {
  selectedMonth.value = selectedMonth.value === m ? '' : m
  goPage(1)
}

function clearMonth() {
  selectedMonth.value = ''
  goPage(1)
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const query: Record<string, any> = { page: page.value, perPage: perPage.value, search: search.value }
    if (selectedMonth.value) {
      if (mode.value === 'paid') query.paidMonth = selectedMonth.value
      else query.month = selectedMonth.value
    }
    const data = await $fetch<any>('/api/bo/invoices', { query })
    invoices.value = data.invoices ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

async function loadMonthly() {
  try {
    const data = await $fetch<any>('/api/bo/invoices/monthly')
    monthlyIssued.value = data.issued ?? []
    monthlyPaid.value = data.paid ?? []
  } catch (e) { /* ignore */ }
}

async function loadUrssaf() {
  try {
    const data = await $fetch<any>('/api/bo/invoices/urssaf')
    urssafDeclarations.value = data.declarations ?? []
  } catch (e) { /* ignore */ }
}

async function toggleUrssafPaid(periodMonth: string, checked: boolean) {
  if (urssafBusy.value) return
  urssafBusy.value = periodMonth
  try {
    await $fetch('/api/bo/invoices/urssaf', {
      method: 'PATCH',
      body: { periodMonth, action: checked ? 'mark_paid' : 'mark_unpaid' },
    })
    await loadUrssaf()
  } catch (e: any) {
    alert('Erreur : ' + (e?.data?.message || e?.message || 'inconnue'))
  } finally {
    urssafBusy.value = ''
  }
}

/** Calculated status: paid | overdue | due | upcoming */
function urssafStatus(month: string): 'paid' | 'overdue' | 'due' | 'upcoming' {
  const d = urssafByMonth.value[month]
  if (d?.paidAt) return 'paid'
  const deadlineStr = urssafDeadline(month)
  if (!deadlineStr) return 'upcoming'
  // deadlineStr au format dd/mm/yyyy
  const [dd, mm, yyyy] = deadlineStr.split('/').map(Number)
  const deadline = new Date(yyyy, mm - 1, dd)
  const now = new Date()
  if (now > deadline) return 'overdue'
  return 'due'
}

function statusBadgeLabel(month: string): string {
  return ({
    paid: '✓ Payé',
    overdue: 'En retard',
    due: 'À payer',
    upcoming: 'En cours',
  } as Record<string, string>)[urssafStatus(month)]
}

function statusBadgeClass(month: string): string {
  return ({
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    upcoming: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  } as Record<string, string>)[urssafStatus(month)]
}

watch(mode, () => {
  // Reload the list with the correct filter dimension
  if (selectedMonth.value) goPage(1)
})

function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function formatEur(n: number | string) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }) }

function formatMonth(m: string) {
  if (!m) return ''
  const [y, mm] = m.split('-')
  const d = new Date(Number(y), Number(mm) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

/** URSSAF monthly declaration deadline for self-employed: last day of month M+1. */
function urssafDeadline(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return ''
  const [y, m] = month.split('-').map(Number)
  // Last day of month M+1 = day 0 of month M+2
  const deadline = new Date(y, m + 1, 0)
  return deadline.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusLabel(s: string) {
  return ({
    draft: 'brouillon', sent: 'envoyée', paid: 'payée',
    overdue: 'en retard', cancelled: 'annulée',
  } as Record<string, string>)[s] || s
}

function statusClass(s: string) {
  return ({
    draft: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    cancelled: 'bg-gray-100 text-gray-400 line-through dark:bg-slate-800 dark:text-slate-500',
  } as Record<string, string>)[s] || 'bg-gray-100 text-gray-600'
}

onMounted(() => {
  load()
  loadMonthly()
  loadUrssaf()
})
</script>
