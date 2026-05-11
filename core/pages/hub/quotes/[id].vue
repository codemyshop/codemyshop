<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/hub/quotes" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </NuxtLink>
      <div v-if="quote" class="flex-1">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Devis #{{ quote.id }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ quote.firstname }} {{ quote.lastname }} — {{ formatDate(quote.dateAdd) }}</p>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8 space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="quote" class="px-6 py-6 space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Statut</h2>
          <select v-model="newStatus" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-2">
            <option value="pending">En attente</option>
            <option value="processing">En cours de traitement</option>
            <option value="sent">Devis envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="refused">Refusé</option>
            <option value="expired">Expiré</option>
          </select>
          <textarea v-model="noteInterne" placeholder="Note interne…" rows="3" class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-2 resize-none" />
          <button @click="updateStatus" :disabled="updating" class="w-full text-xs py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">
            {{ updating ? 'Mise à jour…' : 'Mettre à jour' }}
          </button>
        </div>

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Contact</h2>
          <dl class="space-y-1.5 text-sm">
            <div><dt class="text-[10px] text-gray-400 uppercase">Nom</dt><dd class="font-medium">{{ quote.firstname }} {{ quote.lastname }}</dd></div>
            <div><dt class="text-[10px] text-gray-400 uppercase">Email</dt><dd><a :href="`mailto:${quote.email}`" class="text-primary-600 hover:underline">{{ quote.email }}</a></dd></div>
            <div v-if="quote.phone"><dt class="text-[10px] text-gray-400 uppercase">Téléphone</dt><dd>{{ quote.phone }}</dd></div>
          </dl>
        </div>

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Entreprise</h2>
          <dl class="space-y-1.5 text-sm">
            <div><dt class="text-[10px] text-gray-400 uppercase">Société</dt><dd class="font-medium">{{ quote.company || '—' }}</dd></div>
            <div v-if="quote.siret"><dt class="text-[10px] text-gray-400 uppercase">SIRET</dt><dd>{{ quote.siret }}</dd></div>
            <div><dt class="text-[10px] text-gray-400 uppercase">Activité</dt><dd>{{ quote.activite || '—' }}</dd></div>
          </dl>
          <p v-if="quote.message" class="mt-3 text-xs text-gray-500 italic border-t border-gray-100 dark:border-slate-800 pt-2">{{ quote.message }}</p>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Produits demandés ({{ items.length }})</h2>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
              <th class="px-5 py-2.5 font-medium">ID</th>
              <th class="px-5 py-2.5 font-medium">Produit</th>
              <th class="px-5 py-2.5 font-medium">Réf.</th>
              <th class="px-5 py-2.5 font-medium text-center">Qté demandée</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in items" :key="i" class="border-b border-gray-50 dark:border-slate-800/50">
              <td class="px-5 py-3 font-mono text-xs text-gray-400">#{{ item.id }}</td>
              <td class="px-5 py-3 text-gray-800 dark:text-slate-100">{{ item.name }}</td>
              <td class="px-5 py-3 font-mono text-xs text-gray-400">{{ item.reference || '—' }}</td>
              <td class="px-5 py-3 text-center font-bold">{{ item.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const route = useRoute()
const quote = ref<any>(null)
const items = ref<any[]>([])
const loading = ref(true)
const newStatus = ref('pending')
const noteInterne = ref('')
const updating = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/quotes/${route.params.id}`)
    quote.value = data.quote
    newStatus.value = data.quote.status
    noteInterne.value = data.quote.noteInterne || ''
    items.value = Array.isArray(data.quote.items) ? data.quote.items : []
  } finally { loading.value = false }
}

async function updateStatus() {
  updating.value = true
  try {
    await $fetch(`/api/bo/quotes/${route.params.id}/status`, {
      method: 'PUT',
      body: { status: newStatus.value, noteInterne: noteInterne.value },
    })
    await load()
  } finally { updating.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(load)
</script>
