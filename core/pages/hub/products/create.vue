<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink
        to="/hub/products"
        class="text-gray-400 hover:text-primary-600 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Nouveau produit</h1>
        <p class="text-xs text-gray-400 mt-0.5">Étape {{ step }} / 4 — {{ STEPS[step - 1].title }}</p>
      </div>
    </header>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 shrink-0">
      <div class="flex items-center gap-0 max-w-lg">
        <template v-for="(s, i) in STEPS" :key="s.id">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              :class="step > s.id
                ? 'bg-success-500 text-white'
                : step === s.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400'"
            >
              <svg v-if="step > s.id" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>{{ s.id }}</span>
            </div>
            <span
              class="text-xs font-medium hidden sm:block"
              :class="step === s.id ? 'text-primary-600' : step > s.id ? 'text-success-600' : 'text-gray-400'"
            >
              {{ s.title }}
            </span>
          </div>
          <div v-if="i < STEPS.length - 1" class="flex-1 mx-3 h-px" :class="step > s.id ? 'bg-success-300' : 'bg-gray-200'" />
        </template>
      </div>
    </div>

    
    <div class="flex-1 overflow-auto">
      <div class="max-w-2xl mx-auto px-6 py-8">

        
        <div v-if="step === 1" class="space-y-5">

          
          <div v-if="loadingForm" class="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span class="text-sm">Chargement du formulaire…</span>
          </div>

          
          <div
            v-if="!loadingForm && formData.categories.length === 0"
            class="flex items-start gap-3 bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 text-sm text-warning-800"
          >
            <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p class="font-medium">Module non chargé ou catégories inaccessibles</p>
              <p class="text-xs text-warning-700 mt-0.5">Vérifiez que le module <code class="bg-warning-100 px-1 rounded">ac_productextra</code> est installé et que PrestaShop est accessible.</p>
            </div>
          </div>

          <div v-if="!loadingForm" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">1</span>
              Informations de base
            </h2>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Nom du produit <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="input-field"
                placeholder="Ex : Module SEO Pro pour PrestaShop"
                @blur="autoRef"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">Référence produit</label>
              <input
                v-model="form.reference"
                type="text"
                class="input-field"
                placeholder="Ex : AC-SEO-PRO-001"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Catégorie par défaut <span class="text-danger-500">*</span>
              </label>
              <select v-model="form.id_category_default" class="input-field">
                <option value="">— Choisir une catégorie —</option>
                <option
                  v-for="cat in formData.categories"
                  :key="cat.id_category"
                  :value="cat.id_category"
                >
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">Marque / Fabricant</label>
              <select v-model="form.id_manufacturer" class="input-field">
                <option value="0">— Sans marque —</option>
                <option
                  v-for="brand in formData.manufacturers"
                  :key="brand.id_manufacturer"
                  :value="brand.id_manufacturer"
                >
                  {{ brand.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="form.active = form.active ? 0 : 1"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                :class="form.active ? 'bg-success-500' : 'bg-gray-200'"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow transform transition-transform"
                  :class="form.active ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
              <span class="text-xs text-gray-600">Produit {{ form.active ? 'actif (visible en boutique)' : 'inactif (masqué)' }}</span>
            </div>
          </div>

          <p v-if="stepError" class="text-xs text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {{ stepError }}
          </p>
          <div class="flex justify-end">
            <button @click="nextStep" :disabled="loadingForm" class="btn-primary">
              Suivant — Prix &amp; Stock
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        
        <div v-if="step === 2" class="space-y-5">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">2</span>
              Prix &amp; Stock
            </h2>

            <div class="grid grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                  Prix HT (€) <span class="text-danger-500">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model="form.price"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input-field pr-8"
                    placeholder="0.00"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">€</span>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">Règle de taxes</label>
                <select v-model="form.id_tax_rules_group" class="input-field">
                  <option value="0">— Sans taxe (0%) —</option>
                  <option
                    v-for="tax in formData.tax_rules"
                    :key="tax.id_tax_rules_group"
                    :value="tax.id_tax_rules_group"
                  >
                    {{ tax.name }}
                  </option>
                </select>
              </div>
            </div>

            
            <div class="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span class="text-xs text-primary-700 font-medium">Prix TTC estimé (TVA 20% appliquée si règle sélectionnée)</span>
              <span class="text-sm font-bold text-primary-700">
                {{ formatPrice(estimatedTTC) }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">Quantité en stock</label>
              <input
                v-model="form.quantity"
                type="number"
                min="0"
                class="input-field"
                placeholder="0"
              />
              <p class="text-xs text-gray-400 mt-1">
                <span v-if="form.quantity <= 0" class="text-danger-500">⚠ Rupture de stock — le produit ne sera pas commandable</span>
                <span v-else-if="form.quantity < 5" class="text-warning-600">⚡ Stock faible</span>
                <span v-else class="text-success-600">✓ Stock suffisant</span>
              </p>
            </div>
          </div>

          <div class="flex justify-between">
            <button @click="step = 1" class="btn-secondary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Retour
            </button>
            <button @click="nextStep" class="btn-primary">
              Suivant — Descriptions IA
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        
        <div v-if="step === 3" class="space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">3</span>
              IA Copywriting
            </h2>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Contexte pour l'IA
                <span class="text-gray-400 font-normal ml-1">— Brief transmis à Claude pour générer les descriptions</span>
              </label>
              <textarea
                v-model="form.ai_context"
                rows="5"
                class="input-field resize-y font-mono text-xs leading-relaxed"
                placeholder="Décris ton produit : pour qui ? quel problème résout-il ? avantages uniques, ton éditorial, mots-clés SEO à intégrer…"
              />
              <p class="text-xs text-gray-400 mt-1">{{ (form.ai_context || '').length }} caractères</p>
            </div>

            <button
              type="button"
              @click="queueAiGeneration"
              :disabled="aiQueued || !form.name"
              class="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary-200 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                class="w-4 h-4"
                :class="{ 'animate-spin': aiPolling }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path v-if="!aiPolling" stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span v-if="aiPolling">Claude rédige… (vérification dans quelques secondes)</span>
              <span v-else-if="aiQueued">En file d'attente — traitement en cours</span>
              <span v-else>Générer les descriptions avec Claude</span>
            </button>

            
            <div v-if="aiQueued && !aiGenerated" class="flex items-center gap-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
              <svg class="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              File d'attente #{{ aiQueueId }} — Claude génère les descriptions en arrière-plan…
            </div>

            <p v-if="aiError" class="text-xs text-warning-700 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
              {{ aiError }}
            </p>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Descriptions</h3>
              <span v-if="aiGenerated" class="inline-flex items-center gap-1 text-xs bg-success-50 text-success-700 px-2 py-0.5 rounded-full border border-success-200">
                <span class="w-1.5 h-1.5 rounded-full bg-success-400" />
                Générées par IA — modifiables
              </span>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Description courte <span class="text-gray-400 font-normal ml-1">— Accroche (HTML autorisé)</span>
              </label>
              <textarea
                v-model="form.description_short"
                rows="3"
                class="input-field resize-y text-xs"
                placeholder="<p>Une phrase d'accroche percutante qui donne envie d'acheter…</p>"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Description longue <span class="text-gray-400 font-normal ml-1">— Contenu détaillé (HTML autorisé)</span>
              </label>
              <textarea
                v-model="form.description"
                rows="8"
                class="input-field resize-y text-xs"
                placeholder="<p>Description complète : avantages, caractéristiques, cas d'usage…</p>"
              />
            </div>
          </div>

          
          <div class="bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
            <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">Récapitulatif</h3>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div><dt class="text-gray-400">Nom</dt><dd class="font-medium text-gray-800 dark:text-slate-100 truncate">{{ form.name }}</dd></div>
              <div><dt class="text-gray-400">Référence</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ form.reference || '—' }}</dd></div>
              <div><dt class="text-gray-400">Prix HT</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ formatPrice(form.price) }}</dd></div>
              <div><dt class="text-gray-400">Stock</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ form.quantity }}</dd></div>
              <div><dt class="text-gray-400">Statut</dt><dd class="font-medium" :class="form.active ? 'text-success-600' : 'text-gray-500'">{{ form.active ? 'Actif' : 'Inactif' }}</dd></div>
            </dl>
          </div>

          <p v-if="saveError" class="text-xs text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {{ saveError }}
          </p>

          <div class="flex justify-between">
            <button @click="step = 2" class="btn-secondary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Retour
            </button>
            <button @click="saveProduct" :disabled="saving" class="btn-primary">
              <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {{ saving ? 'Création en cours…' : '🚀 Créer et ajouter la FAQ' }}
            </button>
          </div>

        </div>

        
        <div v-if="step === 4" class="space-y-5">
          <div class="bg-success-50 border border-success-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-success-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-success-800">Produit #{{ savedProductId }} créé avec succès !</p>
              <p class="text-xs text-success-700 mt-0.5">Ajoutez maintenant des questions fréquentes pour booster le référencement de ce produit.</p>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
            <AdminFaqEditor parent-type="product" :parent-id="savedProductId" />
          </div>

          <div class="flex justify-end">
            <NuxtLink to="/hub/products" class="btn-primary">
              Terminer
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>

    
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-2 opacity-0">
        <div
          v-if="toast"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          :class="toast.type === 'success' ? 'bg-success-600 text-white' : 'bg-danger-600 text-white'"
        >
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

interface Category     { id_category: number; name: string; level: number }
interface Manufacturer { id_manufacturer: number; name: string }
interface TaxRule      { id_tax_rules_group: number; name: string }
interface FormData {
  categories:    Category[]
  manufacturers: Manufacturer[]
  tax_rules:     TaxRule[]
}

const STEPS = [
  { id: 1, title: 'Infos de base' },
  { id: 2, title: 'Prix & Stock'  },
  { id: 3, title: 'Descriptions'  },
  { id: 4, title: 'FAQ SEO'       },
]

const router   = useRouter()

const step        = ref(1)
const loadingForm = ref(false)
const saving         = ref(false)
const savedProductId = ref(0)
const aiQueued    = ref(false)
const aiPolling   = ref(false)
const aiGenerated = ref(false)
const aiQueueId   = ref(0)
const stepError   = ref('')
const saveError   = ref('')
const aiError     = ref('')

let pollTimer: ReturnType<typeof setTimeout> | null = null

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const formData = ref<FormData>({ categories: [], manufacturers: [], tax_rules: [] })

const form = reactive({
  name:                '',
  reference:           '',
  id_category_default: '' as number | '',
  id_manufacturer:     0,
  id_tax_rules_group:  0,
  price:               0,
  quantity:            0,
  active:              1,
  ai_context:          '',
  description_short:   '',
  description:         '',
})

const estimatedTTC = computed(() => {
  const p = Number(form.price) || 0
  
  return form.id_tax_rules_group ? p * 1.2 : p
})

const formatPrice = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

const autoRef = () => {
  if (form.reference || !form.name) return
  form.reference = form.name
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
}

const nextStep = () => {
  stepError.value = ''
  if (step.value === 1) {
    if (!form.name.trim()) { stepError.value = 'Le nom est requis'; return }
    
    if (!form.id_category_default) form.id_category_default = 2
  }
  if (step.value === 2) {
    if (form.price < 0) { stepError.value = 'Le prix ne peut pas être négatif'; return }
  }
  step.value++
}

const loadFormData = async () => {
  loadingForm.value = true
  try {
    const res = await $fetch<{ success: boolean; categories: any[]; manufacturers: any[]; tax_rules: any[] }>(
      '/api/bo/productextra/form-data',
    )
    if (res.success) {
      formData.value = {
        categories:    res.categories    ?? [],
        manufacturers: res.manufacturers ?? [],
        tax_rules:     res.tax_rules     ?? [],
      }
    }
  } catch {
    
  } finally {
    loadingForm.value = false
    
    if (!form.id_category_default) {
      form.id_category_default = formData.value.categories[0]?.id_category ?? 2
    }
  }
}

const queueAiGeneration = async () => {
  aiError.value = ''
  aiQueued.value = true

  try {
    const res = await $fetch<{ success: boolean; id_queue: number; error?: string }>(
      '/api/bo/productextra/ai-queue',
      { method: 'POST', body: { product_name: form.name, context: form.ai_context } },
    )

    if (!res.success) {
      aiError.value = res.error || 'Erreur lors de la mise en file d\'attente'
      aiQueued.value = false
      return
    }

    aiQueueId.value = res.id_queue
    schedulePoll()
  } catch {
    aiError.value = 'Erreur réseau — réessayez'
    aiQueued.value = false
  }
}

const schedulePoll = () => {
  aiPolling.value = true
  pollTimer = setTimeout(pollStatus, 5000)
}

const pollStatus = async () => {
  try {
    const res = await $fetch<{
      success: boolean
      status: string
      result_html: string | null
      error_msg: string
    }>(`/api/bo/productextra/ai-queue/${aiQueueId.value}`)

    if (!res.success) {
      aiError.value = 'Impossible de vérifier le statut IA'
      aiPolling.value = false
      return
    }

    if (res.status === 'done' && res.result_html) {
      try {
        const parsed = JSON.parse(res.result_html) as {
          description_short: string
          description: string
        }
        form.description_short = parsed.description_short ?? ''
        form.description       = parsed.description       ?? ''
        aiGenerated.value = true
      } catch {
        aiError.value = 'Réponse IA malformée'
      }
      aiPolling.value = false
      return
    }

    if (res.status === 'failed') {
      aiError.value   = res.error_msg || 'Génération IA échouée'
      aiPolling.value = false
      aiQueued.value  = false
      return
    }

    
    schedulePoll()
  } catch {
    aiError.value   = 'Erreur lors du polling — réessayez'
    aiPolling.value = false
  }
}

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
})

const showToast = (type: 'success' | 'error', message: string) => {
  toast.value = { type, message }
  setTimeout(() => (toast.value = null), 3500)
}

const saveProduct = async () => {
  saving.value    = true
  saveError.value = ''
  try {
    const res = await $fetch<{ success: boolean; id_product?: number; error?: string }>(
      '/api/bo/productextra/products',
      {
        method: 'POST',
        body: {
          name:                form.name,
          reference:           form.reference,
          id_category_default: form.id_category_default,
          id_manufacturer:     form.id_manufacturer,
          id_tax_rules_group:  form.id_tax_rules_group,
          price:               form.price,
          quantity:            form.quantity,
          active:              form.active,
          description_short:   form.description_short,
          description:         form.description,
        },
      },
    )
    if (res.success) {
      savedProductId.value = res.id_product ?? 0
      step.value = 4
    } else {
      saveError.value = res.error || 'Erreur lors de la création'
    }
  } catch {
    saveError.value = 'Erreur réseau — réessayez'
  } finally {
    saving.value = false
  }
}

onMounted(loadFormData)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition-shadow bg-white dark:bg-slate-900;
}
.btn-primary {
  @apply flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply flex items-center gap-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors;
}
</style>
