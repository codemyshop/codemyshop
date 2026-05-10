<template>
  <div class="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

    <!-- Header -->
    <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800 flex items-center justify-between shrink-0">
      <div>
        <h2 class="text-sm font-semibold text-gray-800 dark:text-slate-100 dark:text-slate-100">Derniers leads</h2>
        <p class="text-xs text-gray-400 mt-0.5">{{ leads.length }} contacts récents</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/hub/contacts" class="text-xs text-primary-600 hover:underline font-medium hidden sm:block">
          Voir tout →
        </NuxtLink>
        <button
          @click="showQuoteModal = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau devis
        </button>
      </div>
    </div>

    <!-- Liste -->
    <div class="divide-y divide-gray-50 flex-1">
      <div
        v-for="lead in leads"
        :key="lead.id"
        class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
      >
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          :style="`background-color: var(--color-primary-${lead.avatarShade})`"
        >
          {{ initials(lead.name) }}
        </div>

        <!-- Infos -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-slate-100 dark:text-slate-100 truncate">{{ lead.name }}</p>
          <p class="text-xs text-gray-400 truncate">{{ lead.email }}</p>
        </div>

        <!-- Source -->
        <span :class="sourceBadge(lead.source)" class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 hidden md:inline-block">
          {{ lead.source }}
        </span>

        <!-- Statut -->
        <span :class="leadStatusBadge(lead.status)" class="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
          {{ lead.status }}
        </span>

        <!-- Date -->
        <span class="text-xs text-gray-400 shrink-0 hidden lg:block w-20 text-right">{{ lead.date }}</span>
      </div>
    </div>

  </div>

  <!-- ── Modal Nouveau Devis ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showQuoteModal"
        class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        @click.self="showQuoteModal = false"
      >
        <div class="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800 dark:text-slate-100 dark:text-slate-100">Nouveau devis</h3>
            </div>
            <button @click="showQuoteModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal body -->
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Titre du devis</label>
              <input v-model="quote.title" type="text" placeholder="ex: Refonte site e-commerce" class="field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Client</label>
              <select v-model="quote.clientId" class="field">
                <option value="">— Sélectionner un lead —</option>
                <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.name }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Montant estimé (€)</label>
                <input v-model.number="quote.amount" type="number" placeholder="0.00" class="field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Échéance</label>
                <input v-model="quote.deadline" type="date" class="field" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea v-model="quote.notes" rows="3" placeholder="Contexte, besoins…" class="field resize-none" />
            </div>
          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 dark:border-slate-800">
            <button @click="showQuoteModal = false" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-200 transition-colors">
              Annuler
            </button>
            <button
              @click="submitQuote"
              :disabled="!quote.title"
              class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Créer le devis
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export interface Lead {
  id:          number
  name:        string
  email:       string
  source:      'Formulaire' | 'WhatsApp' | 'LinkedIn' | 'Direct'
  date:        string
  status:      'Nouveau' | 'Contacté' | 'Qualifié'
  avatarShade: '500' | '600' | '700'
}

defineProps<{ leads: Lead[] }>()
const emit = defineEmits<{ quoteCreated: [quote: object] }>()

// ── Modal devis ───────────────────────────────────────────────────────────────
const showQuoteModal = ref(false)
const quote = reactive({ title: '', clientId: '', amount: 0, deadline: '', notes: '' })

function submitQuote() {
  emit('quoteCreated', { ...quote, id: Date.now(), createdAt: new Date().toISOString() })
  Object.assign(quote, { title: '', clientId: '', amount: 0, deadline: '', notes: '' })
  showQuoteModal.value = false
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function leadStatusBadge(status: Lead['status']) {
  return {
    'Nouveau':  'bg-primary-50 text-primary-700',
    'Contacté': 'bg-amber-50 text-amber-700',
    'Qualifié': 'bg-green-50 text-green-700',
  }[status] ?? 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-600'
}

function sourceBadge(source: Lead['source']) {
  return {
    'Formulaire': 'bg-blue-50 text-blue-600',
    'WhatsApp':   'bg-green-50 text-green-700',
    'LinkedIn':   'bg-sky-50 text-sky-700',
    'Direct':     'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-600',
  }[source] ?? 'bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 text-gray-500'
}
</script>

<style scoped>
.field {
  @apply w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
         bg-white dark:bg-slate-900 dark:bg-slate-900 text-gray-800 dark:text-slate-100 dark:text-slate-100;
}
</style>
