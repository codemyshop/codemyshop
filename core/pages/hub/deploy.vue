<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/dashboard" class="text-gray-400 hover:text-primary-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Déployer un client</h1>
          <p class="text-xs text-gray-400 mt-0.5">Tunnel de mise en production · Marque Blanche</p>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-3xl mx-auto">

      
      <div class="flex items-center mb-8">
        <template v-for="(step, i) in STEPS" :key="step.id">
          <div class="flex items-center gap-2">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                currentStep > i   ? 'bg-green-500 text-white'
                : currentStep === i ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400',
              ]"
            >
              <svg v-if="currentStep > i" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              :class="currentStep === i ? 'text-gray-800 dark:text-slate-100 font-semibold' : 'text-gray-400'"
              class="text-sm hidden sm:block"
            >{{ step.label }}</span>
          </div>
          <div
            v-if="i < STEPS.length - 1"
            :class="currentStep > i ? 'bg-green-400' : 'bg-gray-200'"
            class="flex-1 h-0.5 mx-3 transition-colors duration-500"
          />
        </template>
      </div>

      
      <div v-if="currentStep === 0" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div>
          <h2 class="text-base font-semibold text-gray-800 dark:text-slate-100 mb-1">Informations projet</h2>
          <p class="text-sm text-gray-400">Identifiant unique, nom commercial et domaine de déploiement.</p>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Identifiant client <span class="text-red-400">*</span></label>
              <input
                v-model="form.id"
                type="text"
                placeholder="ex: monsite-fr"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                @input="form.id = ($event.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '-')"
              />
              <p class="text-xs text-gray-400 mt-1">Slug unique, minuscules + tirets</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nom commercial <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="ex: Mon Site E-commerce"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Domaine de production <span class="text-red-400">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">https://</span>
              <input
                v-model="form.domain"
                type="text"
                placeholder="monsite.fr"
                class="w-full pl-16 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">VPS / IP serveur</label>
            <input
              v-model="form.vps_ip"
              type="text"
              placeholder="ex: 51.75.26.78"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Couleur primaire (charte)</label>
            <div class="flex items-center gap-3">
              <input
                v-model="form.primaryColor"
                type="color"
                class="w-10 h-9 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer p-0.5"
              />
              <input
                v-model="form.primaryColor"
                type="text"
                placeholder="#4F46E5"
                class="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            @click="goStep(1)"
            :disabled="!form.id || !form.name || !form.domain"
            class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Suivant
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      
      <div v-else-if="currentStep === 1" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div>
          <h2 class="text-base font-semibold text-gray-800 dark:text-slate-100 mb-1">Source de données</h2>
          <p class="text-sm text-gray-400">Connexion au moteur PrestaShop et à la base de données.</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">URL du PrestaShop <span class="text-red-400">*</span></label>
            <input
              v-model="form.api_endpoint"
              type="url"
              placeholder="https://monsite.fr"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <p class="text-xs text-gray-400 mt-1">URL racine du PrestaShop (sans /api ni slash final)</p>
          </div>

          <hr class="border-gray-100 dark:border-slate-800" />
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Base de données MariaDB</p>

          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-600 mb-1">Hôte</label>
              <input
                v-model="form.db_config.host"
                type="text"
                placeholder="localhost ou 127.0.0.1"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Port</label>
              <input
                v-model.number="form.db_config.port"
                type="number"
                placeholder="3306"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nom de la BDD</label>
              <input
                v-model="form.db_config.name"
                type="text"
                placeholder="prestashop"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Utilisateur BDD</label>
              <input
                v-model="form.db_config.user"
                type="text"
                placeholder="ps_user"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>
        </div>

        
        <div class="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 leading-relaxed">
          <p class="text-gray-500 mb-2">// config/clients/{{ form.id || 'client-id' }}.ts — aperçu</p>
          <p><span class="text-purple-400">export default</span> <span class="text-yellow-300">config</span> <span class="text-gray-400">= &#123;</span></p>
          <p class="pl-4"><span class="text-sky-300">clientId</span><span class="text-gray-400">:</span> <span class="text-green-300">'{{ form.id || 'client-id' }}'</span><span class="text-gray-400">,</span></p>
          <p class="pl-4"><span class="text-sky-300">domain</span><span class="text-gray-400">:</span>   <span class="text-green-300">'{{ form.domain || 'domaine.fr' }}'</span><span class="text-gray-400">,</span></p>
          <p class="pl-4"><span class="text-sky-300">theme</span><span class="text-gray-400">: &#123; colors: &#123;</span> <span class="text-sky-300">primary</span><span class="text-gray-400">:</span> <span class="text-green-300">'{{ form.primaryColor }}'</span> <span class="text-gray-400">&#125; &#125;,</span></p>
          <p class="pl-4 text-gray-500">// api_endpoint, db_config, logo, menu…</p>
          <p><span class="text-gray-400">&#125;</span></p>
        </div>

        <div class="flex justify-between pt-2">
          <button @click="goStep(0)" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-100 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Retour
          </button>
          <button
            @click="startDeploy"
            :disabled="!form.api_endpoint"
            class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Lancer le déploiement
          </button>
        </div>
      </div>

      
      <div v-else-if="currentStep === 2" class="space-y-4">

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {{ isResetting ? 'Nettoyage en cours…' : deployDone ? 'Déploiement terminé' : 'Déploiement en cours…' }}
            </span>
            <span class="text-sm font-bold tabular-nums" :class="deployDone ? 'text-green-600' : deployError ? 'text-red-600' : 'text-primary-600'">
              {{ progressPct }}%
            </span>
          </div>
          <div class="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full transition-all duration-500"
              :class="deployDone ? 'bg-green-500' : deployError ? 'bg-red-500' : 'bg-primary-500'"
              :style="`width: ${progressPct}%`"
            />
          </div>
        </div>

        
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          
          <div class="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
            <span class="w-3 h-3 rounded-full bg-red-500" />
            <span class="w-3 h-3 rounded-full bg-amber-400" />
            <span class="w-3 h-3 rounded-full bg-green-500" />
            <span class="ml-3 text-xs text-gray-400 font-mono">deploy-client.sh {{ form.id }}</span>
          </div>

          
          <div class="p-4 font-mono text-xs leading-relaxed space-y-1.5 min-h-[200px]">
            <div
              v-for="(line, i) in termLines"
              :key="i"
              class="flex items-start gap-2"
              :class="line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-green-400' : 'text-gray-300'"
            >
              <span class="text-gray-600 shrink-0 select-none mt-px">$</span>
              <span>{{ line.text }}</span>
              <span v-if="line.loading" class="ml-1 inline-block w-2 h-3.5 bg-gray-400 animate-pulse" />
            </div>

            
            <div v-if="deployDone" class="flex items-center gap-2 text-green-400 mt-2">
              <span class="text-gray-600">$</span>
              <span>Déploiement terminé avec succès ✓</span>
            </div>
          </div>
        </div>

        
        <Transition enter-active-class="transition-all duration-500" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
          <div v-if="deployDone" class="bg-white dark:bg-slate-900 rounded-xl border border-green-100 shadow-sm p-5 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">{{ form.name }} est en ligne</p>
                <p class="text-xs text-gray-400">Fichier de config généré · Client enregistré dans le registre</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 space-y-1">
                <p class="font-semibold text-gray-500 uppercase tracking-widest text-[10px]">Config générée</p>
                <p class="font-mono text-gray-700 dark:text-slate-200">config/clients/{{ form.id }}.ts</p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 space-y-1">
                <p class="font-semibold text-gray-500 uppercase tracking-widest text-[10px]">Prochaine étape</p>
                <p class="text-gray-700 dark:text-slate-200">Personnaliser le theme + menu dans le fichier</p>
              </div>
            </div>

            <div class="flex gap-3">
              <NuxtLink
                to="/hub/admin/sites"
                class="flex-1 text-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Voir la flotte →
              </NuxtLink>
              <button
                @click="resetWizard"
                class="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:bg-slate-950 transition-colors"
              >
                Nouveau déploiement
              </button>
              <button
                @click="resetInstance"
                class="px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Reset Instance
              </button>
            </div>
          </div>
        </Transition>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const STEPS = [
  { id: 'project', label: 'Projet' },
  { id: 'datasource', label: 'Source de données' },
  { id: 'deploy', label: 'Déploiement' },
]
const currentStep = ref(0)

const form = reactive({
  id:            '',
  name:          '',
  domain:        '',
  vps_ip:        '',
  api_endpoint:  '',
  primaryColor:  '#4F46E5',
  db_config: {
    host: 'localhost',
    port: 3306,
    name: '',
    user: '',
  },
})

function goStep(n: number) { currentStep.value = n }

interface TermLine { text: string; type: 'info' | 'success' | 'error'; loading: boolean }

const termLines   = ref<TermLine[]>([])
const deployDone  = ref(false)
const deployError = ref(false)
const progressPct = ref(0)
const isResetting = ref(false)
let eventSource: EventSource | null = null

function streamScript(action: 'deploy' | 'cleanup') {
  return new Promise<boolean>((resolve) => {
    const params = new URLSearchParams({
      clientId: form.id,
      domain: form.domain,
      action,
    })

    eventSource = new EventSource(`/api/admin/deploy-stream?${params}`)
    let lineCount = 0

    eventSource.onmessage = (ev) => {
      if (ev.data === '[DONE]') {
        eventSource?.close()
        eventSource = null
        resolve(!deployError.value)
        return
      }

      try {
        const msg = JSON.parse(ev.data)
        lineCount++

        if (msg.type === 'done') {
          deployDone.value = true
          progressPct.value = 100
          termLines.value.push({ text: msg.text, type: 'success', loading: false })
        } else if (msg.type === 'error') {
          deployError.value = true
          termLines.value.push({ text: msg.text, type: 'error', loading: false })
        } else {
          termLines.value.push({ text: msg.text, type: msg.type, loading: false })
        }

        
        progressPct.value = Math.min(95, Math.round((lineCount / 30) * 100))
      } catch {  }
    }

    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      if (!deployDone.value) {
        deployError.value = true
        termLines.value.push({ text: 'Connexion SSE perdue', type: 'error', loading: false })
      }
      resolve(false)
    }
  })
}

async function registerClient() {
  try {
    await $fetch('/api/clients', {
      method: 'POST',
      body: {
        id:           form.id,
        name:         form.name,
        domain:       form.domain,
        vps_ip:       form.vps_ip,
        api_endpoint: form.api_endpoint,
        db_config:    { ...form.db_config },
      },
    })
  } catch {  }
}

async function startDeploy() {
  currentStep.value = 2
  termLines.value   = []
  deployDone.value  = false
  deployError.value = false
  progressPct.value = 0

  await registerClient()
  const success = await streamScript('deploy')
  if (success) {
    try {
      await $fetch(`/api/clients/${form.id}`, { method: 'PATCH', body: { status: 'active' } })
    } catch {  }
  }
}

async function resetInstance() {
  if (!confirm(`Supprimer l'instance ${form.id} ? Container, Nginx et dossier seront supprimés.`)) return

  isResetting.value = true
  termLines.value   = []
  deployDone.value  = false
  deployError.value = false
  progressPct.value = 0
  currentStep.value = 2

  await streamScript('cleanup')
  isResetting.value = false
}

function resetWizard() {
  eventSource?.close()
  currentStep.value = 0
  form.id = ''; form.name = ''; form.domain = ''
  form.vps_ip = ''; form.api_endpoint = ''
  form.primaryColor = '#4F46E5'
  form.db_config = { host: 'localhost', port: 3306, name: '', user: '' }
  termLines.value = []; deployDone.value = false; deployError.value = false; progressPct.value = 0
}

onUnmounted(() => { eventSource?.close() })
</script>
