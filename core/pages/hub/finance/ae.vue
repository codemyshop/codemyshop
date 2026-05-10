<!--
  @author CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  FIN — Pilotage Auto-Entreprise (jauge plafond 77 700 € + portefeuille + URSSAF).
  Doctrine : documentation/legal/STRATEGY_DUAL_STRUCTURE_AE_SASU.md
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Pilotage Auto-Entreprise</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Jauge plafond 77 700 € · portefeuille récurrent · URSSAF —
            <NuxtLink to="/hub/invoices" class="text-primary-600 hover:underline">factures →</NuxtLink>
            <span class="mx-1.5 text-gray-300">·</span>
            <NuxtLink to="/hub/finance/bank" class="text-primary-600 hover:underline">relevé bancaire →</NuxtLink>
          </p>
        </div>
        <button @click="load" class="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-lg">
          ↻ Recharger
        </button>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- ─── Block 1: Current year saturation ─────────────────────── -->
      <section v-if="data?.saturation"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
        <div class="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500">Saturation {{ data.saturation.year }}</h2>
            <p class="text-[11px] text-gray-400 mt-0.5">CA encaissé YTD + récurrents projetés × {{ data.saturation.monthsRemaining }} mois restants</p>
          </div>
          <div class="text-right">
            <p class="text-3xl font-extrabold tabular-nums" :class="pctColor(data.saturation.alertLevel)">
              {{ Math.round(data.saturation.saturationPct) }}%
            </p>
            <p class="text-[11px] text-gray-400">du plafond {{ fmtEur(data.saturation.ceilingHt) }}</p>
          </div>
        </div>

        <div class="relative h-6 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="absolute inset-y-0 left-0 transition-all duration-700"
            :class="barColor(data.saturation.alertLevel)"
            :style="{ width: Math.min(100, data.saturation.saturationPct) + '%' }">
          </div>
          <div class="absolute inset-y-0 left-[60%] w-px bg-gray-300 dark:bg-slate-700"
            title="Seuil ambre 60%"></div>
          <div class="absolute inset-y-0 left-[85%] w-px bg-gray-300 dark:bg-slate-700"
            title="Seuil rouge 85%"></div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">CA encaissé YTD</p>
            <p class="text-xl font-extrabold tabular-nums text-emerald-600">{{ fmtEur(data.saturation.caEncashedYtd) }}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">facturé : {{ fmtEur(data.saturation.caInvoicedYtd) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Récurrent / mois</p>
            <p class="text-xl font-extrabold tabular-nums">{{ fmtEur(data.saturation.recurringMonthlyHt) }}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">{{ fmtEur(data.saturation.recurringMonthlyHt * 12) }}/an si plein</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Projeté fin {{ data.saturation.year }}</p>
            <p class="text-xl font-extrabold tabular-nums" :class="pctColor(data.saturation.alertLevel)">
              {{ fmtEur(data.saturation.caProjectedYearEnd) }}
            </p>
            <p class="text-[10px] text-gray-400 mt-0.5">marge : {{ fmtEur(data.saturation.freeBudgetHt) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Slots libres @ 800 €</p>
            <p class="text-xl font-extrabold tabular-nums text-primary-600">
              {{ data.saturation.freeSlots800 }}
              <span class="text-xs text-gray-400 font-normal">/ an</span>
            </p>
            <p v-if="data.saturation.saturationDate" class="text-[10px] text-gray-400 mt-0.5">
              saturation ≈ {{ fmtMonth(data.saturation.saturationDate) }}
            </p>
          </div>
        </div>

        <div v-if="data.saturation.alertLevel === 'red' || data.saturation.alertLevel === 'overflow'"
          class="mt-5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
          ⛔ <strong>{{ data.saturation.alertLevel === 'overflow' ? 'Plafond dépassé' : 'Saturation imminente' }}</strong> —
          activer la SASU CodeMyShop pour absorber la croissance, ou refuser les nouveaux clients récurrents AE.
        </div>
        <div v-else-if="data.saturation.alertLevel === 'amber'"
          class="mt-5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
          ⚠️ Au-delà de 60 % du plafond — préparer le pivot SASU dès 2-3 prospects Managed signés.
        </div>
      </section>

      <!-- ─── Block 2: Recurring AE portfolio ─────────────────────── -->
      <section class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500">Portefeuille AE</h2>
            <p class="text-[11px] text-gray-400 mt-0.5">{{ activeCount }} actif(s) · {{ pausedCount }} pausé(s) · {{ endedCount }} clos</p>
          </div>
          <button @click="openCreate" class="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold">
            + Ajouter un client
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Client</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Type</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Mensuel HT</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Annuel projeté</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Début</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-500">Statut</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="loading">
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">Chargement…</td>
              </tr>
              <tr v-else-if="!data?.clients.length">
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">Aucun client. Ajoute Example Shop / SMOKE / Plusdebad pour commencer.</td>
              </tr>
              <tr v-else v-for="c in data.clients" :key="c.id"
                class="hover:bg-gray-50 dark:hover:bg-slate-800/30"
                :class="c.status !== 'active' ? 'opacity-50' : ''">
                <td class="px-4 py-2 font-semibold">
                  {{ c.label }}
                  <p v-if="c.notes" class="text-[10px] text-gray-400 font-normal mt-0.5">{{ c.notes }}</p>
                </td>
                <td class="px-4 py-2">
                  <span class="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded"
                    :class="c.clientKind === 'recurring' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'">
                    {{ c.clientKind === 'recurring' ? 'Récurrent' : 'Ponctuel' }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums font-semibold">{{ fmtEur(c.monthlyHt) }}</td>
                <td class="px-4 py-2 text-right tabular-nums text-gray-500">
                  {{ c.clientKind === 'recurring' ? fmtEur(c.monthlyHt * 12) : '—' }}
                </td>
                <td class="px-4 py-2 text-gray-500">{{ c.startDate }}</td>
                <td class="px-4 py-2">
                  <select :value="c.status"
                    @change="patch(c, { status: ($event.target as HTMLSelectElement).value as any })"
                    class="text-[11px] bg-transparent border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                    <option value="active">Actif</option>
                    <option value="paused">Pause</option>
                    <option value="ended">Clos</option>
                  </select>
                </td>
                <td class="px-4 py-2 text-right">
                  <button @click="openEdit(c)" class="text-primary-600 hover:underline text-[11px] mr-2">Éditer</button>
                  <button @click="del(c)" class="text-rose-600 hover:underline text-[11px]">Supprimer</button>
                </td>
              </tr>
              <!-- Visualized free slots -->
              <tr v-if="!loading && data?.saturation && data.saturation.freeSlots800 > 0"
                v-for="i in Math.min(data.saturation.freeSlots800, 6)" :key="`slot-${i}`"
                class="bg-gray-50/40 dark:bg-slate-800/20">
                <td class="px-4 py-2 text-gray-400 italic">Slot libre {{ i }}/{{ data.saturation.freeSlots800 }}</td>
                <td class="px-4 py-2"><span class="text-[10px] text-gray-300">—</span></td>
                <td class="px-4 py-2 text-right text-gray-300 tabular-nums">800 €</td>
                <td class="px-4 py-2 text-right text-gray-300 tabular-nums">9 600 €</td>
                <td class="px-4 py-2 text-gray-300">—</td>
                <td class="px-4 py-2 text-gray-300 text-[11px]">à signer</td>
                <td class="px-4 py-2"></td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 dark:bg-slate-800/60 font-semibold text-xs">
              <tr>
                <td colspan="2" class="px-4 py-2 text-right text-gray-500">Total récurrent actif :</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(totalActiveMonthly) }}/mois</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(totalActiveMonthly * 12) }}/an</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- ─── Block 3: Current year URSSAF ─────────────────────────── -->
      <section v-if="data?.urssaf" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
        <div class="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500">URSSAF {{ data.urssaf.year }}</h2>
            <p class="text-[11px] text-gray-400 mt-0.5">Régime BNC libérale 25,80 % — détail mensuel sur <NuxtLink to="/hub/invoices" class="text-primary-600 hover:underline">/hub/invoices</NuxtLink></p>
          </div>
          <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener"
            class="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 rounded-lg font-semibold">
            autoentrepreneur.urssaf.fr ↗
          </a>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">CA déclaré YTD</p>
            <p class="text-xl font-extrabold tabular-nums">{{ fmtEur(data.urssaf.totalDeclared) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Cotisations dues</p>
            <p class="text-xl font-extrabold tabular-nums">{{ fmtEur(data.urssaf.totalDue) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Payé</p>
            <p class="text-xl font-extrabold tabular-nums text-emerald-600">{{ fmtEur(data.urssaf.totalPaid) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Reste dû</p>
            <p class="text-xl font-extrabold tabular-nums" :class="(data.urssaf.totalDue - data.urssaf.totalPaid) > 0 ? 'text-rose-600' : 'text-emerald-600'">
              {{ fmtEur(data.urssaf.totalDue - data.urssaf.totalPaid) }}
            </p>
          </div>
        </div>

        <div v-if="data.urssaf.pendingMonths.length"
          class="mt-5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
          ⛔ <strong>{{ data.urssaf.pendingMonths.length }} mois non déclaré(s)</strong> :
          {{ data.urssaf.pendingMonths.map(fmtMonth).join(' · ') }}.
          Risque de majoration 5 % + 0,2 %/mois — régulariser sur autoentrepreneur.urssaf.fr.
        </div>
      </section>

      <!-- ─── Bloc 4 : SASU (placeholder) ─────────────────────────────── -->
      <section class="bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">SASU CodeMyShop</h2>
        <p class="text-[11px] text-gray-400 mt-1">Non active. Sera créée dès 2-3 prospects Managed signés (voir doctrine).</p>
        <p class="text-[11px] text-gray-400 mt-3">
          Cible cumulé AE + SASU : 10-12 k€ net/mois sous 12-18 mois ·
          20 k€/mois ⇒ 30+ Managed @ 800 €/mois ou 5-8 Pro @ 1500-2500 €/mois.
        </p>
      </section>
    </div>

    <!-- ─── Create / edit modal ──────────────────────────────────────── -->
    <div v-if="modal.open" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" @click.self="closeModal">
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 class="text-base font-bold mb-4">{{ modal.editId ? 'Éditer le client' : 'Nouveau client AE' }}</h3>
        <div class="space-y-3">
          <label class="block">
            <span class="text-[11px] font-semibold text-gray-500 uppercase">Nom</span>
            <input v-model="modal.label" type="text" placeholder="Ex: Plusdebad"
              class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-gray-500 uppercase">Mensuel HT (€)</span>
            <input v-model.number="modal.monthlyHt" type="number" step="50" min="0"
              class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
          </label>
          <label class="block">
            <span class="text-[11px] font-semibold text-gray-500 uppercase">Date de début</span>
            <input v-model="modal.startDate" type="date"
              class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-[11px] font-semibold text-gray-500 uppercase">Type</span>
              <select v-model="modal.clientKind"
                class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="recurring">Récurrent</option>
                <option value="spot">Ponctuel</option>
              </select>
            </label>
            <label class="block">
              <span class="text-[11px] font-semibold text-gray-500 uppercase">Statut</span>
              <select v-model="modal.status"
                class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="active">Actif</option>
                <option value="paused">Pause</option>
                <option value="ended">Clos</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-[11px] font-semibold text-gray-500 uppercase">Notes</span>
            <textarea v-model="modal.notes" rows="2"
              class="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"></textarea>
          </label>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button @click="closeModal" class="px-4 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200">Annuler</button>
          <button @click="save" :disabled="modal.busy"
            class="px-4 py-1.5 text-xs rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50">
            {{ modal.busy ? 'Enregistrement…' : (modal.editId ? 'Mettre à jour' : 'Créer') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface AeClient {
  id: number
  label: string
  monthlyHt: number
  startDate: string
  endDate: string | null
  status: 'active' | 'paused' | 'ended'
  clientKind: 'recurring' | 'spot'
  notes: string | null
}
interface Saturation {
  year: number
  ceilingHt: number
  caEncashedYtd: number
  caInvoicedYtd: number
  recurringMonthlyHt: number
  monthsRemaining: number
  caProjectedYearEnd: number
  saturationPct: number
  freeBudgetHt: number
  freeSlots800: number
  alertLevel: 'green' | 'amber' | 'red' | 'overflow'
  saturationDate: string | null
}
interface UrssafSummary {
  year: number
  totalDeclared: number
  totalDue: number
  totalPaid: number
  pendingMonths: string[]
}
interface ApiPayload {
  saturation: Saturation | null
  clients: AeClient[]
  urssaf: UrssafSummary | null
}

const data = ref<ApiPayload | null>(null)
const loading = ref(true)

const modal = reactive({
  open: false,
  busy: false,
  editId: 0,
  label: '',
  monthlyHt: 800,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '' as string,
  status: 'active' as 'active' | 'paused' | 'ended',
  clientKind: 'recurring' as 'recurring' | 'spot',
  notes: '',
})

const activeCount = computed(() => data.value?.clients.filter(c => c.status === 'active').length ?? 0)
const pausedCount = computed(() => data.value?.clients.filter(c => c.status === 'paused').length ?? 0)
const endedCount = computed(() => data.value?.clients.filter(c => c.status === 'ended').length ?? 0)
const totalActiveMonthly = computed(() =>
  data.value?.clients
    .filter(c => c.status === 'active' && c.clientKind === 'recurring')
    .reduce((s, c) => s + Number(c.monthlyHt || 0), 0) ?? 0,
)

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtMonth = (s: string) => {
  if (!s) return ''
  const [y, m] = s.split('-')
  if (!y || !m) return s
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function pctColor(level: string) {
  return {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-rose-600',
    overflow: 'text-rose-700',
  }[level] || 'text-gray-700'
}
function barColor(level: string) {
  return {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    overflow: 'bg-rose-700',
  }[level] || 'bg-gray-400'
}

async function load() {
  loading.value = true
  try { data.value = await $fetch<ApiPayload>('/api/bo/finance/ae') }
  catch { data.value = null }
  finally { loading.value = false }
}

function openCreate() {
  Object.assign(modal, {
    open: true, busy: false, editId: 0,
    label: '', monthlyHt: 800,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', status: 'active', clientKind: 'recurring', notes: '',
  })
}

function openEdit(c: AeClient) {
  Object.assign(modal, {
    open: true, busy: false, editId: c.id,
    label: c.label, monthlyHt: c.monthlyHt,
    startDate: c.startDate,
    endDate: c.endDate || '',
    status: c.status, clientKind: c.clientKind,
    notes: c.notes || '',
  })
}

function closeModal() { modal.open = false }

async function save() {
  if (!modal.label.trim() || modal.monthlyHt < 0) {
    alert('Nom + mensuel requis')
    return
  }
  modal.busy = true
  try {
    const body: any = {
      label: modal.label.trim(),
      monthlyHt: Number(modal.monthlyHt),
      startDate: modal.startDate,
      endDate: modal.endDate || null,
      status: modal.status,
      clientKind: modal.clientKind,
      notes: modal.notes || null,
    }
    if (modal.editId) {
      await $fetch(`/api/bo/finance/ae/clients/${modal.editId}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/bo/finance/ae/clients', { method: 'POST', body })
    }
    closeModal()
    await load()
  } catch (e: any) {
    alert('Erreur : ' + (e?.data?.statusMessage || e?.message || 'inconnue'))
  } finally {
    modal.busy = false
  }
}

async function patch(c: AeClient, p: Partial<AeClient>) {
  try {
    await $fetch(`/api/bo/finance/ae/clients/${c.id}`, { method: 'PUT', body: p })
    await load()
  } catch (e: any) {
    alert('Erreur : ' + (e?.message || 'inconnue'))
  }
}

async function del(c: AeClient) {
  if (!confirm(`Supprimer "${c.label}" ?`)) return
  try {
    await $fetch(`/api/bo/finance/ae/clients/${c.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert('Erreur : ' + (e?.message || 'inconnue'))
  }
}

onMounted(load)
</script>
