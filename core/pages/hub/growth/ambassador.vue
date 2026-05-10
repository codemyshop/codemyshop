<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Programme Ambassadeur</h1>
          <p class="text-xs text-gray-400 mt-0.5">Transformez vos frais en centre de profit</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          RevShare 15%
        </span>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">

      <!-- ── The Promise ──────────────────────────────────────────────── -->
      <div class="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 lg:p-10 text-white shadow-xl overflow-hidden">
        <div class="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div class="relative">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-lg">&#x1f4b0;</div>
            <p class="text-xs font-semibold text-amber-400 uppercase tracking-widest">Programme Ambassadeur</p>
          </div>
          <h2 class="text-2xl lg:text-3xl font-extrabold leading-tight mb-3">
            Gagnez 15% de commission r&eacute;currente<br />sur chaque confr&egrave;re parrain&eacute;.
          </h2>
          <p class="text-gray-400 text-base leading-relaxed max-w-xl">
            Votre forfait d'infog&eacute;rance est de {{ formatEur(monthlyFee) }}/mois.
            D&egrave;s que vos commissions d&eacute;passent ce montant, CodeMyShop devient gratuit
            &mdash; et vous &ecirc;tes en b&eacute;n&eacute;fice net.
          </p>
        </div>
      </div>

      <!-- ── Jauge Cost-to-Profit ─────────────────────────────────────── -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-4">Jauge Cost-to-Profit</h3>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <!-- Forfait -->
          <div class="text-center">
            <p class="text-2xl font-extrabold text-gray-900">{{ formatEur(monthlyFee) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Forfait / mois</p>
          </div>
          <!-- Commissions -->
          <div class="text-center">
            <p class="text-2xl font-extrabold" :class="totalCommission > 0 ? 'text-success-600' : 'text-gray-400'">{{ formatEur(totalCommission) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Commissions ce mois</p>
          </div>
          <!-- Net -->
          <div class="text-center">
            <p class="text-2xl font-extrabold" :class="netBalance >= 0 ? 'text-success-600' : 'text-danger-600'">
              {{ netBalance >= 0 ? '+' : '' }}{{ formatEur(netBalance) }}
            </p>
            <p class="text-xs mt-0.5" :class="netBalance >= 0 ? 'text-success-500' : 'text-danger-400'">
              {{ netBalance >= 0 ? 'B\u00e9n\u00e9fice net' : 'Reste \u00e0 charge' }}
            </p>
          </div>
        </div>

        <!-- Barre de progression -->
        <div>
          <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
            <span>0 &euro;</span>
            <span class="font-semibold" :class="progressPercent >= 100 ? 'text-success-600' : 'text-primary-600'">
              {{ progressPercent }}% du forfait couvert
            </span>
            <span>{{ formatEur(monthlyFee) }}</span>
          </div>
          <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="progressPercent >= 100
                ? 'bg-gradient-to-r from-success-400 to-success-500'
                : 'bg-gradient-to-r from-primary-400 to-primary-600'"
              :style="`width: ${Math.min(100, progressPercent)}%`"
            />
            <!-- Seuil rentabilit&eacute; -->
            <div class="absolute top-0 bottom-0 w-px bg-gray-400" :style="`left: 100%`" />
          </div>
          <p v-if="progressPercent >= 100" class="text-xs text-success-600 font-semibold mt-2 text-center">
            &#x1f389; F&eacute;licitations &mdash; CodeMyShop est gratuit ce mois-ci !
          </p>
        </div>
      </div>

      <!-- ── Introduction VIP ─────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Formulaire -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
          <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Introduction VIP</h3>
          <p class="text-xs text-gray-400 mb-5">Pr&eacute;sentez CodeMyShop &agrave; un confr&egrave;re dirigeant.</p>

          <form @submit.prevent="sendIntro" class="space-y-4">
            <div>
              <label class="label">Nom du dirigeant *</label>
              <input v-model="introForm.name" required placeholder="Jean Dupont" class="input-field" />
            </div>
            <div>
              <label class="label">Entreprise *</label>
              <input v-model="introForm.company" required placeholder="Maison Dupont SARL" class="input-field" />
            </div>
            <div>
              <label class="label">Email professionnel *</label>
              <input v-model="introForm.email" required type="email" placeholder="jean@maisondupont.fr" class="input-field" />
            </div>
            <button
              type="submit"
              :disabled="sending"
              class="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {{ sending ? 'Envoi...' : 'Envoyer l\'introduction' }}
            </button>
          </form>

          <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-2">
            <div v-if="introSent" class="mt-4 bg-success-50 border border-success-100 rounded-xl p-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-success-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
              <p class="text-xs font-semibold text-success-700">Introduction envoy&eacute;e. Alexandre prendra contact sous 24h.</p>
            </div>
          </Transition>
        </div>

        <!-- Preview email -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
          <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Aper&ccedil;u du mail</h3>
          <p class="text-xs text-gray-400 mb-4">Ce mail sera envoy&eacute; de votre part au prospect.</p>

          <div class="bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div class="border-b border-gray-200 dark:border-slate-700 pb-3 mb-3 space-y-1">
              <p class="text-xs text-gray-400">De : <span class="text-gray-600 font-medium">{{ user?.firstname }} {{ user?.lastname }} via CodeMyShop</span></p>
              <p class="text-xs text-gray-400">&Agrave; : <span class="text-gray-600 font-medium">{{ introForm.email || 'email@prospect.fr' }}</span></p>
              <p class="text-xs text-gray-400">Objet : <span class="text-gray-700 dark:text-slate-200 font-semibold">{{ hubTitle }} vous recommande CodeMyShop</span></p>
            </div>
            <div class="text-xs text-gray-600 leading-relaxed space-y-2">
              <p>Bonjour {{ introForm.name || '[Nom]' }},</p>
              <p>
                Je me permets de vous contacter car nous utilisons CodeMyShop pour notre infrastructure e-commerce
                chez {{ hubTitle }}, et les r&eacute;sultats sont remarquables.
              </p>
              <p>
                CodeMyShop, le fondateur, serait ravi de vous pr&eacute;senter comment leur architecture
                headless pourrait optimiser les performances de {{ introForm.company || '[Entreprise]' }}.
              </p>
              <p>
                Seriez-vous disponible pour un &eacute;change de 20 minutes cette semaine ?
              </p>
              <p class="text-gray-400 italic">Cordialement,<br />{{ user?.firstname }} {{ user?.lastname }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Protege list ───────────────────────────────── -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">Vos filleuls</h3>
            <p class="text-xs text-gray-400">{{ referrals.length }} entreprise(s) &middot; {{ formatEur(totalCommission) }} MRR g&eacute;n&eacute;r&eacute;</p>
          </div>
        </div>

        <div v-if="!referrals.length" class="p-10 text-center text-gray-400">
          <p class="text-sm">Aucun filleul pour le moment</p>
          <p class="text-xs text-gray-300 mt-1">Utilisez le formulaire ci-dessus pour commencer</p>
        </div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500">Entreprise</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500">Statut</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500">MRR</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500">Votre commission</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="r in referrals" :key="r.id" class="hover:bg-gray-50 dark:bg-slate-950 transition-colors">
              <td class="px-6 py-3.5">
                <p class="font-semibold text-gray-800 dark:text-slate-100">{{ r.companyName }}</p>
                <p class="text-xs text-gray-400">{{ r.contactEmail }}</p>
              </td>
              <td class="px-6 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  :class="statusClass(r.status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(r.status)" />
                  {{ statusLabel(r.status) }}
                </span>
              </td>
              <td class="px-6 py-3.5 text-right font-semibold text-gray-700 dark:text-slate-200">
                {{ r.status === 'deployed' ? formatEur(r.mrr ?? 800) : '—' }}
              </td>
              <td class="px-6 py-3.5 text-right font-bold" :class="r.status === 'deployed' ? 'text-success-600' : 'text-gray-400'">
                {{ r.status === 'deployed' ? formatEur((r.mrr ?? 800) * 0.15) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */
import type { Referral } from '~/server/utils/referrals'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { user } = useAuth()
const { resolvedClientId } = useClientDetection()
const { header } = useHeaderDb()

const hubTitle = computed(() =>
  header.value?.logo?.text ?? resolvedClientId.value
)

// ── Config financière ─────────────────────────────────────────────────────────

const monthlyFee      = 800    // forfait Run mensuel
const commissionRate  = 0.15   // 15% RevShare

// ── Referrals ─────────────────────────────────────────────────────────────────

interface ReferralExt extends Referral { mrr?: number }

const referrals = ref<ReferralExt[]>([])

async function loadReferrals() {
  try {
    const data = await $fetch<Referral[]>('/api/growth/referrals', {
      query: { referrerId: resolvedClientId.value },
    })
    // Enrichir avec un MRR simulé pour les clients déployés
    referrals.value = data.map(r => ({
      ...r,
      mrr: r.status === 'deployed' ? 800 : 0,
    }))
  } catch { referrals.value = [] }
}

const totalCommission = computed(() =>
  referrals.value
    .filter(r => r.status === 'deployed')
    .reduce((sum, r) => sum + (r.mrr ?? 0) * commissionRate, 0)
)

const netBalance = computed(() => totalCommission.value - monthlyFee)

const progressPercent = computed(() =>
  monthlyFee > 0 ? Math.round((totalCommission.value / monthlyFee) * 100) : 0
)

// ── Introduction VIP ──────────────────────────────────────────────────────────

const introForm = reactive({ name: '', company: '', email: '' })
const sending   = ref(false)
const introSent = ref(false)

async function sendIntro() {
  if (sending.value) return
  sending.value = true
  introSent.value = false

  try {
    await $fetch('/api/growth/invite', {
      method: 'POST',
      body: {
        referrerId:   resolvedClientId.value,
        referrerName: hubTitle.value,
        companyName:  introForm.company,
        contactEmail: introForm.email,
        message:      `Introduction VIP de ${user.value?.firstname} (${hubTitle.value}) pour ${introForm.name}`,
      },
    })
    introSent.value = true
    introForm.name = ''; introForm.company = ''; introForm.email = ''
    await loadReferrals()
    setTimeout(() => { introSent.value = false }, 5000)
  } catch (e) { console.error(e) }
  finally { sending.value = false }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function statusLabel(s: string) {
  return s === 'deployed' ? 'Client Actif' : s === 'audit' ? 'En Audit' : 'Lead'
}
function statusClass(s: string) {
  return s === 'deployed' ? 'bg-success-50 text-success-700 border border-success-100'
       : s === 'audit'    ? 'bg-primary-50 text-primary-700 border border-primary-100'
       :                    'bg-gray-100 dark:bg-slate-800 text-gray-600 border border-gray-200 dark:border-slate-700'
}
function statusDot(s: string) {
  return s === 'deployed' ? 'bg-success-400' : s === 'audit' ? 'bg-primary-400' : 'bg-gray-400'
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(loadReferrals)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900;
}
.label {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5;
}
</style>
