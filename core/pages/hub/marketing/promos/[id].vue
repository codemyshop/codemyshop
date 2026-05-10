<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/marketing/promos" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? 'Nouveau code promo' : (form.name || 'Code sans nom') }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }} —</span>
          <span class="font-mono">{{ form.code || 'PROMO' }}</span>
          <span v-if="!isMaster" class="ml-2 inline-flex items-center gap-1 text-amber-600">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            Traduction — seul le nom est éditable
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <HubLangSelector aria-label="Langue d'édition du code promo" />
        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">Erreur : {{ saveError }}</span>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? 'Enregistrement…' : (isNew ? 'Créer' : 'Enregistrer') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="h-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="loaded" class="px-6 py-6">
      <div class="max-w-3xl mx-auto space-y-6">

        <!-- Bloc 1 — Informations ────────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Informations</h2>
            <p class="text-xs text-gray-400 mt-0.5">Le nom est traduit par langue. Le code et le statut sont partagés.</p>
          </header>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Nom
                <span class="text-[10px] text-gray-400 font-normal">({{ currentLang?.iso_code?.toUpperCase() || 'FR' }})</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ex. Remise de bienvenue PME"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Code</label>
                <input
                  v-model="form.code"
                  type="text"
                  :disabled="!isMaster"
                  placeholder="EXAMPLE10"
                  class="w-full text-sm font-mono uppercase border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Statut</label>
                <div class="flex items-center gap-2 h-[38px]">
                  <button
                    type="button"
                    :disabled="!isMaster"
                    @click="form.active = !form.active"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40"
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
            </div>
          </div>
        </section>

        <!-- Bloc 2 — Conditions ─────────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Conditions</h2>
            <p class="text-xs text-gray-400 mt-0.5">Validité, montant minimum et quantités disponibles.</p>
          </header>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Date de début</label>
                <input
                  v-model="form.dateFrom"
                  type="datetime-local"
                  :disabled="!isMaster"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Date de fin</label>
                <input
                  v-model="form.dateTo"
                  type="datetime-local"
                  :disabled="!isMaster"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Montant minimum HT (€)</label>
              <input
                v-model.number="form.minimumAmount"
                type="number"
                step="0.01"
                min="0"
                :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
              <p class="text-[10px] text-gray-400 mt-1">0 = pas de minimum</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Quantité totale disponible</label>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!isMaster"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Quantité par utilisateur</label>
                <input
                  v-model.number="form.quantityPerUser"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!isMaster"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Bloc 3 — Action ─────────────────────────────────── -->
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Action</h2>
            <p class="text-xs text-gray-400 mt-0.5">Type de réduction appliquée au panier client.</p>
          </header>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-2">Type de réduction</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="!isMaster"
                  @click="setReductionType('percent')"
                  class="flex-1 text-xs px-4 py-2 border rounded-lg font-medium transition-colors disabled:opacity-40"
                  :class="reductionType === 'percent'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'"
                >
                  Pourcentage (%)
                </button>
                <button
                  type="button"
                  :disabled="!isMaster"
                  @click="setReductionType('amount')"
                  class="flex-1 text-xs px-4 py-2 border rounded-lg font-medium transition-colors disabled:opacity-40"
                  :class="reductionType === 'amount'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'"
                >
                  Montant fixe (€)
                </button>
                <button
                  type="button"
                  :disabled="!isMaster"
                  @click="setReductionType('none')"
                  class="flex-1 text-xs px-4 py-2 border rounded-lg font-medium transition-colors disabled:opacity-40"
                  :class="reductionType === 'none'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'"
                >
                  Aucune
                </button>
              </div>
            </div>

            <div v-if="reductionType === 'percent'">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Valeur (%)</label>
              <input
                v-model.number="form.reductionPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div v-else-if="reductionType === 'amount'">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Valeur (€)</label>
              <input
                v-model.number="form.reductionAmount"
                type="number"
                min="0"
                step="0.01"
                :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
              <div>
                <label class="text-xs font-medium text-gray-600 dark:text-slate-300">Livraison gratuite</label>
                <p class="text-[10px] text-gray-400">Peut s'ajouter à la réduction ci-dessus</p>
              </div>
              <button
                type="button"
                :disabled="!isMaster"
                @click="form.freeShipping = !form.freeShipping"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40"
                :class="form.freeShipping ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="form.freeShipping ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">Code promo introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const route = useRoute()
const router = useRouter()

// Sprint 12 — multilang: PIM editing language.
const { currentLangId, currentLang, isDefault } = useHubLang()
const isMaster = computed(() => isDefault.value)

const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const isNew = ref(false)

type ReductionType = 'percent' | 'amount' | 'none'
const reductionType = ref<ReductionType>('percent')

const form = reactive({
  id: 0,
  code: '',
  name: '',
  active: true,
  dateFrom: '',
  dateTo: '',
  quantity: 0,
  quantityPerUser: 0,
  minimumAmount: 0,
  reductionPercent: 0,
  reductionAmount: 0,
  freeShipping: false,
})

// Sprint 14 — infer the discount type from DB values.
// PrestaShop allows percent AND amount simultaneously in the database, but
// on the UI side we enforce an exclusive choice to avoid promotions
// that are inconsistent. 'none' = free_shipping only.
function deriveReductionType(p: number, a: number): ReductionType {
  if (Number(p) > 0) return 'percent'
  if (Number(a) > 0) return 'amount'
  return 'none'
}

function setReductionType(t: ReductionType) {
  reductionType.value = t
  // Zero out the unchosen branch so the PUT is consistent.
  if (t !== 'percent') form.reductionPercent = 0
  if (t !== 'amount') form.reductionAmount = 0
}

async function load() {
  loading.value = true
  loaded.value = false
  try {
    const data = await $fetch<any>(`/api/bo/marketing/promos/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    const r = data.rule
    isNew.value = !!data.isNew
    form.id = Number(r.id) || 0
    form.code = r.code || ''
    form.name = r.name || ''
    form.active = !!Number(r.active)
    form.dateFrom = r.dateFrom || ''
    form.dateTo = r.dateTo || ''
    form.quantity = Number(r.quantity) || 0
    form.quantityPerUser = Number(r.quantityPerUser) || 0
    form.minimumAmount = Number(r.minimumAmount) || 0
    form.reductionPercent = Number(r.reductionPercent) || 0
    form.reductionAmount = Number(r.reductionAmount) || 0
    form.freeShipping = !!Number(r.freeShipping)
    reductionType.value = deriveReductionType(form.reductionPercent, form.reductionAmount)
    loaded.value = true
  } catch (err) {
    console.error('Load promo error:', err)
    loaded.value = false
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    // In translation mode, we only send the name — the backend ignores
    // everything else anyway but we avoid unnecessary network round-trips.
    const payload: Record<string, any> = isMaster.value
      ? {
          name: form.name,
          code: form.code,
          active: form.active,
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
          quantity: form.quantity,
          quantityPerUser: form.quantityPerUser,
          minimumAmount: form.minimumAmount,
          reductionPercent: form.reductionPercent,
          reductionAmount: form.reductionAmount,
          freeShipping: form.freeShipping,
        }
      : { name: form.name }

    const res = await $fetch<any>(`/api/bo/marketing/promos/${route.params.id}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: payload,
    })

    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)

    // Creation: redirect to the canonical URL to allow
    // chaining edits (and prevent ?lang= from reusing 'new').
    if (res?.created && res?.id) {
      router.replace(`/hub/marketing/promos/${res.id}`)
    }
  } catch (err: any) {
    console.error('Save promo error:', err)
    saveError.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

onMounted(load)

// Sprint 12 — reload on every language change (to fetch
// the translated name). On creation (id='new'), we ignore: we keep the
// name entered by the user until it's saved.
watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value && route.params.id !== 'new') load()
})
</script>
