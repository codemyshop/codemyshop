
<template>
  
  <section class="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-rose-50 via-purple-50/40 to-indigo-50 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-slate-900">

    
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div class="absolute -top-32 left-[10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-25 bg-rose-500 dark:opacity-15" />
      <div class="absolute bottom-[-20%] right-[5%] w-[450px] h-[450px] rounded-full blur-[120px] opacity-20 bg-violet-600 dark:opacity-12" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[100px] opacity-15 bg-indigo-500 dark:opacity-10" />
      <div class="absolute inset-0 personas-grid opacity-[0.025] dark:opacity-[0.035]" />
    </div>

    <div class="relative max-w-6xl mx-auto px-4 sm:px-6">

      
      <div class="text-center mb-16">
        <span class="inline-flex items-center gap-2 bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-rose-200/50 dark:border-rose-500/20">
          Nos clients types
        </span>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          {{ t(config.title as any) ?? 'Vous vous reconnaissez ?' }}
        </h2>
        <p v-if="config.subtitle" class="max-w-2xl mx-auto text-gray-600 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
          {{ t(config.subtitle as any) }}
        </p>
      </div>

      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div
          v-for="(persona, i) in config.items"
          :key="persona.name"
          class="group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2"
        >
          
          <div class="relative h-full bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl dark:backdrop-blur-sm border border-white/30 dark:border-white/[0.06] rounded-3xl p-7 lg:p-8 flex flex-col gap-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:hover:bg-white/[0.05]">

            
            <div class="absolute top-0 left-8 right-8 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" :style="{ background: `linear-gradient(90deg, transparent, ${persona.color}, transparent)` }" />

            
            <div class="flex items-center gap-5">
              <div class="relative">
                
                <div class="absolute inset-[-4px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" :style="{ background: persona.color + '30' }" />
                <img
                  v-if="persona.avatar"
                  :src="persona.avatar"
                  :alt="`${persona.name}, ${persona.role} — client PrestaShop Headless CodeMyShop`"
                  class="relative w-16 h-16 rounded-full object-cover shrink-0 ring-3 ring-white dark:ring-slate-800 shadow-lg transition-transform duration-500 group-hover:scale-105"
                  width="64" height="64"
                  data-no-filter
                />
                <div v-else class="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl shrink-0 ring-3 ring-white dark:ring-slate-800" :style="{ background: persona.color + '15' }">
                  {{ persona.emoji }}
                </div>
                
                <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800" :style="{ background: persona.color }" />
              </div>
              <div>
                <p class="text-lg font-extrabold text-gray-900 dark:text-white">{{ persona.name }}</p>
                <p class="text-sm font-semibold" :style="{ color: persona.color }">{{ persona.role }}</p>
              </div>
            </div>

            
            <div class="relative pl-4 border-l-2 rounded-sm" :style="{ borderColor: persona.color + '40' }">
              <svg class="absolute -top-1 -left-2 w-5 h-5 opacity-10" :style="{ color: persona.color }" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed italic">
                {{ persona.situation }}
              </p>
            </div>

            
            <div class="flex-1">
              <p class="text-[10px] font-bold uppercase tracking-widest mb-3" :style="{ color: persona.color }">Ce qu'on lui apporte</p>
              <ul class="space-y-2">
                <li
                  v-for="benefit in persona.benefits"
                  :key="benefit"
                  class="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300"
                >
                  <svg class="w-4 h-4 shrink-0 mt-0.5" :style="{ color: persona.color }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {{ benefit }}
                </li>
              </ul>
            </div>

            
            <div class="flex flex-wrap gap-2 pt-3 border-t border-gray-100/50 dark:border-white/[0.06]">
              <span
                v-for="tag in persona.tags"
                :key="tag"
                class="text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"
                :style="{ background: persona.color + '10', color: persona.color, border: `1px solid ${persona.color}15` }"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
export interface PersonaItem {
  emoji:     string
  avatar?:   string
  name:      string
  role:      string
  situation: string
  benefits:  string[]
  tags:      string[]
  color:     string
}

export interface PersonasConfig {
  title?:    string
  subtitle?: string
  items:     PersonaItem[]
}

defineProps<{ config: PersonasConfig }>()
const { t } = useI18nField()
</script>

<style scoped>
.personas-grid {
  background-image:
    radial-gradient(circle, rgba(244, 63, 94, 0.4) 1px, transparent 1px);
  background-size: 32px 32px;
}
</style>
