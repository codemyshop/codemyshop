<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/contacts" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div v-if="customer" class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ form.firstname }} {{ form.lastname }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          #{{ customer.id }}
          <span v-if="customer.company"> — {{ customer.company }}</span>
          <span class="ml-2 text-gray-300">•</span>
          <span class="ml-2">{{ orders.length }} commande{{ orders.length > 1 ? 's' : '' }}</span>
          <span class="ml-1 text-gray-300">•</span>
          <span class="ml-1 font-semibold">{{ formatEur(totalSpent) }}</span>
        </p>
      </div>
      <div v-else class="flex-1" />
      <div class="flex items-center gap-2">
        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">Erreur : {{ saveError }}</span>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="h-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="customer" class="px-6 py-6">
      <div class="max-w-3xl mx-auto space-y-6">

        <!-- Block 1 — Identity ────────────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Identité</h2>
            <p class="text-xs text-gray-400 mt-0.5">Informations de base du compte client.</p>
          </header>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Prénom</label>
                <input v-model="form.firstname" type="text" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Nom</label>
                <input v-model="form.lastname" type="text" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Email</label>
              <input v-model="form.email" type="email" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Statut</label>
                <div class="flex items-center gap-2 h-[38px]">
                  <button
                    type="button"
                    @click="form.active = !form.active"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    :class="form.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="form.active ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                  <span class="text-xs text-gray-600 dark:text-slate-300">
                    {{ form.active ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Inscrit le</label>
                <input
                  :value="formatDate(customer.dateAdd)"
                  type="text"
                  readonly
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-gray-500"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Bloc 2 — Profil B2B ────────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Profil B2B</h2>
            <p class="text-xs text-gray-400 mt-0.5">Société, SIRET et TVA intracommunautaire — liés à l'adresse principale de facturation.</p>
          </header>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Société</label>
              <input
                v-model="form.company"
                type="text"
                placeholder="Raison sociale"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Votre activité</label>
              <select
                v-model="form.activityCode"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              >
                <option value="">— Non renseigné —</option>
                <option v-for="a in CUSTOMER_ACTIVITIES" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">SIRET</label>
                <input
                  v-model="form.siret"
                  type="text"
                  maxlength="14"
                  placeholder="14 chiffres"
                  class="w-full text-sm font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Numéro de TVA</label>
                <input
                  v-model="form.vatNumber"
                  type="text"
                  placeholder="FR12345678901"
                  class="w-full text-sm font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>
            <p v-if="!customer.billingAddress" class="text-[11px] text-amber-600 flex items-start gap-1">
              <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              Aucune adresse enregistrée — la sauvegarde créera une adresse de facturation minimale à compléter côté PrestaShop.
            </p>
          </div>
        </section>

        <!-- Bloc 3 — Gouvernance B2B ────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Gouvernance B2B</h2>
                <p class="text-xs text-gray-400 mt-0.5">Groupes d'appartenance — pilotent les grilles tarifaires et les restrictions catalogue.</p>
              </div>
            </div>
          </header>

          <div v-if="groups.length" class="space-y-2">
            <label
              v-for="g in groups"
              :key="g.id"
              class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/30 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  :value="g.id"
                  :checked="form.groupIds.includes(g.id)"
                  @change="toggleGroup(g.id)"
                  class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
                <div>
                  <div class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ g.name || `Groupe #${g.id}` }}</div>
                  <div class="text-[10px] text-gray-400">
                    <span v-if="Number(g.reduction) > 0">-{{ Number(g.reduction) }}% global</span>
                    <span v-else>Sans réduction</span>
                    <span v-if="g.priceDisplayMethod == 1" class="ml-1.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 uppercase tracking-wide">HT</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="form.groupIds.includes(g.id)"
                  type="button"
                  class="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
                  :class="form.defaultGroupId === g.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-primary-50 hover:text-primary-700'"
                  @click.prevent="form.defaultGroupId = g.id"
                  :title="form.defaultGroupId === g.id ? 'Groupe par défaut' : 'Définir comme groupe par défaut'"
                >
                  {{ form.defaultGroupId === g.id ? '★ Défaut' : 'Faire défaut' }}
                </button>
              </div>
            </label>
          </div>
          <p v-else class="text-xs text-gray-400">Aucun groupe disponible.</p>

          <p class="mt-4 text-[11px] text-gray-400 leading-relaxed">
            Le groupe par défaut est le groupe appliqué en premier lors de la connexion ; il est toujours inclus dans la sélection (contrainte PrestaShop).
          </p>
        </section>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">Client introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { CUSTOMER_ACTIVITIES } from '~/utils/customerActivity'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const route = useRoute()

const customer = ref<any>(null)
const groups = ref<any[]>([])
const orders = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

const form = reactive({
  firstname: '',
  lastname: '',
  email: '',
  active: true,
  company: '',
  siret: '',
  vatNumber: '',
  activityCode: '',
  groupIds: [] as number[],
  defaultGroupId: 3,
})

const totalSpent = computed(() =>
  orders.value.reduce((sum, o) => sum + Number(o.totalPaidTTC || 0), 0)
)

function toggleGroup(id: number) {
  const idx = form.groupIds.indexOf(id)
  if (idx >= 0) {
    // Do not uncheck the default group — the user must first
    // designate another. PrestaShop constraint (cf. `[id].put.ts`).
    if (form.defaultGroupId === id) return
    form.groupIds.splice(idx, 1)
  } else {
    form.groupIds.push(id)
  }
}

async function loadGroups() {
  try {
    const data = await $fetch<any>('/api/bo/customers/groups')
    groups.value = data.groups ?? []
  } catch (err) {
    console.error('Load groups error:', err)
    groups.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/customers/${route.params.id}`)
    customer.value = data
    orders.value = data.orders ?? []
    form.firstname = data.firstname || ''
    form.lastname = data.lastname || ''
    form.email = data.email || ''
    form.active = !!Number(data.active)
    form.company = data.billingAddress?.company || data.company || ''
    form.siret = data.siret || ''
    form.vatNumber = data.billingAddress?.vatNumber || ''
    form.activityCode = data.extra?.activityCode || ''
    form.groupIds = Array.isArray(data.groupIds) ? [...data.groupIds] : []
    form.defaultGroupId = Number(data.defaultGroupId) || 3
    // The default group must ALWAYS appear in the selection
    // (PrestaShop constraint also applied on PUT side — double-check).
    if (!form.groupIds.includes(form.defaultGroupId)) {
      form.groupIds.push(form.defaultGroupId)
    }
  } catch (err) {
    console.error('Load customer error:', err)
    customer.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    const payload = {
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      active: form.active,
      company: form.company,
      siret: form.siret,
      vatNumber: form.vatNumber,
      activityCode: form.activityCode || null,
      groupIds: form.groupIds,
      defaultGroupId: form.defaultGroupId,
    }

    await $fetch(`/api/bo/customers/${route.params.id}`, {
      method: 'PUT',
      body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (err: any) {
    console.error('Save customer error:', err)
    saveError.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

onMounted(async () => {
  await Promise.all([load(), loadGroups()])
})
</script>
