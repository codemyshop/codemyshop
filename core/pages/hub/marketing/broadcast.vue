<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Broadcast Center</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            Générez des messages adaptés à chaque canal — Email, WhatsApp, SMS
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
          :class="hasApiKey ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="hasApiKey ? 'bg-success-400' : 'bg-amber-400'" />
          {{ hasApiKey ? 'Claude IA actif' : 'Mode démo' }}
        </span>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">

      <!-- Channel selector -->
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="ch in CHANNELS"
          :key="ch.id"
          @click="switchChannel(ch.id)"
          :class="[
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
            channel === ch.id
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 hover:bg-gray-50 dark:bg-slate-950',
          ]"
        >
          <span class="text-2xl">{{ ch.icon }}</span>
          <div>
            <p class="text-sm font-bold" :class="channel === ch.id ? 'text-primary-700' : 'text-gray-700 dark:text-slate-200'">
              {{ ch.label }}
            </p>
            <p class="text-xs mt-0.5" :class="channel === ch.id ? 'text-primary-500' : 'text-gray-400'">
              {{ ch.hint }}
            </p>
          </div>
          <span
            v-if="channel === ch.id"
            class="w-2 h-2 rounded-full bg-primary-500"
          />
        </button>
      </div>

      <!-- Body: Form + Preview -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- ── Panneau gauche : Formulaire ──────────────────────────────── -->
        <div class="space-y-5">

          <!-- Subject / Theme -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">
              {{ channel === 'email' ? 'Contenu du message' : 'Sujet du message' }}
            </h2>
            <div class="space-y-4">

              <!-- Sujet -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {{ channel === 'email' ? 'Sujet / thème' : 'De quoi s\'agit-il ?' }}
                </label>
                <input
                  v-model="form.subject"
                  type="text"
                  :placeholder="CHANNELS.find(c => c.id === channel)?.placeholder"
                  class="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900"
                />
              </div>

              <!-- Tracked link (WhatsApp / SMS) -->
              <div v-if="channel !== 'email'">
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Lien tracké
                  <span class="text-gray-400 font-normal normal-case ml-1">(optionnel)</span>
                </label>
                <input
                  v-model="form.trackedLink"
                  type="url"
                  placeholder="https://votreboutique.fr/promo?utm_source=whatsapp"
                  class="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900"
                />
              </div>

              <!-- Cible avatar (Email uniquement) -->
              <div v-if="channel === 'email'">
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cible avatar</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="type in AC_HUB_AVATARS"
                    :key="type"
                    @click="toggleTarget(type)"
                    :class="[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      form.targets.includes(type)
                        ? AVATAR_META[type].colorClass + ' border-transparent'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300',
                    ]"
                  >
                    {{ AVATAR_META[type].icon }} {{ AVATAR_META[type].label }}
                  </button>
                  <button
                    @click="form.targets = []"
                    :class="[
                      'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      form.targets.length === 0
                        ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 text-gray-600'
                        : 'border-gray-200 dark:border-slate-700 text-gray-400 hover:border-gray-300',
                    ]"
                  >
                    Tous
                  </button>
                </div>
              </div>

              <!-- Ton -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ton</label>
                <div class="flex gap-2">
                  <button
                    v-for="tone in visibleTones"
                    :key="tone.value"
                    @click="form.tone = tone.value"
                    :class="[
                      'flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                      form.tone === tone.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300',
                    ]"
                  >
                    {{ tone.label }}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Bouton IA Magic Glow -->
          <AIActionButton
            :label="`Générer via Claude \u2014 ${CHANNELS.find(c => c.id === channel)?.label}`"
            loading-label="Génération en cours…"
            :is-loading="generating"
            :disabled="!form.subject.trim()"
            size="lg"
            class="w-full"
            @click="generate"
          />

          <!-- Tip canal -->
          <div class="flex items-start gap-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <span class="text-lg shrink-0">{{ CHANNELS.find(c => c.id === channel)?.icon }}</span>
            <div>
              <p class="text-xs font-semibold text-gray-600">{{ CHANNELS.find(c => c.id === channel)?.tipTitle }}</p>
              <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ CHANNELS.find(c => c.id === channel)?.tip }}</p>
            </div>
          </div>
        </div>

        <!-- Right panel: Preview -->
        <div>

          <!-- Vide -->
          <div v-if="!result" class="flex flex-col items-center justify-center h-80 text-gray-300">
            <svg class="w-14 h-14 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m-14.456 0c.045.597.068 1.198.068 1.8 0 1.194-.083 2.369-.24 3.519" />
            </svg>
            <p class="text-sm font-medium text-gray-400">La prévisualisation apparaîtra ici</p>
            <p class="text-xs text-gray-300 mt-1">Saisissez un sujet et générez</p>
          </div>

          <!-- Email Preview -->
          <div v-else-if="result.channel === 'email'" class="space-y-4">

            <!-- Barre d’actions -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aperçu Email</span>
              <div class="flex items-center gap-2">
                <button @click="copyResult" class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  {{ copied ? 'Copié !' : 'Copier' }}
                </button>
                <button @click="result = null" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 dark:bg-slate-800 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Maquette email -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <!-- Barre inbox -->
              <div class="bg-gray-50 dark:bg-slate-950 px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-danger-400" />
                <div class="w-3 h-3 rounded-full bg-warning-400" />
                <div class="w-3 h-3 rounded-full bg-success-400" />
                <span class="ml-2 text-xs text-gray-400 font-mono truncate">Inbox · Aperçu</span>
              </div>
              <!-- Email header -->
              <div class="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <p class="text-xs text-gray-400 mb-0.5">Objet</p>
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ result.subject }}</p>
                <p class="text-xs text-gray-400 mt-2 mb-0.5">Aperçu inbox</p>
                <p class="text-xs text-gray-500 italic">{{ result.preview }}</p>
              </div>
              <!-- Corps email -->
              <div class="px-5 py-5">
                <pre class="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">{{ result.body }}</pre>
                <!-- CTA button -->
                <div class="mt-6 flex justify-center">
                  <div
                    class="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                    :class="channelColor.badge"
                  >
                    {{ result.cta }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview WhatsApp / SMS -->
          <div v-else class="space-y-4">

            <!-- Barre d’actions -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Aperçu {{ result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS' }}
              </span>
              <div class="flex items-center gap-2">
                <!-- Character counter -->
                <span
                  class="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                  :class="result.charCount > 160
                    ? 'bg-danger-100 text-danger-600'
                    : result.charCount > 130
                      ? 'bg-warning-100 text-warning-600'
                      : 'bg-success-100 text-success-600'"
                >
                  {{ result.charCount }}/160
                </span>
                <button @click="copyResult" class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  {{ copied ? 'Copié !' : 'Copier' }}
                </button>
                <button @click="result = null" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 dark:bg-slate-800 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Phone mockup -->
            <div class="flex justify-center">
              <div
                class="w-72 rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-800"
                :class="result.channel === 'whatsapp' ? 'bg-[#ECE5DD]' : 'bg-gray-100 dark:bg-slate-800'"
              >
                <!-- Status bar -->
                <div class="flex items-center justify-between px-4 py-1.5 text-white text-[10px] font-medium"
                  :class="result.channel === 'whatsapp' ? 'bg-[#075E54]' : 'bg-gray-700'"
                >
                  <span>9:41</span>
                  <div class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 8.5a13 13 0 0 1 21 0M5.5 12.5a8 8 0 0 1 13 0M9.5 16.5a4 4 0 0 1 5 0M12 20h.01"/></svg>
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                    <span>100%</span>
                  </div>
                </div>
                <!-- App bar (WhatsApp ou SMS) -->
                <div
                  class="flex items-center gap-2 px-3 py-2 text-white"
                  :class="result.channel === 'whatsapp' ? 'bg-[#075E54]' : 'bg-gray-700'"
                >
                  <div class="w-7 h-7 rounded-full bg-white dark:bg-slate-900/20 flex items-center justify-center">
                    <svg v-if="result.channel === 'whatsapp'" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    <svg v-else class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-white leading-none">{{ result.channel === 'whatsapp' ? 'WhatsApp Business' : 'SMS' }}</p>
                    <p class="text-[9px] text-white/60">En ligne</p>
                  </div>
                </div>

                <!-- Zone de chat -->
                <div class="px-3 py-4 min-h-32 flex items-end">
                  <!-- Bulle message sortant (droite) -->
                  <div class="ml-auto max-w-[85%]">
                    <div
                      class="rounded-2xl rounded-br-sm px-3 py-2.5 shadow-sm"
                      :class="result.channel === 'whatsapp' ? 'bg-[#DCF8C6]' : 'bg-primary-500 text-white'"
                    >
                      <p
                        class="text-sm leading-relaxed"
                        :class="result.channel === 'whatsapp' ? 'text-gray-800 dark:text-slate-100' : 'text-white'"
                      >{{ result.message }}</p>
                      <div class="flex items-center justify-end gap-1 mt-1">
                        <span class="text-[9px]" :class="result.channel === 'whatsapp' ? 'text-gray-400' : 'text-white/60'">
                          {{ now }}
                        </span>
                        <svg v-if="result.channel === 'whatsapp'" class="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4 12.6l5.7 5.7 10-10"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Input bar (decorative) -->
                <div
                  class="flex items-center gap-2 px-3 py-2 border-t"
                  :class="result.channel === 'whatsapp' ? 'bg-[#ECE5DD] border-gray-300' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'"
                >
                  <div class="flex-1 bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 text-xs text-gray-300">
                    Écrire un message…
                  </div>
                  <div class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="result.channel === 'whatsapp' ? 'bg-[#25D366]' : 'bg-primary-500'"
                  >
                    <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions export -->
            <div class="grid grid-cols-2 gap-2">
              <!-- WhatsApp Web -->
              <button
                v-if="result.channel === 'whatsapp'"
                @click="openWhatsApp"
                class="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#25D366] text-[#25D366] bg-[#25D366]/5 hover:bg-[#25D366]/10 text-xs font-bold transition-colors"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Ouvrir dans WhatsApp
              </button>
              <button
                v-else
                @click="shareEmail"
                class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 text-xs font-bold transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Envoyer par email
              </button>
              <button
                @click="copyResult"
                class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 text-xs font-bold transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                {{ copied ? 'Copié !' : 'Copier le texte' }}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */
import { AVATAR_META, AC_HUB_AVATARS } from '~/utils/avatar'
import type { AvatarType } from '~/types/avatar'
import type { BroadcastResult } from '~/server/api/ai/generate-broadcast.post'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

// ── Canaux ────────────────────────────────────────────────────────────────────

type ChannelId = 'email' | 'whatsapp' | 'sms'

const CHANNELS = [
  {
    id:          'email'    as ChannelId,
    label:       'Email',
    icon:        '📧',
    hint:        'Fidéliser & informer',
    placeholder: 'ex: Nouveautés du mois, lancement produit, offre saisonnière…',
    tipTitle:    'Idéal pour fidéliser',
    tip:         'L’email permet de construire une relation sur le long terme avec un contenu riche : titre, corps structuré et bouton d’action.',
  },
  {
    id:          'whatsapp' as ChannelId,
    label:       'WhatsApp',
    icon:        '💬',
    hint:        'Déclencher une action',
    placeholder: 'ex: Promo flash 24h, restock produit, invitation événement…',
    tipTitle:    'Idéal pour l’action immédiate',
    tip:         'WhatsApp a un taux d’ouverture de 98% en 5 min. Gardez le message court, direct, avec un lien tracké. Max 160 caractères recommandé.',
  },
  {
    id:          'sms'      as ChannelId,
    label:       'SMS',
    icon:        '📱',
    hint:        'Urgence & réactivité',
    placeholder: 'ex: Code promo flash, confirmation de commande, rappel RDV…',
    tipTitle:    'Idéal pour l’urgence',
    tip:         'SMS : 160 caractères max, zéro emoji, ton sobre. Taux d’ouverture > 95% en moins de 3 minutes. Inclure "Stop STOP" en France.',
  },
]

// ── Tons par canal ────────────────────────────────────────────────────────────

const TONES_EMAIL = [
  { value: 'professionnel', label: 'Pro' },
  { value: 'décontracté',   label: 'Décontracté' },
  { value: 'expert',        label: 'Expert' },
  { value: 'enthousiaste',  label: 'Enthousiaste' },
]

const TONES_SHORT = [
  { value: 'direct et percutant', label: 'Direct' },
  { value: 'cool et urbain',      label: 'Cool' },
  { value: 'professionnel',       label: 'Pro' },
]

// ── État ──────────────────────────────────────────────────────────────────────

const { resolvedClientId } = useClientDetection()

const channel   = ref<ChannelId>('email')
const generating = ref(false)
const copied     = ref(false)
const hasApiKey  = ref(false)
const result     = ref<BroadcastResult | null>(null)

const form = reactive({
  subject:     '',
  targets:     [] as AvatarType[],
  tone:        'professionnel',
  trackedLink: '',
})

// ── Computed ──────────────────────────────────────────────────────────────────

const visibleTones = computed(() =>
  channel.value === 'email' ? TONES_EMAIL : TONES_SHORT,
)

const channelColor = computed(() => {
  switch (channel.value) {
    case 'whatsapp': return { btn: 'bg-[#25D366] hover:bg-[#20b85a] text-white', badge: 'bg-[#25D366]' }
    case 'sms':      return { btn: 'bg-gray-700 hover:bg-gray-800 text-white',   badge: 'bg-gray-700'  }
    default:         return { btn: 'bg-primary-600 hover:bg-primary-700 text-white', badge: 'bg-primary-600' }
  }
})

const now = computed(() => {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
})

// ── Actions ───────────────────────────────────────────────────────────────────

function switchChannel(ch: ChannelId) {
  channel.value = ch
  result.value  = null
  form.tone = ch === 'email' ? 'professionnel' : 'direct et percutant'
}

function toggleTarget(type: AvatarType) {
  const idx = form.targets.indexOf(type)
  idx >= 0 ? form.targets.splice(idx, 1) : form.targets.push(type)
}

async function generate() {
  if (!form.subject.trim() || generating.value) return
  generating.value = true
  result.value     = null

  try {
    const res = await $fetch<BroadcastResult>('/api/ai/generate-broadcast', {
      method: 'POST',
      body: {
        channel:     channel.value,
        subject:     form.subject,
        tone:        form.tone,
        clientId:    resolvedClientId.value,
        targets:     form.targets,
        trackedLink: form.trackedLink || undefined,
        avatarType:  form.targets.length === 1 ? form.targets[0] : undefined,
      },
    })
    result.value = res
  } catch (err) {
    console.error('[broadcast] generate error:', err)
  } finally {
    generating.value = false
  }
}

function buildText(): string {
  if (!result.value) return ''
  if (result.value.channel === 'email') {
    return `Objet : ${result.value.subject}\nAperçu : ${result.value.preview}\n\n${result.value.body}\n\n${result.value.cta}`
  }
  return result.value.message
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(buildText())
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    //
  }
}

function openWhatsApp() {
  if (result.value?.channel !== 'whatsapp') return
  window.open(`https://wa.me/?text=${encodeURIComponent(result.value.message)}`, '_blank')
}

function shareEmail() {
  if (result.value?.channel !== 'sms') return
  window.location.href = `mailto:?subject=SMS%20à%20envoyer&body=${encodeURIComponent(result.value.message)}`
}

async function checkApiKey() {
  try {
    const s = await $fetch<{ ai: { enabled: boolean } }>('/api/hub/system-status')
    hasApiKey.value = s.ai?.enabled ?? false
  } catch {
    //
  }
}

onMounted(checkApiKey)
</script>
