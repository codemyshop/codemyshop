<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Traductions IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">ps_translation + tables _lang PrestaShop &mdash; prompt IA enrichi par profil culturel</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="profilesOpen = !profilesOpen"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Profils par langue ({{ profiles.length }})
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-7xl mx-auto space-y-6">

      <!-- ── Barre de filtres ─────────────────────────────────────────────── -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <div class="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Langue source</label>
            <select v-model.number="sourceLang" class="mt-1 w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-primary-400 focus:ring-0">
              <option v-for="l in langs" :key="l.id_lang" :value="l.id_lang">{{ l.name }} ({{ l.iso_code }})</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Langue cible</label>
            <select v-model.number="targetLang" class="mt-1 w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-primary-400 focus:ring-0">
              <option v-for="l in langs" :key="l.id_lang" :value="l.id_lang">{{ l.name }} ({{ l.iso_code }})</option>
            </select>
          </div>
          <div class="lg:col-span-2">
            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Scope</label>
            <select v-model="scope" class="mt-1 w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-primary-400 focus:ring-0">
              <optgroup v-for="grp in scopeGroups" :key="grp.label" :label="grp.label">
                <option v-for="s in grp.items" :key="s.slug" :value="s.slug">
                  {{ s.label }}{{ s.rowCount ? ' (' + s.rowCount + ')' : '' }}
                </option>
              </optgroup>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Filtre</label>
            <select v-model="filter" class="mt-1 w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2">
              <option value="missing">Non traduites</option>
              <option value="all">Toutes</option>
            </select>
          </div>
          <div>
            <button
              @click="loadStrings"
              :disabled="loadingStrings || !scope || sourceLang === targetLang"
              class="w-full text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {{ loadingStrings ? 'Chargement…' : 'Charger' }}
            </button>
          </div>
        </div>
        <div class="mt-3">
          <input
            v-model="search"
            @keyup.enter="loadStrings"
            type="search"
            placeholder="Rechercher dans les chaînes source (clé ou texte)…"
            class="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:border-primary-400 focus:ring-0"
          />
        </div>
      </div>

      <!-- ── Split Workspace ──────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Left: String list -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">
              1. Chaînes à traduire
              <span v-if="strings.length" class="ml-2 text-xs text-gray-400">({{ selected.size }} / {{ strings.length }} sélectionnées)</span>
            </h2>
            <div v-if="strings.length" class="flex items-center gap-2">
              <button @click="selectAll" class="text-xs text-primary-600 hover:underline">Tout</button>
              <span class="text-gray-200 dark:text-slate-700">|</span>
              <button @click="selectNone" class="text-xs text-gray-500 hover:underline">Rien</button>
            </div>
          </div>

          <div v-if="!strings.length && !loadingStrings" class="text-sm text-gray-400 italic py-10 text-center">
            Choisissez un scope et cliquez sur "Charger".
          </div>

          <div v-else-if="loadingStrings" class="space-y-2">
            <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>

          <div v-else class="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            <label
              v-for="row in strings"
              :key="row.rowKey"
              class="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-700 cursor-pointer transition-colors"
              :class="selected.has(row.rowKey) ? 'bg-primary-50 dark:bg-primary-950 border-primary-300' : ''"
            >
              <input
                type="checkbox"
                :checked="selected.has(row.rowKey)"
                @change="toggleRow(row.rowKey)"
                class="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
              />
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-mono text-gray-400 uppercase tracking-wider truncate">{{ row.label }}</p>
                <p class="text-sm text-gray-800 dark:text-slate-100 mt-0.5 line-clamp-2">{{ row.source }}</p>
                <p v-if="row.hasTarget" class="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                  <span class="text-success-500 font-semibold">✓</span> {{ row.target }}
                </p>
                <p v-else class="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                  Non traduite
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Right: Prompt + reinjection -->
        <div class="space-y-6">

          <!-- Generated prompt -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">2. Prompt IA</h2>
              <div class="flex items-center gap-2">
                <button
                  @click="generatePrompt"
                  :disabled="!selected.size || generating"
                  class="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {{ generating ? 'Génération…' : 'Générer le prompt' }}
                </button>
                <button
                  v-if="prompt"
                  @click="copyPrompt"
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {{ promptCopied ? 'Copié !' : 'Copier' }}
                </button>
              </div>
            </div>

            <div v-if="!prompt" class="text-sm text-gray-400 italic py-10 text-center">
              Sélectionnez des chaînes et générez un prompt. Collez-le dans ChatGPT / Claude / Mistral.
            </div>
            <div v-else>
              <p v-if="!promptMeta?.hasTargetProfile" class="mb-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠ Pas de profil culturel pour la langue cible.
                <button @click="profilesOpen = true" class="underline font-semibold">Configurer maintenant</button>
              </p>
              <textarea
                :value="prompt"
                readonly
                class="w-full text-xs font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-3 py-2 h-64 resize-none"
              />
            </div>
          </div>

          <!-- JSON reinjection -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">3. Réponse JSON de l'IA</h2>
              <button
                @click="applyTranslations"
                :disabled="!responseJson.trim() || applying"
                class="text-xs font-bold px-3 py-1.5 rounded-lg bg-success-600 text-white hover:bg-success-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {{ applying ? 'Application…' : 'Appliquer les traductions' }}
              </button>
            </div>

            <textarea
              v-model="responseJson"
              placeholder='Collez ici la réponse JSON de l&apos;IA (format : { "translations": [ { "id": "…", "target": "…" } ] })'
              class="w-full text-xs font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 h-48 resize-none focus:border-primary-400 focus:ring-0"
            />

            <div v-if="applyResult" class="mt-3 text-xs p-3 rounded-lg"
                 :class="applyResult.errors?.length ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300'">
              <p class="font-semibold">
                {{ applyResult.updated }} mise(s) à jour, {{ applyResult.inserted }} insérée(s), {{ applyResult.skipped }} ignorée(s).
              </p>
              <p v-if="applyResult.errors?.length" class="mt-1">
                {{ applyResult.errors.length }} erreur(s) — voir la console.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ── Drawer profils par langue ──────────────────────────────────────── -->
    <Transition name="slide">
      <aside
        v-if="profilesOpen"
        class="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-30 overflow-y-auto border-l border-gray-100 dark:border-slate-800"
      >
        <header class="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-10">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Profils culturels par langue</h2>
          <button @click="profilesOpen = false" class="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="p-5 space-y-5">
          <p v-if="!profiles.length" class="text-sm text-gray-400 italic">
            Aucun profil. Le module ac_translate est-il installé sur le tenant ?
          </p>

          <details v-for="p in profiles" :key="p.id_lang" class="border border-gray-200 dark:border-slate-700 rounded-lg" :open="p.iso_code === activeProfileIso">
            <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-800 dark:text-slate-100 flex items-center justify-between">
              <span>{{ p.lang_name }} <span class="text-xs text-gray-400 ml-1">({{ p.iso_code }})</span></span>
              <span v-if="profileDirty[p.id_lang]" class="text-[10px] font-bold text-amber-600">Non enregistré</span>
            </summary>
            <div class="p-4 space-y-3 border-t border-gray-100 dark:border-slate-800">
              <div>
                <label class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Profil du marché</label>
                <textarea v-model="p.profile" @input="profileDirty[p.id_lang] = true" class="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 h-20 resize-y focus:border-primary-400 focus:ring-0" />
              </div>
              <div>
                <label class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ton de voix</label>
                <textarea v-model="p.tone" @input="profileDirty[p.id_lang] = true" class="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 h-20 resize-y focus:border-primary-400 focus:ring-0" />
              </div>
              <div>
                <label class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Spécificités culturelles</label>
                <textarea v-model="p.culture_notes" @input="profileDirty[p.id_lang] = true" class="mt-1 w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 h-20 resize-y focus:border-primary-400 focus:ring-0" />
              </div>
              <div>
                <label class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Glossaire (JSON optionnel)</label>
                <textarea v-model="p.glossary" @input="profileDirty[p.id_lang] = true" class="mt-1 w-full text-xs font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 h-16 resize-y focus:border-primary-400 focus:ring-0" placeholder='{"palette":"pallet","tournée":"route"}' />
              </div>
              <div class="flex justify-end">
                <button
                  @click="saveProfile(p)"
                  :disabled="!profileDirty[p.id_lang] || savingProfile === p.id_lang"
                  class="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {{ savingProfile === p.id_lang ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </div>
          </details>
        </div>
      </aside>
    </Transition>

    <div v-if="profilesOpen" @click="profilesOpen = false" class="fixed inset-0 bg-black/30 z-20" />
  </div>
</template>

<script setup lang="ts">
/**
 *
 * Workspace Hub — Traductions IA multilingues.
 * Flow: choose scope + languages → load strings → select →
 * generate prompt (enriched by cultural profile) → paste JSON → apply.
 */

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Lang { id_lang: number; iso_code: string; name: string; language_code: string; locale: string }
interface Scope { slug: string; label: string; category: string; rowCount?: number; multiline?: boolean; html?: boolean }
interface StringRow { rowKey: string; label: string; source: string; target: string | null; hasTarget: boolean }
interface Profile {
  id_lang: number; iso_code: string; lang_name: string
  profile: string; tone: string; culture_notes: string; glossary: string | null; active: number
}

const langs = ref<Lang[]>([])
const staticScopes = ref<Scope[]>([])
const dynamicScopes = ref<Scope[]>([])
const groupScopes = ref<Scope[]>([])

const sourceLang = ref<number>(1)
const targetLang = ref<number>(2)
const scope = ref<string>('')
const filter = ref<'missing' | 'all'>('missing')
const search = ref<string>('')

const strings = ref<StringRow[]>([])
const selected = reactive<Set<string>>(new Set())
const loadingStrings = ref(false)

const prompt = ref<string>('')
const promptMeta = ref<any>(null)
const generating = ref(false)
const promptCopied = ref(false)

const responseJson = ref<string>('')
const applying = ref(false)
const applyResult = ref<any>(null)

const profiles = ref<Profile[]>([])
const profilesOpen = ref(false)
const profileDirty = reactive<Record<number, boolean>>({})
const savingProfile = ref<number | null>(null)

const CATEGORY_LABELS: Record<string, string> = {
  'i18n-hub': 'Hub (ps_translation)',
  catalog:    'Catalogue produit',
  seo:        'SEO & meta',
  cms:        'CMS',
  features:   'Attributs & caractéristiques',
  config:     'Configuration',
}

const scopeGroups = computed(() => {
  const out: Array<{ label: string; items: Scope[] }> = []
  // Groupes en premier (accès rapide "Header — Tout", "Footer — Tout", …)
  if (groupScopes.value.length) {
    out.push({ label: '⭐ Groupes (tout-en-un)', items: groupScopes.value })
  }
  const map: Record<string, Scope[]> = {}
  for (const s of [...dynamicScopes.value, ...staticScopes.value]) {
    const key = s.category || 'autres'
    if (!map[key]) map[key] = []
    map[key].push(s)
  }
  for (const [k, items] of Object.entries(map)) {
    out.push({ label: CATEGORY_LABELS[k] || k, items })
  }
  return out
})

const activeProfileIso = computed(() => langs.value.find(l => l.id_lang === targetLang.value)?.iso_code)

async function loadInit() {
  try {
    const [ls, sc, pr] = await Promise.all([
      $fetch<Lang[]>('/api/hub/translations/langs'),
      $fetch<{ staticScopes: Scope[]; dynamicScopes: Scope[]; groupScopes: Scope[] }>('/api/hub/translations/scopes'),
      $fetch<Profile[]>('/api/hub/translations/profiles'),
    ])
    langs.value = ls
    staticScopes.value = sc.staticScopes
    dynamicScopes.value = sc.dynamicScopes
    groupScopes.value = sc.groupScopes || []
    profiles.value = pr
    // Defaults
    if (ls.length && !ls.find(l => l.id_lang === sourceLang.value)) sourceLang.value = ls[0].id_lang
    if (ls.length > 1) {
      const nonSrc = ls.find(l => l.id_lang !== sourceLang.value)
      if (nonSrc) targetLang.value = nonSrc.id_lang
    }
    if (!scope.value && (sc.groupScopes?.[0] || sc.dynamicScopes[0] || sc.staticScopes[0])) {
      scope.value = (sc.groupScopes?.[0] || sc.dynamicScopes[0] || sc.staticScopes[0]).slug
    }
  } catch (err) {
    console.error('[translations] init error:', err)
  }
}

async function loadStrings() {
  if (!scope.value || sourceLang.value === targetLang.value) return
  loadingStrings.value = true
  selected.clear()
  strings.value = []
  try {
    const res = await $fetch<{ rows: StringRow[] }>('/api/hub/translations/strings', {
      query: {
        scope: scope.value,
        source_lang: sourceLang.value,
        target_lang: targetLang.value,
        filter: filter.value,
        search: search.value,
        limit: 500,
      },
    })
    strings.value = res.rows
  } catch (err: any) {
    console.error('[translations] load error:', err)
    alert('Erreur de chargement : ' + (err?.data?.statusMessage || err?.message || 'inconnue'))
  } finally {
    loadingStrings.value = false
  }
}

function toggleRow(key: string) {
  if (selected.has(key)) selected.delete(key); else selected.add(key)
}
function selectAll() { for (const r of strings.value) selected.add(r.rowKey) }
function selectNone() { selected.clear() }

async function generatePrompt() {
  if (!selected.size) return
  generating.value = true
  prompt.value = ''
  promptMeta.value = null
  try {
    const res = await $fetch<{ prompt: string; meta: any }>('/api/hub/translations/generate-prompt', {
      method: 'POST',
      body: {
        scope: scope.value,
        source_lang: sourceLang.value,
        target_lang: targetLang.value,
        rowKeys: Array.from(selected),
      },
    })
    prompt.value = res.prompt
    promptMeta.value = res.meta
  } catch (err: any) {
    console.error('[translations] generate error:', err)
    alert('Erreur : ' + (err?.data?.statusMessage || err?.message))
  } finally {
    generating.value = false
  }
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    promptCopied.value = true
    setTimeout(() => { promptCopied.value = false }, 2000)
  } catch { /* */ }
}

function parseResponse(raw: string): Array<{ id: string; target: string }> {
  const t = raw.trim()
  if (!t) return []
  // Accept raw array, or { translations: [...] }, or ```json fenced
  const cleaned = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
  let parsed: any
  try { parsed = JSON.parse(cleaned) } catch {
    throw new Error('JSON invalide. Vérifie que la réponse de l\'IA est bien parsable.')
  }
  let arr: any[] = []
  if (Array.isArray(parsed)) arr = parsed
  else if (parsed && Array.isArray(parsed.translations)) arr = parsed.translations
  else throw new Error('Format inattendu : attendu { translations: [...] } ou un tableau.')
  return arr.filter(x => x && typeof x.id === 'string' && typeof x.target === 'string')
}

async function applyTranslations() {
  let translations: Array<{ id: string; target: string }>
  try {
    translations = parseResponse(responseJson.value)
  } catch (e: any) {
    alert(e.message)
    return
  }
  if (!translations.length) {
    alert('Aucune traduction valide dans la réponse.')
    return
  }
  applying.value = true
  applyResult.value = null
  try {
    const res = await $fetch('/api/hub/translations/apply', {
      method: 'POST',
      body: {
        scope: scope.value,
        source_lang: sourceLang.value,
        target_lang: targetLang.value,
        translations,
      },
    })
    applyResult.value = res
    await loadStrings()
  } catch (err: any) {
    console.error('[translations] apply error:', err)
    alert('Erreur : ' + (err?.data?.statusMessage || err?.message))
  } finally {
    applying.value = false
  }
}

async function saveProfile(p: Profile) {
  savingProfile.value = p.id_lang
  try {
    await $fetch('/api/hub/translations/profiles', {
      method: 'PUT',
      body: {
        id_lang: p.id_lang,
        profile: p.profile,
        tone: p.tone,
        culture_notes: p.culture_notes,
        glossary: p.glossary,
      },
    })
    profileDirty[p.id_lang] = false
  } catch (err: any) {
    console.error('[translations] save profile error:', err)
    alert('Erreur : ' + (err?.data?.statusMessage || err?.message))
  } finally {
    savingProfile.value = null
  }
}

onMounted(loadInit)
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
