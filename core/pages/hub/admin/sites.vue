
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth' })
useHead({ title: 'Gestion de Flotte — Admin Hub' })

interface SiteRecord {
  id: string
  name?: string
  domain: string
  status: string
  offer?: string
  vps_ip?: string
  created_at?: string
}

const { data: sites, refresh, pending } = await useFetch<SiteRecord[]>('/api/admin/sites', {
  default: () => [],
})

const deleteTarget = ref<SiteRecord | null>(null)
const isDeleting = ref(false)
const deleteResult = ref<{ success: boolean; steps: string[] } | null>(null)

async function confirmDelete() {
  if (!deleteTarget.value || isDeleting.value) return
  isDeleting.value = true
  deleteResult.value = null

  try {
    const result = await $fetch<{ success: boolean; steps: string[] }>(`/api/admin/sites/${deleteTarget.value.id}`, {
      method: 'DELETE',
    })
    deleteResult.value = result
    await refresh()
  } catch (err: any) {
    deleteResult.value = { success: false, steps: [err?.data?.message || 'Erreur réseau'] }
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  deleteTarget.value = null
  deleteResult.value = null
}

function statusColor(status: string) {
  if (status === 'active') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  if (status === 'provisioning') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
  if (status === 'suspended') return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
  return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
}

function offerLabel(site: SiteRecord) {
  if (site.offer === 'starter') return 'Starter'
  if (site.offer === 'premium') return 'Premium'
  
  if (site.id === 'ac-hub') return 'Hub (master)'
  return 'Custom'
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

    
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900 dark:text-white">Gestion de Flotte</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ sites?.length || 0 }} site(s) déployé(s)</p>
      </div>
      <div class="flex gap-3">
        <button
          class="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          @click="refresh()"
        >
          Rafraîchir
        </button>
        <NuxtLink
          to="/hub/admin/provisioning"
          class="bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau Site
        </NuxtLink>
      </div>
    </div>

    
    <div v-if="pending" class="text-center py-16">
      <svg class="w-8 h-8 animate-spin text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    
    <div v-else class="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-white/[0.06]">
            <th class="text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Client</th>
            <th class="text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Domaine</th>
            <th class="text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Offre</th>
            <th class="text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Statut</th>
            <th class="text-left text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">IP</th>
            <th class="text-right text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="site in sites"
            :key="site.id"
            class="border-b border-gray-100 dark:border-white/[0.03] last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <td class="px-6 py-4">
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ site.name || site.id }}</p>
                <p class="text-xs font-mono text-gray-500 dark:text-slate-500">{{ site.id }}</p>
              </div>
            </td>
            <td class="px-6 py-4">
              <a :href="`https://${site.domain}`" target="_blank" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {{ site.domain }}
              </a>
            </td>
            <td class="px-6 py-4">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full"
                :class="site.offer === 'premium' || site.id === 'ac-hub'
                  ? 'bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400'
                  : 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'"
              >
                {{ offerLabel(site) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" :class="statusColor(site.status)">
                <span class="w-1.5 h-1.5 rounded-full"
                  :class="site.status === 'active' ? 'bg-emerald-500' : site.status === 'provisioning' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'"
                />
                {{ site.status }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="text-xs font-mono text-gray-500 dark:text-slate-500">{{ site.vps_ip || '—' }}</span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="site.id !== 'ac-hub'"
                class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
                @click="deleteTarget = site"
              >
                Supprimer
              </button>
              <span v-else class="text-xs text-gray-300 dark:text-slate-600">protégé</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">

          
          <div v-if="deleteResult">
            <h3 class="text-lg font-bold mb-4" :class="deleteResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
              {{ deleteResult.success ? 'Suppression terminée' : 'Erreur' }}
            </h3>
            <div class="bg-gray-900 dark:bg-black/30 rounded-lg p-3 font-mono text-xs text-emerald-400 max-h-40 overflow-y-auto mb-4">
              <div v-for="(step, i) in deleteResult.steps" :key="i" class="mb-1">{{ step }}</div>
            </div>
            <button class="w-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-lg" @click="cancelDelete()">
              Fermer
            </button>
          </div>

          
          <div v-else>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Supprimer {{ deleteTarget.name || deleteTarget.id }} ?</h3>
            <p class="text-sm text-gray-500 dark:text-slate-400 mb-2">
              Cette action va :
            </p>
            <ul class="text-xs text-gray-500 dark:text-slate-400 space-y-1 mb-6 ml-4">
              <li>• Arrêter et supprimer le container Docker</li>
              <li>• Supprimer la configuration Nginx</li>
              <li>• Retirer le client du registre</li>
              <li>• Recharger Nginx</li>
            </ul>
            <p class="text-xs text-red-500 font-semibold mb-4">
              Le domaine {{ deleteTarget.domain }} ne sera plus accessible.
            </p>
            <div class="flex gap-3">
              <button class="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-lg" @click="cancelDelete()">
                Annuler
              </button>
              <button
                class="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                :disabled="isDeleting"
                @click="confirmDelete()"
              >
                {{ isDeleting ? 'Suppression...' : 'Confirmer la suppression' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
