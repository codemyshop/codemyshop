<template>
  <div v-if="agents.length" class="flex flex-wrap gap-1.5 items-center">
    <button
      v-for="a in agents"
      :key="a.codename"
      type="button"
      @click="selectedAgent = selectedAgent?.codename === a.codename ? null : a"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer"
      :class="selectedAgent?.codename === a.codename
        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200'
        : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'"
    >
      <img
        :src="a.avatarUrl || `/portraits/portrait-${a.codename}.webp`"
        :alt="a.nickname"
        class="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-slate-600"
        @error="onImgError"
      />
      <span>{{ a.nickname }}</span>
    </button>

    
    <Teleport to="body">
      <div v-if="selectedAgent" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="selectedAgent = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedAgent = null" />
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-auto border border-gray-200 dark:border-slate-700">
          
          <div class="relative overflow-hidden rounded-t-2xl">
            <div class="absolute inset-0 bg-gradient-to-b from-primary-600/20 to-transparent" />
            <div class="relative p-6 pb-4 flex items-start gap-5">
              <img
                :src="selectedAgent.avatarUrl || `/portraits/portrait-${selectedAgent.codename}.webp`"
                :alt="selectedAgent.nickname"
                class="w-20 h-20 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-lg shrink-0"
                @error="onImgError"
              />
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ selectedAgent.nickname }}</h3>
                <p class="text-sm text-primary-600 dark:text-primary-400 font-medium">{{ selectedAgent.role }}</p>
                <p class="text-[10px] font-mono text-gray-400 mt-0.5">@{{ selectedAgent.codename }}</p>
                <p v-if="selectedAgent.inspiration" class="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">Inspiré par {{ selectedAgent.inspiration }}</p>
              </div>
              <button @click="selectedAgent = null" class="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          
          <div v-if="selectedAgent.quote" class="px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <blockquote class="text-xs italic text-gray-600 dark:text-slate-300 leading-relaxed">"{{ selectedAgent.quote }}"</blockquote>
          </div>

          
          <div class="p-6 space-y-5 text-xs text-gray-600 dark:text-slate-300">
            <div v-if="selectedAgent.description">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Description</h4>
              <p class="leading-relaxed">{{ selectedAgent.description }}</p>
            </div>

            <div v-if="selectedAgent.personality">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Personnalité</h4>
              <p class="leading-relaxed">{{ selectedAgent.personality }}</p>
            </div>

            <div v-if="selectedAgent.mission">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Mission</h4>
              <p class="leading-relaxed">{{ selectedAgent.mission }}</p>
            </div>

            <div v-if="selectedAgent.perimeter">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Périmètre</h4>
              <ul v-if="Array.isArray(selectedAgent.perimeter)" class="list-disc list-inside space-y-0.5">
                <li v-for="(p, i) in selectedAgent.perimeter" :key="i">{{ p }}</li>
              </ul>
              <p v-else class="leading-relaxed">{{ selectedAgent.perimeter }}</p>
            </div>

            <div v-if="selectedAgent.responsibilities">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Responsabilités</h4>
              <ul v-if="Array.isArray(selectedAgent.responsibilities)" class="list-disc list-inside space-y-0.5">
                <li v-for="(r, i) in selectedAgent.responsibilities" :key="i">{{ r }}</li>
              </ul>
              <p v-else class="leading-relaxed">{{ selectedAgent.responsibilities }}</p>
            </div>

            <div v-if="selectedAgent.keyChecks">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Points de contrôle</h4>
              <ul v-if="Array.isArray(selectedAgent.keyChecks)" class="list-disc list-inside space-y-0.5">
                <li v-for="(c, i) in selectedAgent.keyChecks" :key="i">{{ c }}</li>
              </ul>
              <p v-else class="leading-relaxed whitespace-pre-line">{{ selectedAgent.keyChecks }}</p>
            </div>

            <div v-if="selectedAgent.cognitiveFrame">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Cadre cognitif</h4>
              <template v-if="typeof selectedAgent.cognitiveFrame === 'object'">
                <div v-for="(val, key) in selectedAgent.cognitiveFrame" :key="key" class="mb-2">
                  <span class="font-medium text-gray-700 dark:text-slate-200 capitalize">{{ key }} :</span>
                  <span class="ml-1">{{ val }}</span>
                </div>
              </template>
              <p v-else class="leading-relaxed whitespace-pre-line">{{ selectedAgent.cognitiveFrame }}</p>
            </div>

            <div v-if="selectedAgent.heritage" class="pt-3 border-t border-gray-100 dark:border-slate-800">
              <h4 class="font-bold text-gray-800 dark:text-slate-100 mb-1.5 text-sm">Héritage</h4>
              <p class="leading-relaxed text-gray-500 dark:text-slate-400">{{ selectedAgent.heritage }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
interface Agent {
  codename: string
  nickname: string
  role: string
  avatarUrl?: string
  personality?: string
  description?: string
  inspiration?: string
  heritage?: string
  quote?: string
  mission?: string
  perimeter?: string[] | string
  responsibilities?: string[] | string
  keyChecks?: string[] | string
  cognitiveFrame?: Record<string, any> | string
}

defineProps<{ agents: Agent[] }>()
const selectedAgent = ref<Agent | null>(null)

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = '/logo-ac.svg'
  img.classList.add('p-1', 'opacity-50')
}
</script>
