<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Academy · Onboarding &amp; Best Practices</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            Playbook <span class="font-semibold text-gray-600">{{ playbook.tagline.split(' — ')[0] }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-90"
            enter-to-class="opacity-100 scale-100"
          >
            <span
              v-if="isCertified"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold border border-primary-200"
            >
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
              </svg>
              Certifié
            </span>
          </Transition>
          
          <span class="text-xs text-gray-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full font-medium">
            {{ playbook.clientId }}
          </span>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-4xl mx-auto space-y-6">

      
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center gap-1.5 flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTab === tab.id
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950',
          ]"
        >
          <span>{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      
      
      
      <template v-if="activeTab === 'values'">

        
        <div class="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
          <p class="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Notre raison d’être</p>
          <p class="text-xl font-bold leading-snug">{{ playbook.tagline }}</p>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vision</p>
          <p class="text-sm text-gray-600 leading-relaxed">{{ playbook.vision }}</p>
        </div>

        
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nos valeurs fondamentales</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="v in playbook.values"
              :key="v.title"
              class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5"
            >
              <span class="text-3xl">{{ v.icon }}</span>
              <p class="text-sm font-bold text-gray-800 dark:text-slate-100 mt-3">{{ v.title }}</p>
              <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">{{ v.description }}</p>
            </div>
          </div>
        </div>

      </template>

      
      
      
      <template v-else-if="activeTab === 'tone'">

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Notre ton en {{ playbook.tone.adjectives.length }} mots</p>
          <div class="flex flex-wrap gap-2 mb-5">
            <span
              v-for="adj in playbook.tone.adjectives"
              :key="adj.word"
              class="px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold border border-primary-100"
            >
              {{ adj.word }}
            </span>
          </div>
          <div class="space-y-2.5 border-t border-gray-100 dark:border-slate-800 pt-4">
            <div
              v-for="adj in playbook.tone.adjectives"
              :key="adj.word + '-desc'"
              class="flex items-start gap-3"
            >
              <span class="text-xs font-bold text-primary-600 w-24 shrink-0 pt-0.5">{{ adj.word }}</span>
              <p class="text-xs text-gray-500 leading-relaxed">{{ adj.description }}</p>
            </div>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Do / Don’t — Exemples concrets</p>
          <div class="space-y-3">
            <div
              v-for="(pair, i) in playbook.tone.pairs"
              :key="i"
              class="grid grid-cols-2 gap-3"
            >
              <div class="flex items-start gap-2.5 bg-success-50 rounded-xl p-3.5 border border-success-100">
                <span class="text-success-600 font-bold text-base leading-none shrink-0 mt-0.5">✓</span>
                <p class="text-xs text-success-800 leading-relaxed">{{ pair.do }}</p>
              </div>
              <div class="flex items-start gap-2.5 bg-danger-50 rounded-xl p-3.5 border border-danger-100">
                <span class="text-danger-500 font-bold text-base leading-none shrink-0 mt-0.5">✗</span>
                <p class="text-xs text-danger-800 leading-relaxed">{{ pair.dont }}</p>
              </div>
            </div>
          </div>
        </div>

      </template>

      
      
      
      <template v-else-if="activeTab === 'closer'">

        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mb-2">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Guide du Closer</p>
          <p class="text-sm text-gray-500">Les meilleures pratiques pour utiliser le CRM et convertir plus efficacement.</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(tip, i) in playbook.closerTips"
            :key="i"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex gap-4"
          >
            <div class="w-9 h-9 rounded-full bg-primary-100 text-primary-600 font-bold text-sm flex items-center justify-center shrink-0">
              {{ i + 1 }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ tip.title }}</p>
              <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">{{ tip.body }}</p>
            </div>
          </div>
        </div>

      </template>

      
      
      
      <template v-else-if="activeTab === 'ai'">

        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mb-2">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Guide de Prompting IA</p>
          <p class="text-sm text-gray-500">Utilisez ces templates pour générer des contenus qui respectent l’identité de la marque.</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="(ex, i) in playbook.aiExamples"
            :key="i"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5"
          >
            
            <div class="flex items-center justify-between mb-3">
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-100">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                {{ ex.context }}
              </span>
              <button
                @click="copyPrompt(ex.prompt, i)"
                class="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                {{ copiedPromptIdx === i ? 'Copié !' : 'Copier' }}
              </button>
            </div>

            
            <pre class="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl p-4 text-xs text-gray-700 dark:text-slate-200 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{{ ex.prompt }}</pre>

            
            <div class="flex items-start gap-2 mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <svg class="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
              </svg>
              <p class="text-xs text-amber-700 leading-relaxed">{{ ex.note }}</p>
            </div>
          </div>
        </div>

      </template>

      
      
      
      <template v-else-if="activeTab === 'broadcast'">

        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div class="flex items-center gap-2.5 mb-3">
              <div class="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                <span class="text-lg">📧</span>
              </div>
              <div>
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100">Newsletter (Email)</p>
                <p class="text-xs text-gray-400">Canal de fidélisation</p>
              </div>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">{{ playbook.broadcastLesson.newsletter }}</p>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div class="flex items-center gap-2.5 mb-3">
              <div class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <span class="text-lg">📡</span>
              </div>
              <div>
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100">Broadcast (WhatsApp / SMS)</p>
                <p class="text-xs text-gray-400">Canal d’action</p>
              </div>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">{{ playbook.broadcastLesson.broadcast }}</p>
          </div>

        </div>

        
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-5 text-white shadow-lg">
          <div class="flex items-start gap-3">
            <span class="text-2xl shrink-0">💡</span>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Règle d’or</p>
              <p class="text-sm font-semibold leading-relaxed">{{ playbook.broadcastLesson.rule }}</p>
            </div>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Objectif</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Exemple concret</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="(ch, i) in playbook.broadcastLesson.channels"
                :key="i"
                class="hover:bg-gray-50 dark:bg-slate-950 transition-colors"
              >
                <td class="px-5 py-3.5">
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                    :class="{
                      'bg-primary-50 text-primary-700 border border-primary-100': ch.channel === 'Email',
                      'bg-green-50 text-green-700 border border-green-100':       ch.channel === 'WhatsApp',
                      'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700':         ch.channel === 'SMS',
                    }"
                  >
                    {{ ch.channel === 'Email' ? '📧' : ch.channel === 'WhatsApp' ? '💬' : '📱' }}
                    {{ ch.channel }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-xs text-gray-600 font-medium">{{ ch.goal }}</td>
                <td class="px-5 py-3.5 text-xs text-gray-500 italic leading-relaxed max-w-xs">{{ ch.example }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        
        <NuxtLink
          to="/hub/marketing/broadcast"
          class="flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m-14.456 0c.045.597.068 1.198.068 1.8 0 1.194-.083 2.369-.24 3.519" />
          </svg>
          Ouvrir le Broadcast Center →
        </NuxtLink>

      </template>

      
      
      
      <template v-else-if="activeTab === 'ideal'">

        
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
          <p class="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">{{ playbook.idealClient.title }}</p>
          <p class="text-2xl font-black leading-snug">{{ playbook.idealClient.range }}</p>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pourquoi ce segment ?</p>
          <p class="text-sm text-gray-600 leading-relaxed">{{ playbook.idealClient.why }}</p>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pain Points du client cible</p>
          <div class="space-y-2.5">
            <div
              v-for="(pain, i) in playbook.idealClient.painPoints"
              :key="i"
              class="flex items-start gap-2.5 bg-danger-50 rounded-lg p-3 border border-danger-100"
            >
              <span class="text-danger-500 font-bold text-sm shrink-0 mt-0.5">{{ i + 1 }}</span>
              <p class="text-xs text-danger-800 leading-relaxed">{{ pain }}</p>
            </div>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Critères de disqualification</p>
          <p class="text-xs text-gray-400 mb-3">Ne pas investir de temps commercial sur ces profils :</p>
          <div class="space-y-2">
            <div
              v-for="(dq, i) in playbook.idealClient.disqualify"
              :key="i"
              class="flex items-start gap-2.5"
            >
              <span class="w-5 h-5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✗</span>
              <p class="text-xs text-gray-600 leading-relaxed">{{ dq }}</p>
            </div>
          </div>
        </div>

        
        <div class="bg-primary-50 border border-primary-100 rounded-xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <span class="text-lg">🧮</span>
          </div>
          <div>
            <p class="text-sm font-bold text-primary-700">Calculateur en ligne</p>
            <p class="text-xs text-primary-600">Utilisez le composant SavingsCalculator pour montrer les économies concrètes au prospect lors du call.</p>
          </div>
        </div>

      </template>

      
      
      
      <template v-else-if="activeTab === 'transcreation'">

        
        <div class="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
          <p class="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">{{ playbook.transcreationLesson.title }}</p>
          <p class="text-sm font-semibold leading-relaxed">{{ playbook.transcreationLesson.why }}</p>
        </div>

        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-danger-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-danger-500 text-lg">✗</span>
              <p class="text-sm font-bold text-gray-800 dark:text-slate-100">Traduction classique</p>
            </div>
            <ul class="text-xs text-gray-500 space-y-1.5 leading-relaxed">
              <li>Mot-à-mot, perte de nuances</li>
              <li>Même structure grammaticale</li>
              <li>Ignore la psychologie d'achat</li>
              <li>-30% de conversions en moyenne</li>
            </ul>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-success-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-success-500 text-lg">✓</span>
              <p class="text-sm font-bold text-gray-800 dark:text-slate-100">Transcréation IA</p>
            </div>
            <ul class="text-xs text-gray-500 space-y-1.5 leading-relaxed">
              <li>Adaptation culturelle du message</li>
              <li>Psychologie acheteur locale</li>
              <li>Mots-clés SEO par marché</li>
              <li>+30% de conversions à l'international</li>
            </ul>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Exemples d'adaptation</p>
          <div class="space-y-3">
            <div
              v-for="(ex, i) in playbook.transcreationLesson.examples"
              :key="i"
              class="grid grid-cols-[1fr_auto_1fr] gap-3 items-start"
            >
              <div class="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 border border-gray-100 dark:border-slate-800">
                <p class="text-[10px] font-semibold text-gray-400 mb-1">🇫🇷 FR (original)</p>
                <p class="text-xs text-gray-700 dark:text-slate-200 leading-relaxed">{{ ex.from }}</p>
              </div>
              <div class="flex items-center pt-5">
                <span class="text-gray-300 text-sm">→</span>
              </div>
              <div class="bg-primary-50 rounded-lg p-3 border border-primary-100">
                <p class="text-[10px] font-semibold text-primary-500 mb-1">{{ ex.locale }}</p>
                <p class="text-xs text-primary-800 leading-relaxed font-medium">{{ ex.to }}</p>
              </div>
              <p class="col-span-3 text-xs text-gray-400 italic ml-1 -mt-1">{{ ex.note }}</p>
            </div>
          </div>
        </div>

        
        <NuxtLink
          to="/hub/marketing/localization"
          class="flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
          </svg>
          Ouvrir la Localisation IA →
        </NuxtLink>

      </template>

      
      
      
      <template v-else-if="activeTab === 'quiz'">

        
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div
            v-if="isCertified"
            class="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl p-4"
          >
            <svg class="w-5 h-5 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-primary-700">Certification obtenue !</p>
              <p class="text-xs text-primary-600 mt-0.5">Vous pouvez refaire le quiz pour vous entraîner à tout moment.</p>
            </div>
          </div>
        </Transition>

        
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Valider mes connaissances</p>
          <p class="text-sm text-gray-500">{{ playbook.quiz.length }} questions — Répondez correctement à toutes pour obtenir le badge "Certifié".</p>
        </div>

        
        <div class="space-y-4">
          <div
            v-for="(q, qi) in playbook.quiz"
            :key="q.id"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5"
          >
            <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">
              <span class="text-primary-500 mr-1">{{ qi + 1 }}.</span>
              {{ q.question }}
            </p>
            <div class="space-y-2">
              <button
                v-for="(opt, oi) in q.options"
                :key="oi"
                @click="selectAnswer(qi, oi)"
                :disabled="quizSubmitted"
                :class="getAnswerClass(qi, oi)"
                class="w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all disabled:cursor-default"
              >
                <span class="font-semibold mr-2 text-xs opacity-60">{{ String.fromCharCode(65 + oi) }}.</span>
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        
        <button
          v-if="!quizSubmitted"
          @click="submitQuiz"
          :disabled="Object.keys(answers).length < playbook.quiz.length"
          class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
          </svg>
          Valider mes réponses
          <span class="text-white/60 text-xs font-normal">
            ({{ Object.keys(answers).length }}/{{ playbook.quiz.length }})
          </span>
        </button>

        
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div
            v-if="quizSubmitted"
            class="rounded-xl border p-5 text-center"
            :class="allCorrect
              ? 'bg-success-50 border-success-100'
              : 'bg-orange-50 border-orange-100'"
          >
            <template v-if="allCorrect">
              <div class="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
              </div>
              <p class="text-success-700 font-bold text-base">Certification obtenue !</p>
              <p class="text-success-600 text-xs mt-1">{{ correctCount }}/{{ playbook.quiz.length }} bonnes réponses — Badge "Certifié" débloqué.</p>
            </template>
            <template v-else>
              <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <p class="text-orange-700 font-bold text-base">{{ correctCount }}/{{ playbook.quiz.length }} bonnes réponses</p>
              <p class="text-orange-600 text-xs mt-1">Relisez les sections correspondantes et réessayez !</p>
              <button
                @click="resetQuiz"
                class="mt-3 text-sm text-orange-600 font-semibold hover:underline"
              >
                Recommencer le quiz →
              </button>
            </template>
          </div>
        </Transition>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { playbook, isCertified, checkCertification, storeCertification } = useAcademy()

type TabId = 'values' | 'tone' | 'closer' | 'ai' | 'broadcast' | 'ideal' | 'transcreation' | 'quiz'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'values',         label: 'Valeurs & Vision',      icon: '🎯' },
  { id: 'tone',           label: 'Tone of Voice',         icon: '💬' },
  { id: 'closer',         label: 'Guide Closer',          icon: '🏆' },
  { id: 'ai',             label: 'Guide IA',              icon: '🤖' },
  { id: 'broadcast',      label: 'Newsletter vs Broadcast', icon: '📡' },
  { id: 'ideal',          label: 'Client Idéal',          icon: '💎' },
  { id: 'transcreation',  label: 'Transcréation',         icon: '🌍' },
  { id: 'quiz',           label: 'Quiz',                  icon: '📝' },
]

const activeTab = ref<TabId>('values')

const answers      = ref<Record<number, number>>({})
const quizSubmitted = ref(false)

const correctCount = computed(() =>
  playbook.value.quiz.filter((q, qi) => answers.value[qi] === q.correctIndex).length,
)

const allCorrect = computed(() =>
  correctCount.value === playbook.value.quiz.length,
)

function selectAnswer(qi: number, oi: number) {
  if (quizSubmitted.value) return
  answers.value = { ...answers.value, [qi]: oi }
}

function getAnswerClass(qi: number, oi: number): string {
  const isSelected = answers.value[qi] === oi

  if (!quizSubmitted.value) {
    return isSelected
      ? 'border-primary-300 bg-primary-50 text-primary-700'
      : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-primary-200 hover:bg-primary-50/30'
  }

  const correct = playbook.value.quiz[qi].correctIndex
  if (oi === correct)        return 'border-success-300 bg-success-50 text-success-700'
  if (isSelected && oi !== correct) return 'border-danger-300 bg-danger-50 text-danger-700'
  return 'border-gray-100 dark:border-slate-800 text-gray-400 opacity-60'
}

function submitQuiz() {
  quizSubmitted.value = true
  if (allCorrect.value) storeCertification()
}

function resetQuiz() {
  answers.value      = {}
  quizSubmitted.value = false
}

const copiedPromptIdx = ref<number | null>(null)

async function copyPrompt(prompt: string, idx: number) {
  try {
    await navigator.clipboard.writeText(prompt)
    copiedPromptIdx.value = idx
    setTimeout(() => { copiedPromptIdx.value = null }, 2500)
  } catch {
    
  }
}

watch(() => playbook.value.clientId, () => {
  answers.value      = {}
  quizSubmitted.value = false
})

onMounted(checkCertification)
</script>
