<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Video Factory &middot; Simulateur de Co&ucirc;ts</h1>
          <p class="text-xs text-gray-400 mt-0.5">Estimez le co&ucirc;t de production par vid&eacute;o et la rentabilit&eacute; mensuelle</p>
        </div>
        <NuxtLink to="/hub/marketing/youtube" class="text-xs text-gray-400 hover:text-primary-600 transition-colors">&larr; YouTube Studio</NuxtLink>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-gray-900 dark:text-slate-100">{{ formatEur(totalCostPerVideo) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Co&ucirc;t / vid&eacute;o</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-primary-600">{{ formatEur(monthlyCost) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Co&ucirc;t / mois</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold" :class="marginPercent >= 95 ? 'text-success-600' : marginPercent >= 80 ? 'text-amber-600' : 'text-danger-600'">{{ marginPercent.toFixed(1) }}%</p>
          <p class="text-xs text-gray-400 mt-0.5">Marge brute</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-center">
          <p class="text-2xl font-extrabold text-success-600">{{ formatEur(monthlyProfit) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">Profit net / mois</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        <div class="lg:col-span-1 space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Param&egrave;tres vid&eacute;o</h2>

            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="label">Dur&eacute;e</label>
                  <span class="text-xs font-bold text-primary-600">{{ config.durationSeconds }}s</span>
                </div>
                <input v-model.number="config.durationSeconds" type="range" min="15" max="180" step="5" class="slider" />
                <div class="flex justify-between text-[10px] text-gray-400 mt-1"><span>15s</span><span>60s</span><span>180s</span></div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="label">Nombre de sc&egrave;nes</label>
                  <span class="text-xs font-bold text-primary-600">{{ config.scenes }}</span>
                </div>
                <input v-model.number="config.scenes" type="range" min="2" max="20" step="1" class="slider" />
                <div class="flex justify-between text-[10px] text-gray-400 mt-1"><span>2</span><span>10</span><span>20</span></div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="label">R&eacute;solution</label>
                </div>
                <div class="flex gap-2">
                  <button
                    v-for="res in RESOLUTIONS"
                    :key="res.value"
                    @click="config.resolution = res.value"
                    :class="[
                      'flex-1 py-2 rounded-lg border text-xs font-medium transition-all text-center',
                      config.resolution === res.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300',
                    ]"
                  >{{ res.label }}</button>
                </div>
              </div>
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Mod&egrave;les IA</h2>

            <div class="space-y-3">
              <div>
                <label class="label">TTS (Audio)</label>
                <select v-model="config.ttsModel" class="input-field text-xs">
                  <option value="xttsv2">XTTSv2 (Coqui) &mdash; 0.02&euro;/min</option>
                  <option value="cosyvoice">CosyVoice &mdash; 0.015&euro;/min</option>
                </select>
              </div>

              <div>
                <label class="label">Image (T2I)</label>
                <select v-model="config.imageModel" class="input-field text-xs">
                  <option value="flux-schnell">Flux.1 Schnell &mdash; 0.005&euro;/img</option>
                  <option value="flux-dev">Flux.1 Dev &mdash; 0.015&euro;/img</option>
                  <option value="sdxl">SDXL &mdash; 0.008&euro;/img</option>
                </select>
              </div>

              <div>
                <label class="label">Vid&eacute;o (I2V)</label>
                <select v-model="config.videoModel" class="input-field text-xs">
                  <option value="cogvideox-5b">CogVideoX-5B &mdash; ~0.10&euro;/clip 5s</option>
                  <option value="svd">Stable Video Diffusion &mdash; ~0.06&euro;/clip 5s</option>
                </select>
              </div>

              <div>
                <label class="label">LLM (Storyboard)</label>
                <select v-model="config.llmModel" class="input-field text-xs">
                  <option value="claude-haiku">Claude Haiku &mdash; ~0.005&euro;/script</option>
                  <option value="claude-sonnet">Claude Sonnet &mdash; ~0.01&euro;/script</option>
                  <option value="mistral-small">Mistral Small &mdash; ~0.003&euro;/script</option>
                </select>
              </div>
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Projection mensuelle</h2>

            <div class="space-y-4">
              <div>
                <label class="label">Offre client</label>
                <select v-model="config.offer" class="input-field text-xs">
                  <option value="internal">Usage interne (Alexandre) &mdash; Illimit&eacute;</option>
                  <option value="premium">Premium (800&euro;/mois) &mdash; 10 vid&eacute;os</option>
                  <option value="starter">Starter (39&euro;/mois) &mdash; 2 vid&eacute;os</option>
                </select>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="label">Vid&eacute;os / mois</label>
                  <span class="text-xs font-bold text-primary-600">{{ config.videosPerMonth }}</span>
                </div>
                <input v-model.number="config.videosPerMonth" type="range" min="1" max="60" step="1" class="slider" />
                <div class="flex justify-between text-[10px] text-gray-400 mt-1"><span>1</span><span>30</span><span>60</span></div>
              </div>
            </div>
          </div>
        </div>

        
        <div class="lg:col-span-2 space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">D&eacute;composition du co&ucirc;t par vid&eacute;o</h2>

            <div class="space-y-3">
              <div v-for="node in costBreakdown" :key="node.id" class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="node.bgClass">
                  <span class="text-sm">{{ node.icon }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-gray-700 dark:text-slate-200">{{ node.label }}</span>
                    <span class="text-xs font-bold text-gray-900 dark:text-slate-100">{{ formatEur(node.cost) }}</span>
                  </div>
                  <div class="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div class="h-1.5 rounded-full transition-all duration-300" :class="node.barClass" :style="{ width: node.percent + '%' }" />
                  </div>
                </div>
                <span class="text-[10px] text-gray-400 w-10 text-right shrink-0">{{ node.percent.toFixed(0) }}%</span>
              </div>

              
              <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                <span class="text-sm font-bold text-gray-800 dark:text-slate-100">TOTAL</span>
                <span class="text-lg font-extrabold text-primary-600">{{ formatEur(totalCostPerVideo) }}</span>
              </div>
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Comparatif march&eacute; (vid&eacute;o {{ config.durationSeconds }}s)</h2>

            <div class="space-y-3">
              <div v-for="comp in competitors" :key="comp.name" class="flex items-center gap-3">
                <div class="w-2 h-8 rounded-full shrink-0" :class="comp.color" />
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium" :class="comp.highlight ? 'text-primary-600 font-bold' : 'text-gray-600 dark:text-slate-300'">{{ comp.name }}</span>
                    <span class="text-xs font-bold" :class="comp.highlight ? 'text-primary-600' : 'text-gray-900 dark:text-slate-100'">{{ formatEur(comp.cost) }}</span>
                  </div>
                  <div class="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 mt-1">
                    <div class="h-2 rounded-full transition-all duration-500" :class="comp.barColor" :style="{ width: comp.percent + '%' }" />
                  </div>
                </div>
                <span class="text-[10px] font-bold shrink-0 w-14 text-right" :class="comp.highlight ? 'text-success-600' : 'text-gray-400'">
                  {{ comp.highlight ? 'VOUS' : comp.multiplier }}
                </span>
              </div>
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Projection mensuelle &mdash; {{ offerLabel }}</h2>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500">M&eacute;trique</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500">Valeur</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-slate-800">
                <tr v-for="row in projectionRows" :key="row.label" class="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-600 dark:text-slate-300">{{ row.label }}</td>
                  <td class="px-4 py-3 text-xs font-bold text-right" :class="row.class">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Temps GPU estim&eacute; par vid&eacute;o</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="gpu in gpuTimeBreakdown" :key="gpu.label" class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 text-center">
                <p class="text-sm">{{ gpu.icon }}</p>
                <p class="text-lg font-extrabold text-gray-900 dark:text-slate-100">{{ gpu.seconds }}s</p>
                <p class="text-[10px] text-gray-400">{{ gpu.label }}</p>
                <p class="text-[10px] font-mono text-gray-300">{{ gpu.gpu }}</p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between px-1">
              <span class="text-xs text-gray-400">Temps total (s&eacute;quentiel)</span>
              <span class="text-sm font-bold text-primary-600">{{ totalGpuTime }}s &asymp; {{ (totalGpuTime / 60).toFixed(1) }} min</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface CostNode {
  id: string
  icon: string
  label: string
  cost: number
  percent: number
  bgClass: string
  barClass: string
}

const RESOLUTIONS = [
  { value: '720p' as const, label: '720p', multiplier: 0.7 },
  { value: '1080p' as const, label: '1080p', multiplier: 1.0 },
]

const TTS_RATES: Record<string, number> = {
  xttsv2:    0.02,   
  cosyvoice: 0.015,
}

const IMAGE_RATES: Record<string, number> = {
  'flux-schnell': 0.005,  
  'flux-dev':     0.015,
  sdxl:           0.008,
}

const VIDEO_RATES: Record<string, number> = {
  'cogvideox-5b': 0.10,  
  svd:            0.06,
}

const LLM_RATES: Record<string, number> = {
  'claude-haiku':   0.005,
  'claude-sonnet':  0.01,
  'mistral-small':  0.003,
}

const OFFER_MRR: Record<string, number> = {
  internal: 0,
  premium:  800,
  starter:  39,
}

const OFFER_LABELS: Record<string, string> = {
  internal: 'Usage interne (Alexandre)',
  premium:  'Premium (800 €/mois)',
  starter:  'Starter (39 €/mois)',
}

const STORAGE_COST_PER_GB = 0.023 

const config = reactive({
  durationSeconds: 60,
  scenes:          8,
  resolution:      '1080p' as '720p' | '1080p',
  ttsModel:        'xttsv2',
  imageModel:      'flux-schnell',
  videoModel:      'cogvideox-5b',
  llmModel:        'claude-haiku',
  offer:           'premium',
  videosPerMonth:  10,
})

const resMultiplier = computed(() => config.resolution === '720p' ? 0.7 : 1.0)

const audioCost = computed(() => {
  const minutes = config.durationSeconds / 60
  return minutes * TTS_RATES[config.ttsModel]
})

const imageCost = computed(() => {
  return config.scenes * IMAGE_RATES[config.imageModel] * resMultiplier.value
})

const videoCost = computed(() => {
  const clipDuration = 5
  const clipsPerScene = Math.ceil((config.durationSeconds / config.scenes) / clipDuration)
  const totalClips = config.scenes * clipsPerScene
  return totalClips * VIDEO_RATES[config.videoModel] * resMultiplier.value
})

const assemblyCost = computed(() => 0) 

const storageCost = computed(() => {
  const sizeGb = config.resolution === '1080p' ? 0.2 : 0.1
  return sizeGb * STORAGE_COST_PER_GB
})

const llmCost = computed(() => LLM_RATES[config.llmModel])

const totalCostPerVideo = computed(() =>
  audioCost.value + imageCost.value + videoCost.value + assemblyCost.value + storageCost.value + llmCost.value
)

const monthlyCost = computed(() => totalCostPerVideo.value * config.videosPerMonth)

const mrr = computed(() => OFFER_MRR[config.offer])

const monthlyProfit = computed(() => mrr.value - monthlyCost.value)

const marginPercent = computed(() => {
  if (mrr.value <= 0) return 0
  return ((mrr.value - monthlyCost.value) / mrr.value) * 100
})

const offerLabel = computed(() => OFFER_LABELS[config.offer])

const costBreakdown = computed((): CostNode[] => {
  const total = totalCostPerVideo.value || 1
  const nodes = [
    { id: 'audio',    icon: '🎙️', label: `Audio TTS (${config.ttsModel})`,      cost: audioCost.value,   bgClass: 'bg-violet-100', barClass: 'bg-violet-500' },
    { id: 'image',    icon: '🖼️', label: `Images T2I (${config.imageModel})`,    cost: imageCost.value,   bgClass: 'bg-blue-100',   barClass: 'bg-blue-500' },
    { id: 'video',    icon: '🎬', label: `Vidéo I2V (${config.videoModel})`,     cost: videoCost.value,   bgClass: 'bg-red-100',    barClass: 'bg-red-500' },
    { id: 'assembly', icon: '🎞️', label: 'Assemblage FFmpeg + Whisper',          cost: assemblyCost.value, bgClass: 'bg-gray-100 dark:bg-slate-800', barClass: 'bg-gray-400' },
    { id: 'storage',  icon: '💾', label: 'Stockage S3/MinIO',                    cost: storageCost.value, bgClass: 'bg-amber-100',  barClass: 'bg-amber-500' },
    { id: 'llm',      icon: '🧠', label: `LLM Storyboard (${config.llmModel})`, cost: llmCost.value,     bgClass: 'bg-green-100',  barClass: 'bg-green-500' },
  ]
  return nodes.map(n => ({ ...n, percent: (n.cost / total) * 100 }))
})

const competitors = computed(() => {
  const mine = totalCostPerVideo.value
  const maxCost = 150
  const list = [
    { name: 'Video Factory (vous)',    cost: mine,  color: 'bg-primary-500', barColor: 'bg-primary-500', highlight: true },
    { name: 'RunwayML',                cost: 5,     color: 'bg-gray-300',    barColor: 'bg-gray-400',    highlight: false },
    { name: 'Synthesia / HeyGen',      cost: 10,    color: 'bg-gray-300',    barColor: 'bg-gray-400',    highlight: false },
    { name: 'Monteur freelance',       cost: 100,   color: 'bg-gray-300',    barColor: 'bg-gray-300',    highlight: false },
    { name: 'Agence vidéo',            cost: 150,   color: 'bg-gray-200',    barColor: 'bg-gray-200',    highlight: false },
  ]
  return list.map(c => ({
    ...c,
    percent: Math.max((c.cost / maxCost) * 100, 1),
    multiplier: c.highlight ? '' : `×${(c.cost / mine).toFixed(0)}`,
  }))
})

const projectionRows = computed(() => {
  const rows = [
    { label: 'Vidéos / mois',             value: `${config.videosPerMonth}`,                            class: 'text-gray-900 dark:text-slate-100' },
    { label: 'Coût IA / vidéo',            value: formatEur(totalCostPerVideo.value),                    class: 'text-gray-900 dark:text-slate-100' },
    { label: 'Coût IA total / mois',       value: formatEur(monthlyCost.value),                          class: 'text-amber-600' },
    { label: 'Durée GPU totale / mois',    value: `${(totalGpuTime.value * config.videosPerMonth / 60).toFixed(0)} min`, class: 'text-gray-600 dark:text-slate-300' },
  ]
  if (mrr.value > 0) {
    rows.push(
      { label: `MRR client (${config.offer})`, value: formatEur(mrr.value),                              class: 'text-primary-600' },
      { label: 'Profit net / mois',             value: formatEur(monthlyProfit.value),                    class: monthlyProfit.value >= 0 ? 'text-success-600' : 'text-danger-600' },
      { label: 'Marge brute',                   value: `${marginPercent.value.toFixed(1)}%`,              class: marginPercent.value >= 90 ? 'text-success-600' : 'text-amber-600' },
      { label: 'Coût IA / MRR',                 value: `${((monthlyCost.value / mrr.value) * 100).toFixed(2)}%`, class: 'text-gray-600 dark:text-slate-300' },
    )
  }
  rows.push(
    { label: 'Équivalent freelance / mois', value: formatEur(100 * config.videosPerMonth),               class: 'text-gray-400 line-through' },
    { label: 'Économie réalisée',            value: formatEur(100 * config.videosPerMonth - monthlyCost.value), class: 'text-success-600' },
  )
  return rows
})

const gpuTimeBreakdown = computed(() => {
  const ttsSeconds = Math.ceil(config.durationSeconds * 0.15) 
  const imageSeconds = config.scenes * (config.imageModel === 'flux-schnell' ? 5 : config.imageModel === 'flux-dev' ? 20 : 10)
  const clipDuration = 5
  const clipsPerScene = Math.ceil((config.durationSeconds / config.scenes) / clipDuration)
  const videoSeconds = config.scenes * clipsPerScene * (config.videoModel === 'cogvideox-5b' ? 45 : 25)
  const whisperSeconds = Math.ceil(config.durationSeconds * 0.1)

  return [
    { icon: '🎙️', label: 'TTS',        seconds: ttsSeconds,    gpu: 'A40/L4' },
    { icon: '🖼️', label: 'Images T2I', seconds: imageSeconds,  gpu: 'A40/L40S' },
    { icon: '🎬', label: 'Vidéo I2V',  seconds: videoSeconds,  gpu: 'A100 40GB' },
    { icon: '🎞️', label: 'Whisper',    seconds: whisperSeconds, gpu: 'CPU' },
  ]
})

const totalGpuTime = computed(() =>
  gpuTimeBreakdown.value.reduce((sum, g) => sum + g.seconds, 0)
)

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: n < 1 ? 3 : 2,
    maximumFractionDigits: n < 1 ? 3 : 2,
  }).format(n)
}

watch(() => config.offer, (offer) => {
  if (offer === 'starter')  config.videosPerMonth = 2
  if (offer === 'premium')  config.videosPerMonth = 10
  if (offer === 'internal') config.videosPerMonth = 20
})
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900; }
.label { @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5; }

.slider {
  @apply w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer;
}
.slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-primary-600 rounded-full shadow-md cursor-pointer;
  margin-top: -5px;
}
.slider::-moz-range-thumb {
  @apply w-4 h-4 bg-primary-600 rounded-full shadow-md cursor-pointer border-0;
}
</style>
