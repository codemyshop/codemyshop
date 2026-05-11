<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Nurturing Studio</h1>
          <p class="text-xs text-gray-400 mt-0.5">G&eacute;n&eacute;rez des s&eacute;quences automatis&eacute;es multi-canal avec l'IA</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
          Premium
        </span>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        
        <div class="lg:col-span-2 space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Configuration</h2>

            <div class="space-y-4">
              <div>
                <label class="label">Objectif de la s&eacute;quence *</label>
                <select v-model="form.objective" class="input-field text-sm">
                  <option value="">-- Choisir --</option>
                  <option v-for="obj in OBJECTIVES" :key="obj.value" :value="obj.value">{{ obj.label }}</option>
                </select>
                <input
                  v-if="form.objective === 'custom'"
                  v-model="form.customObjective"
                  placeholder="D&eacute;crivez votre objectif..."
                  class="input-field text-xs mt-2"
                />
              </div>

              <div>
                <label class="label">Avatar cible *</label>
                <div v-if="avatarsLoading" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <select v-else v-model="form.avatarIdx" class="input-field text-sm">
                  <option :value="-1">-- Tous les visiteurs --</option>
                  <option v-for="(av, i) in avatarDefs" :key="av.id" :value="i">
                    {{ av.icon }} {{ av.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="label">Dur&eacute;e</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="d in DURATIONS"
                    :key="d.value"
                    @click="form.duration = d.value"
                    :class="[
                      'py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-center',
                      form.duration === d.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                    ]"
                  >
                    {{ d.label }}
                    <span class="block text-[10px] font-normal mt-0.5" :class="form.duration === d.value ? 'text-primary-500' : 'text-gray-400'">{{ d.steps }} msgs</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="label">Mix Canaux</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="form.channels = 'email'"
                    :class="[
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      form.channels === 'email'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                    ]"
                  >
                    &#x1f4e7; Email seul
                  </button>
                  <button
                    @click="form.channels = 'mix'"
                    :class="[
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      form.channels === 'mix'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                    ]"
                  >
                    &#x1f4e7; + &#x1f4ac; Mix
                  </button>
                </div>
              </div>
            </div>
          </div>

          
          <AIActionButton
            label="G&eacute;n&eacute;rer la s&eacute;quence IA"
            loading-label="G&eacute;n&eacute;ration en cours…"
            :is-loading="generating"
            :disabled="!canGenerate"
            size="lg"
            class="w-full"
            @click="generate"
          />
        </div>

        
        <div class="lg:col-span-3">

          
          <div v-if="!sequence" class="flex flex-col items-center justify-center py-24 text-gray-300">
            <svg class="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
            <p class="text-sm font-medium text-gray-400">La timeline appara&icirc;tra ici</p>
            <p class="text-xs text-gray-300 mt-1">Configurez et g&eacute;n&eacute;rez votre s&eacute;quence</p>
          </div>

          
          <div v-else class="space-y-0">
            
            <div class="bg-white dark:bg-slate-900 rounded-t-xl border border-gray-100 dark:border-slate-800 shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ sequence.objective }}</p>
                <p class="text-xs text-gray-400">{{ sequence.steps.length }} &eacute;tapes &middot; Avatar : {{ sequence.avatar }}</p>
              </div>
              <button
                @click="exportSequence"
                class="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {{ exported ? 'Copi\u00e9 !' : 'Exporter' }}
              </button>
            </div>

            
            <div class="relative">
              
              <div class="absolute left-[29px] top-0 bottom-0 w-px bg-gray-200" />

              <div
                v-for="(step, i) in sequence.steps"
                :key="i"
                class="relative flex gap-4 px-5 py-4 bg-white dark:bg-slate-900 border-x border-b border-gray-100 dark:border-slate-800"
                :class="i === sequence.steps.length - 1 ? 'rounded-b-xl shadow-sm' : ''"
              >
                
                <div class="relative z-10 flex flex-col items-center shrink-0">
                  <div
                    class="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
                    :class="step.channel === 'whatsapp'
                      ? 'border-green-400 bg-green-50'
                      : 'border-primary-400 bg-primary-50'"
                  >
                    <div class="w-2 h-2 rounded-full" :class="step.channel === 'whatsapp' ? 'bg-green-500' : 'bg-primary-500'" />
                  </div>
                  
                  <span class="text-[9px] font-bold text-gray-400 mt-1 whitespace-nowrap">
                    {{ step.dayOffset === 0 ? 'J+0' : `J+${step.dayOffset}` }}
                  </span>
                </div>

                
                <div class="flex-1 min-w-0">
                  
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="step.channel === 'whatsapp'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-primary-50 text-primary-700 border border-primary-100'"
                    >
                      {{ step.channel === 'whatsapp' ? '&#x1f4ac; WhatsApp' : '&#x1f4e7; Email' }}
                    </span>
                    <span class="text-[10px] text-gray-400">
                      {{ step.dayOffset === 0 ? 'Imm&eacute;diat' : `Attendre ${step.dayOffset} jour${step.dayOffset > 1 ? 's' : ''}` }}
                    </span>
                  </div>

                  
                  <p v-if="step.channel === 'email' && step.subject" class="text-xs font-bold text-gray-800 dark:text-slate-100 mb-1">
                    {{ step.subject }}
                  </p>

                  
                  <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{{ step.body }}</p>

                  
                  <div class="mt-2 flex items-center gap-1.5">
                    <svg class="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    <p class="text-[10px] text-gray-400 italic">{{ step.goal }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import type { NurturingSequence } from '~/server/api/ai/generate-nurturing.post'
interface AvatarDefinition { id: number; name: string; slug: string; icon: string; colorClass: string; keywords: string[] }

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()

const OBJECTIVES = [
  { value: 'Onboarding nouveau client',            label: 'Onboarding nouveau client' },
  { value: 'Relance clients inactifs (60+ jours)',  label: 'Relance clients inactifs' },
  { value: 'Upsell post-achat',                     label: 'Upsell post-achat' },
  { value: 'Restock automatique',                   label: 'Rappel restock' },
  { value: 'Promotion saisonnière',                 label: 'Promotion saisonnière' },
  { value: 'custom',                                label: 'Autre (personnalisé)...' },
]

const DURATIONS = [
  { value: 'short',  label: 'Courte',  steps: 3 },
  { value: 'medium', label: 'Moyenne', steps: 5 },
  { value: 'long',   label: 'Longue',  steps: 7 },
]

const form = reactive({
  objective:       '',
  customObjective: '',
  avatarIdx:       -1,
  duration:        'medium',
  channels:        'mix' as 'email' | 'mix',
})

const generating  = ref(false)
const sequence    = ref<NurturingSequence | null>(null)
const exported    = ref(false)

const avatarDefs     = ref<AvatarDefinition[]>([])
const avatarsLoading = ref(true)

async function loadAvatars() {
  avatarsLoading.value = true
  try {
    avatarDefs.value = await $fetch<AvatarDefinition[]>('/api/hub/avatars', {
      query: { clientId: resolvedClientId.value },
    })
  } catch { avatarDefs.value = [] }
  finally { avatarsLoading.value = false }
}

const selectedAvatar = computed(() =>
  form.avatarIdx >= 0 ? avatarDefs.value[form.avatarIdx] : null
)

const effectiveObjective = computed(() =>
  form.objective === 'custom' ? form.customObjective : form.objective
)

const canGenerate = computed(() => !!effectiveObjective.value?.trim())

async function generate() {
  if (!canGenerate.value || generating.value) return
  generating.value = true
  sequence.value   = null

  try {
    const res = await $fetch<NurturingSequence>('/api/ai/generate-nurturing', {
      method: 'POST',
      body: {
        objective:   effectiveObjective.value,
        avatarName:  selectedAvatar.value?.name ?? 'Tous les visiteurs',
        avatarRules: selectedAvatar.value?.rules ?? '',
        duration:    form.duration,
        channels:    form.channels,
        clientId:    resolvedClientId.value,
      },
    })
    sequence.value = res
  } catch (err) {
    console.error('[nurturing] generate error:', err)
  } finally {
    generating.value = false
  }
}

async function exportSequence() {
  if (!sequence.value) return
  const json = JSON.stringify(sequence.value, null, 2)
  try {
    await navigator.clipboard.writeText(json)
    exported.value = true
    setTimeout(() => { exported.value = false }, 2500)
  } catch {  }
}

onMounted(loadAvatars)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900;
}
.label {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5;
}
</style>
