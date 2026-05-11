<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    
    <header class="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800">Newsletter IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">Génération et envoi de newsletters personnalisées par l'IA</p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Provider non configuré
        </span>
      </div>
    </header>

    <div class="p-6 max-w-4xl mx-auto space-y-6">

      
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Générer une newsletter</h2>

        <div class="space-y-4">
          
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sujet / thème</label>
            <input
              v-model="form.subject"
              type="text"
              placeholder="ex: Nouveautés du mois, soldes PrestaShop, mise à jour module…"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            />
          </div>

          
          <div>
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
                    : 'border-gray-200 text-gray-500 hover:border-gray-300',
                ]"
              >
                {{ AVATAR_META[type].icon }} {{ AVATAR_META[type].label }}
              </button>
              <button
                @click="form.targets = []"
                :class="[
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  form.targets.length === 0
                    ? 'bg-gray-100 border-gray-300 text-gray-600'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300',
                ]"
              >
                Tous
              </button>
            </div>
          </div>

          
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ton</label>
            <div class="flex gap-2">
              <button
                v-for="tone in tones"
                :key="tone.value"
                @click="form.tone = tone.value"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                  form.tone === tone.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300',
                ]"
              >
                {{ tone.label }}
              </button>
            </div>
          </div>

          
          <button
            @click="generate"
            :disabled="generating || !form.subject.trim()"
            class="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="generating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {{ generating ? 'Génération en cours…' : 'Générer avec l\'IA' }}
          </button>
        </div>
      </div>

      
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="result" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <span class="text-xs font-semibold text-gray-600">Aperçu généré</span>
            <div class="flex items-center gap-2">
              <button
                @click="copyResult"
                class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                {{ copied ? 'Copié !' : 'Copier' }}
              </button>
              <button
                @click="result = null"
                class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="p-5">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{{ result }}</pre>
          </div>
          
          <div class="px-5 pb-4">
            <button
              disabled
              class="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed"
              title="Configurez un provider d'envoi pour activer cette fonctionnalité"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              Envoyer (provider non configuré)
            </button>
          </div>
        </div>
      </Transition>

      
      <div class="bg-white rounded-xl border border-dashed border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-600 mb-1">Configuration provider d'envoi</h2>
        <p class="text-xs text-gray-400 mb-4 leading-relaxed">
          Pour activer l'envoi réel, ajoutez les variables d'environnement suivantes dans votre <code class="bg-gray-100 px-1 rounded font-mono">.env</code> :
        </p>
        <div class="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 space-y-1">
          <p><span class="text-green-600">RESEND_API_KEY</span>=re_xxxx<span class="text-gray-300"> # Resend (recommandé)</span></p>
          <p><span class="text-green-600">NEWSLETTER_FROM</span>=newsletter@codemyshop.com</p>
          <p><span class="text-green-600">NEWSLETTER_REPLY_TO</span>=contact@codemyshop.com</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { AVATAR_META, AC_HUB_AVATARS } from '~/utils/avatar'
import type { AvatarType } from '~/types/avatar'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const form = reactive({
  subject: '',
  targets: [] as AvatarType[],
  tone:    'professionnel' as string,
})

const tones = [
  { value: 'professionnel', label: 'Pro' },
  { value: 'décontracté',   label: 'Décontracté' },
  { value: 'expert',        label: 'Expert' },
  { value: 'enthousiaste',  label: 'Enthousiaste' },
]

function toggleTarget(type: AvatarType) {
  const idx = form.targets.indexOf(type)
  idx >= 0 ? form.targets.splice(idx, 1) : form.targets.push(type)
}

const generating = ref(false)
const result     = ref<string | null>(null)

async function generate() {
  if (!form.subject.trim() || generating.value) return
  generating.value = true
  result.value     = null

  try {
    const targetLabel = form.targets.length > 0
      ? form.targets.map(t => AVATAR_META[t]?.label).join(', ')
      : 'tous les clients'

    const res = await $fetch<{ text: string }>('/api/generate-newsletter', {
      method: 'POST',
      body: {
        subject:     form.subject,
        targets:     form.targets,
        targetLabel,
        tone:        form.tone,
      },
    })
    result.value = res.text
  } catch (e: any) {
    
    result.value = `[STUB] Objet : ${form.subject}\n\nCible : ${form.targets.join(', ') || 'tous'}\nTon : ${form.tone}\n\n---\nContenu généré par l'IA ici...\n\nActivez ANTHROPIC_API_KEY pour une génération réelle.`
  } finally {
    generating.value = false
  }
}

const copied = ref(false)

async function copyResult() {
  if (!result.value) return
  await navigator.clipboard.writeText(result.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
