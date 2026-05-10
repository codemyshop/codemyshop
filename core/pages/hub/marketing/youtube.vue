<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">YouTube Studio &middot; Storyboard IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">Scripts data-driven illustr&eacute;s en 3D Pixar</p>
        </div>
        <NuxtLink to="/hub/marketing/studio" class="text-xs text-gray-400 hover:text-primary-600 transition-colors">&larr; Shorts</NuxtLink>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- Formulaire -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

          <!-- Client source -->
          <div>
            <label class="label">Client source *</label>
            <select v-model="form.clientId" class="input-field text-sm">
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <!-- Sujet -->
          <div class="md:col-span-2">
            <label class="label">Sujet vid&eacute;o *</label>
            <input v-model="form.topic" placeholder="Ex: Lenteur du site, Gestion prix B2B, SEO..." class="input-field" />
          </div>

          <!-- Audience -->
          <div>
            <label class="label">Audience</label>
            <select v-model="form.audience" class="input-field text-sm">
              <option value="Dirigeants e-commerce">Dirigeants e-commerce</option>
              <option value="DSI / CTO">DSI / CTO</option>
              <option value="Grossistes B2B">Grossistes B2B</option>
              <option value="Agences web">Agences web</option>
            </select>
          </div>
        </div>

        <!-- Bouton IA Magic Glow -->
        <div class="mt-4 flex items-center gap-4">
          <AIActionButton
            label="Générer le Script Data-Driven"
            loading-label="Analyse + génération…"
            :is-loading="generating"
            :disabled="!form.topic.trim()"
            @click="generate"
          >
            <template #icon>
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
            </template>
          </AIActionButton>

          <!-- Panneau contexte inject&eacute; -->
          <div v-if="context" class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 dark:border-slate-800 text-xs text-gray-500">
            <svg class="w-4 h-4 text-success-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
            <span>
              <strong class="text-gray-700 dark:text-slate-200">{{ context.totalProducts }}</strong> produits &middot;
              <strong class="text-gray-700 dark:text-slate-200">{{ context.totalCategories }}</strong> cat&eacute;gories &middot;
              Panier <strong class="text-gray-700 dark:text-slate-200">{{ context.avgPriceFormatted }}</strong> &middot;
              {{ context.businessType }}
            </span>
          </div>
        </div>
      </div>

      <!-- Placeholder -->
      <div v-if="!storyboard" class="flex flex-col items-center justify-center py-20 text-gray-300">
        <svg class="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
        <p class="text-sm font-medium text-gray-400">Le storyboard data-driven appara&icirc;tra ici</p>
        <p class="text-xs text-gray-300 mt-1">S&eacute;lectionnez un client et un sujet</p>
      </div>

      <!-- Storyboard -->
      <template v-else>

        <!-- Titre + dur&eacute;e -->
        <div class="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-lg">
          <p class="text-xs font-semibold text-red-200 uppercase tracking-widest mb-2">&#x1f3ac; {{ storyboard.duration }} &middot; Data-Driven</p>
          <h2 class="text-xl font-extrabold leading-snug">{{ storyboard.title }}</h2>
        </div>

        <!-- Sc&egrave;nes -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="scene in storyboard.scenes"
            :key="scene.sceneNumber"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <!-- Header -->
            <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{{ scene.sceneNumber }}</span>
                <span class="text-xs font-bold text-gray-700 dark:text-slate-200">{{ scene.hook }}</span>
              </div>
            </div>

            <!-- Voix off -->
            <div class="px-4 py-3 border-b border-gray-50">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">&#x1f399;&#xfe0f; Voix off</p>
              <p class="text-xs text-gray-700 dark:text-slate-200 leading-relaxed">{{ scene.voiceOver }}</p>
            </div>

            <!-- Prompt Pixar -->
            <div class="px-4 py-3 bg-violet-50/30 border-b border-gray-50">
              <div class="flex items-center justify-between mb-1">
                <p class="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">&#x1f3a8; Prompt 3D Pixar</p>
                <button @click="copyText(scene.visual_Prompt_Pixar3D, scene.sceneNumber)" class="text-[10px] text-violet-500 hover:text-violet-700 font-semibold px-1.5 py-0.5 rounded hover:bg-violet-100 transition-colors flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                  {{ copiedScene === scene.sceneNumber ? 'Copi\u00e9 !' : 'Copier' }}
                </button>
              </div>
              <p class="text-xs text-violet-700 leading-relaxed font-mono bg-white dark:bg-slate-900/60 rounded-lg px-2.5 py-2 border border-violet-100">{{ scene.visual_Prompt_Pixar3D }}</p>
            </div>

            <!-- B-Roll text -->
            <div class="px-4 py-3">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">&#x1f4fa; B-Roll</p>
              <span class="inline-block text-xs font-bold text-gray-800 dark:text-slate-100 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">{{ scene.bRoll_Text }}</span>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">CTA de fin</p>
            <p class="text-sm text-gray-700 dark:text-slate-200 font-medium">{{ storyboard.cta }}</p>
          </div>
        </div>

        <!-- Export -->
        <div class="flex gap-3">
          <button @click="exportFull" class="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {{ exportedFull ? 'Copi\u00e9 !' : 'Exporter JSON' }}
          </button>
          <button @click="exportPrompts" class="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
            {{ exportedPrompts ? 'Copi\u00e9 !' : 'Tous les prompts Pixar' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */
import type { DataDrivenStoryboard } from '~/server/api/ai/youtube-script-data.post'
import type { ClientContext } from '~/server/utils/ps-context-builder'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()

// ── Clients disponibles ───────────────────────────────────────────────────────

interface ClientOption { id: string; name: string }

const clients = ref<ClientOption[]>([
  { id: 'ac-hub',       name: 'AC Hub' },
  { id: 'example-shop',   name: 'Example Shop' },
  { id: 'example-vape', name: 'Example Vape' },
  { id: 'codemyshop',   name: 'CodeMyShop (Demo)' },
])

// ── Formulaire ────────────────────────────────────────────────────────────────

const form = reactive({
  clientId: resolvedClientId.value || useRuntimeConfig().public.clientId as string,
  topic:    '',
  audience: 'Dirigeants e-commerce',
})

// ── State ─────────────────────────────────────────────────────────────────────

const generating      = ref(false)
const storyboard      = ref<DataDrivenStoryboard | null>(null)
const context         = ref<ClientContext | null>(null)
const copiedScene     = ref<number | null>(null)
const exportedFull    = ref(false)
const exportedPrompts = ref(false)

// ── G\u00e9n\u00e9ration ────────────────────────────────────────────────────────────────

async function generate() {
  if (!form.topic.trim() || generating.value) return
  generating.value = true
  storyboard.value = null
  context.value    = null

  try {
    const res = await $fetch<DataDrivenStoryboard>('/api/ai/youtube-script-data', {
      method: 'POST',
      body: {
        clientId:       form.clientId,
        videoTopic:     form.topic,
        targetAudience: form.audience,
      },
    })
    storyboard.value = res
    context.value    = res.context
  } catch (err) {
    console.error('[youtube] error:', err)
  } finally {
    generating.value = false
  }
}

// ── Copie ─────────────────────────────────────────────────────────────────────

async function copyText(text: string, sceneNum: number) {
  try {
    await navigator.clipboard.writeText(text)
    copiedScene.value = sceneNum
    setTimeout(() => { copiedScene.value = null }, 2500)
  } catch { /* */ }
}

async function exportFull() {
  if (!storyboard.value) return
  await navigator.clipboard.writeText(JSON.stringify(storyboard.value, null, 2))
  exportedFull.value = true
  setTimeout(() => { exportedFull.value = false }, 2500)
}

async function exportPrompts() {
  if (!storyboard.value) return
  const prompts = storyboard.value.scenes.map(s => `Scene ${s.sceneNumber}:\n${s.visual_Prompt_Pixar3D}`).join('\n\n---\n\n')
  await navigator.clipboard.writeText(prompts)
  exportedPrompts.value = true
  setTimeout(() => { exportedPrompts.value = false }, 2500)
}
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900; }
.label { @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5; }
</style>
