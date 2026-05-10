<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth' })

useHead({ title: 'Provisioning — Admin Hub' })

const form = reactive({
  clientId: '',
  clientName: '',
  offer: 'starter' as 'starter' | 'premium',
  domain: '',
  region: 'GRA' as string,
  email: '',
})

const regions = [
  { value: 'GRA', label: 'Gravelines (Nord)' },
  { value: 'SBG', label: 'Strasbourg (Est)' },
  { value: 'RBX', label: 'Roubaix (Nord)' },
  { value: 'BHS', label: 'Beauharnois (Canada — non souverain)' },
]

const isSubmitting = ref(false)
const deployStatus = ref<'idle' | 'provisioning' | 'success' | 'error'>('idle')
const deployLog = ref<string[]>([])
const errorMessage = ref('')

const isValid = computed(() =>
  form.clientId.trim().length >= 2
  && form.clientName.trim().length >= 2
  && form.domain.trim().includes('.')
  && form.email.trim().includes('@')
  && !form.region.startsWith('BHS') // Bloquer les régions non-souveraines pour le moment
)

// Auto-generate clientId from the name
watch(() => form.clientName, (name) => {
  if (!form.clientId || form.clientId === slugify(form.clientName)) {
    form.clientId = slugify(name)
  }
})

function slugify(str: string): string {
  return str.trim().toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ùûü]/g, 'u')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function launchProvisioning() {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  deployStatus.value = 'provisioning'
  deployLog.value = []
  errorMessage.value = ''

  deployLog.value.push(`[${new Date().toLocaleTimeString()}] Démarrage du provisioning ${form.offer.toUpperCase()} pour ${form.clientId}...`)

  try {
    const data = await $fetch<{ success: boolean; steps: string[]; error?: string }>('/api/admin/provision', {
      method: 'POST',
      body: {
        clientId: form.clientId.trim(),
        clientName: form.clientName.trim(),
        offer: form.offer,
        domain: form.domain.trim(),
        region: form.region,
        email: form.email.trim(),
      },
    })

    if (data.success) {
      deployStatus.value = 'success'
      deployLog.value.push(...(data.steps || []))
      deployLog.value.push(`[${new Date().toLocaleTimeString()}] ✓ Provisioning terminé`)
    } else {
      deployStatus.value = 'error'
      errorMessage.value = data.error || 'Erreur inconnue'
      deployLog.value.push(`[${new Date().toLocaleTimeString()}] ✗ Erreur : ${data.error}`)
    }
  } catch (err: any) {
    deployStatus.value = 'error'
    errorMessage.value = err?.data?.message || err?.message || 'Erreur réseau'
    deployLog.value.push(`[${new Date().toLocaleTimeString()}] ✗ ${errorMessage.value}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-extrabold text-gray-900 dark:text-white">Provisioning Client</h1>
      <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Déployer un nouveau client CodeMyShop en un clic.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

      <!-- Formulaire -->
      <div class="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
        <h2 class="text-base font-bold text-gray-900 dark:text-white mb-6">Configuration</h2>

        <div class="space-y-5">
          <!-- Client name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nom du client *</label>
            <input v-model="form.clientName" type="text" placeholder="Ex : Stéphanie Immobilier"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          <!-- Client ID (auto-generated) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Client ID (slug) *</label>
            <input v-model="form.clientId" type="text" placeholder="stephanie-immobilier"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email du client *</label>
            <input v-model="form.email" type="email" placeholder="contact@stephanie-immo.fr"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          <!-- Type d'offre -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Type d'offre *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                class="px-4 py-3 rounded-lg text-sm font-semibold border transition-all text-left"
                :class="form.offer === 'starter'
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400'"
                @click="form.offer = 'starter'"
              >
                <span class="block">Starter</span>
                <span class="text-xs font-normal opacity-70">Mutualisé — Lead Gen</span>
              </button>
              <button
                class="px-4 py-3 rounded-lg text-sm font-semibold border transition-all text-left"
                :class="form.offer === 'premium'
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400'"
                @click="form.offer = 'premium'"
              >
                <span class="block">Premium</span>
                <span class="text-xs font-normal opacity-70">Dédié — E-commerce</span>
              </button>
            </div>
          </div>

          <!-- Domaine -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Domaine cible *</label>
            <input v-model="form.domain" type="text" placeholder="stephanie-immo.fr"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          <!-- OVH region -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Région OVH *</label>
            <select v-model="form.region"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all appearance-none">
              <option v-for="r in regions" :key="r.value" :value="r.value" class="bg-white dark:bg-slate-800">{{ r.label }}</option>
            </select>
            <p v-if="form.region === 'BHS'" class="text-xs text-red-500 mt-1">Région non souveraine — déconseillé pour les clients français.</p>
          </div>

          <!-- Bouton -->
          <button
            class="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-all mt-2"
            :disabled="!isValid || isSubmitting"
            @click="launchProvisioning"
          >
            <span v-if="!isSubmitting">Lancer le Déploiement Souverain</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Provisioning en cours...
            </span>
          </button>
        </div>
      </div>

      <!-- Panneau de statut -->
      <div class="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
        <h2 class="text-base font-bold text-gray-900 dark:text-white mb-4">Journal de déploiement</h2>

        <!-- Config summary -->
        <div v-if="form.clientId" class="bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-4 space-y-2">
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">Client</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ form.clientId }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">Offre</span>
            <span class="font-semibold" :class="form.offer === 'premium' ? 'text-accent-600 dark:text-accent-400' : 'text-primary-600 dark:text-primary-400'">
              {{ form.offer === 'premium' ? 'Premium (VPS dédié)' : 'Starter (mutualisé)' }}
            </span>
          </div>
          <div v-if="form.domain" class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">Domaine</span>
            <span class="text-gray-900 dark:text-white">{{ form.domain }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">Région</span>
            <span class="text-gray-900 dark:text-white">{{ regions.find(r => r.value === form.region)?.label }}</span>
          </div>
        </div>

        <!-- Logs -->
        <div class="bg-gray-900 dark:bg-black/30 rounded-lg p-4 font-mono text-xs text-emerald-400 min-h-[200px] max-h-[400px] overflow-y-auto">
          <div v-if="deployLog.length === 0" class="text-slate-600">
            En attente du lancement...
          </div>
          <div v-for="(line, i) in deployLog" :key="i" class="mb-1">
            {{ line }}
          </div>
          <span v-if="deployStatus === 'provisioning'" class="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
        </div>

        <!-- Status badge -->
        <div class="mt-4">
          <span v-if="deployStatus === 'success'" class="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Déployé
          </span>
          <span v-else-if="deployStatus === 'error'" class="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-red-500 rounded-full" /> Erreur
          </span>
          <span v-else-if="deployStatus === 'provisioning'" class="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> En cours
          </span>
        </div>
      </div>

    </div>
  </div>
</template>
