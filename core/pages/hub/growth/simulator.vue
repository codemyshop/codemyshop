<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Simulateur de Croissance IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">Fixez un objectif de CA et visualisez les math&eacute;matiques pour y arriver</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
          Phase 5 &middot; Flywheel
        </span>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-8">

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Param&egrave;tres de croissance</p>
          <p class="text-sm text-gray-300 mt-0.5">Ajustez les curseurs pour mod&eacute;liser votre sc&eacute;nario</p>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objectif CA mensuel</label>
              <span class="text-sm font-extrabold text-primary-700">{{ formatEur(inputs.targetRevenue) }}</span>
            </div>
            <input v-model.number="inputs.targetRevenue" type="range" min="10000" max="500000" step="5000" class="w-full accent-primary-600" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>10k &euro;</span><span>500k &euro;</span>
            </div>
          </div>

          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Panier moyen</label>
              <span class="text-sm font-extrabold text-primary-700">{{ formatEur(inputs.avgBasket) }}</span>
            </div>
            <input v-model.number="inputs.avgBasket" type="range" min="10" max="2000" step="10" class="w-full accent-primary-600" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>10 &euro;</span><span>2 000 &euro;</span>
            </div>
          </div>

          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taux de conversion</label>
              <span class="text-sm font-extrabold text-primary-700">{{ inputs.conversionRate.toFixed(1) }}%</span>
            </div>
            <input v-model.number="inputs.conversionRate" type="range" min="0.5" max="10" step="0.1" class="w-full accent-primary-600" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0.5%</span><span>10%</span>
            </div>
          </div>

          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">CAC (Co&ucirc;t Acquisition Client)</label>
              <span class="text-sm font-extrabold text-primary-700">{{ formatEur(inputs.cac) }}</span>
            </div>
            <input v-model.number="inputs.cac" type="range" min="1" max="200" step="1" class="w-full accent-primary-600" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>1 &euro;</span><span>200 &euro;</span>
            </div>
          </div>

        </div>
      </div>

      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

        
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-primary-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clients requis / mois</p>
            </div>
            <p class="text-3xl font-extrabold text-gray-900">{{ kpi.requiredClients }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ formatEur(inputs.targetRevenue) }} &divide; {{ formatEur(inputs.avgBasket) }} panier</p>
            
            <div class="mt-4">
              <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>Progression vers objectif</span>
                <span class="font-bold text-primary-600">{{ gaugePercent(kpi.requiredClients, 500) }}%</span>
              </div>
              <div class="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500" :style="`width: ${gaugePercent(kpi.requiredClients, 500)}%`" />
              </div>
            </div>
          </div>
        </div>

        
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-success-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-success-100 text-success-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trafic requis / mois</p>
            </div>
            <p class="text-3xl font-extrabold text-gray-900">{{ kpi.requiredTraffic.toLocaleString('fr-FR') }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ kpi.requiredClients }} clients &divide; {{ inputs.conversionRate }}% conversion</p>
            <div class="mt-4">
              <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>Volume de trafic</span>
                <span class="font-bold text-success-600">{{ gaugePercent(kpi.requiredTraffic, 100000) }}%</span>
              </div>
              <div class="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-success-400 to-success-600 rounded-full transition-all duration-500" :style="`width: ${gaugePercent(kpi.requiredTraffic, 100000)}%`" />
              </div>
            </div>
          </div>
        </div>

        
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-warning-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-warning-100 text-warning-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Budget Marketing / mois</p>
            </div>
            <p class="text-3xl font-extrabold text-gray-900">{{ formatEur(kpi.marketingBudget) }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ kpi.requiredClients }} clients &times; {{ formatEur(inputs.cac) }} CAC</p>
            <div class="mt-4">
              <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>Ratio budget / CA</span>
                <span class="font-bold" :class="kpi.budgetRatio < 15 ? 'text-success-600' : kpi.budgetRatio < 30 ? 'text-warning-600' : 'text-danger-600'">
                  {{ kpi.budgetRatio.toFixed(1) }}%
                </span>
              </div>
              <div class="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="kpi.budgetRatio < 15 ? 'bg-gradient-to-r from-success-400 to-success-600' : kpi.budgetRatio < 30 ? 'bg-gradient-to-r from-warning-400 to-warning-600' : 'bg-gradient-to-r from-danger-400 to-danger-600'"
                  :style="`width: ${Math.min(100, kpi.budgetRatio * 2)}%`"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 lg:p-8 text-white shadow-xl">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="text-center">
            <p class="text-3xl font-extrabold">{{ formatEur(inputs.targetRevenue) }}</p>
            <p class="text-xs text-gray-400 mt-1">CA cible / mois</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-extrabold text-primary-400">{{ kpi.requiredClients }}</p>
            <p class="text-xs text-gray-400 mt-1">Clients / mois</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-extrabold text-success-400">{{ (kpi.requiredTraffic / 1000).toFixed(1) }}k</p>
            <p class="text-xs text-gray-400 mt-1">Visiteurs / mois</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-extrabold" :class="kpi.roi > 3 ? 'text-success-400' : kpi.roi > 1 ? 'text-warning-400' : 'text-danger-400'">
              x{{ kpi.roi.toFixed(1) }}
            </p>
            <p class="text-xs text-gray-400 mt-1">ROI Marketing</p>
          </div>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Plan d'action IA</h2>
          <p class="text-xs text-gray-400 mt-0.5">3 leviers personnalis&eacute;s pour atteindre votre objectif en 90 jours</p>
        </div>

        <div v-if="!advice" class="p-6">
          <AIActionButton
            label="Générer un plan d'action pour atteindre cet objectif"
            loading-label="Analyse en cours…"
            :is-loading="generating"
            size="lg"
            class="w-full"
            @click="generateAdvice"
          />
        </div>

        
        <div v-else class="p-6 space-y-5">
          
          <div class="bg-primary-50 border border-primary-100 rounded-xl p-4">
            <p class="text-sm text-primary-800 font-medium leading-relaxed">{{ advice.summary }}</p>
          </div>

          
          <div class="space-y-4">
            <div
              v-for="(action, i) in advice.actions"
              :key="i"
              class="relative bg-gray-50 rounded-xl border border-gray-100 dark:border-slate-800 p-5 hover:shadow-sm transition-shadow"
            >
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-gray-900 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                  {{ i + 1 }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ action.title }}</h3>
                  </div>
                  <div class="flex items-center gap-3 mb-3">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                      {{ action.channel }}
                    </span>
                    <span class="text-xs font-bold text-success-600">{{ action.impact }}</span>
                  </div>
                  <p class="text-xs text-gray-500 leading-relaxed">{{ action.detail }}</p>
                </div>
              </div>
            </div>
          </div>

          
          <button
            @click="advice = null"
            class="text-xs text-gray-400 hover:text-primary-600 font-medium transition-colors"
          >
            Modifier les param&egrave;tres et reg&eacute;n&eacute;rer &rarr;
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">

import type { GrowthAdvice } from '~/server/api/ai/growth-advice.post'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()

const inputs = reactive({
  targetRevenue:  100_000,
  avgBasket:      350,
  conversionRate: 2.5,
  cac:            15,
})

const kpi = computed(() => {
  const requiredClients  = Math.ceil(inputs.targetRevenue / Math.max(1, inputs.avgBasket))
  const requiredTraffic  = Math.ceil(requiredClients / Math.max(0.001, inputs.conversionRate / 100))
  const marketingBudget  = requiredClients * inputs.cac
  const budgetRatio      = inputs.targetRevenue > 0 ? (marketingBudget / inputs.targetRevenue) * 100 : 0
  const roi              = marketingBudget > 0 ? inputs.targetRevenue / marketingBudget : 0

  return { requiredClients, requiredTraffic, marketingBudget, budgetRatio, roi }
})

const generating = ref(false)
const advice     = ref<GrowthAdvice | null>(null)

async function generateAdvice() {
  if (generating.value) return
  generating.value = true
  advice.value     = null

  try {
    const res = await $fetch<GrowthAdvice>('/api/ai/growth-advice', {
      method: 'POST',
      body: {
        targetRevenue:   inputs.targetRevenue,
        avgBasket:       inputs.avgBasket,
        conversionRate:  inputs.conversionRate,
        cac:             inputs.cac,
        requiredClients: kpi.value.requiredClients,
        requiredTraffic: kpi.value.requiredTraffic,
        marketingBudget: kpi.value.marketingBudget,
        clientId:        resolvedClientId.value,
        sector:          'B2B',
      },
    })
    advice.value = res
  } catch (err) {
    console.error('[simulator] growth-advice error:', err)
  } finally {
    generating.value = false
  }
}

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function gaugePercent(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100))
}
</script>
