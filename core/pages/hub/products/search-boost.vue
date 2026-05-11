
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Recherche & Tri</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Synonymes de recherche (ps_alias) · vocabulaire indexé (ps_search_word)
          </p>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button @click="activeTab = 'synonyms'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'synonyms' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Synonymes
          </button>
          <button @click="activeTab = 'vocabulary'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'vocabulary' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Vocabulaire
          </button>
          <button @click="activeTab = 'semantics'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'semantics' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Sémantique
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <template v-if="activeTab === 'synonyms'">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total synonymes</p><p class="text-2xl font-extrabold">{{ aliases?.total ?? 0 }}</p></div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Actifs</p><p class="text-2xl font-extrabold text-success-600">{{ aliases?.activeCount ?? 0 }}</p></div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Inactifs</p><p class="text-2xl font-extrabold text-gray-400">{{ (aliases?.total ?? 0) - (aliases?.activeCount ?? 0) }}</p></div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">{{ editingId ? 'Modifier un synonyme' : 'Ajouter un synonyme' }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">Quand un visiteur tape <em>alias</em>, PrestaShop cherche <em>search</em> à la place.</p>
          </div>
          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div class="md:col-span-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Alias (ce que tape le visiteur)</label>
              <input v-model="form.alias" type="text" placeholder="ex: bloose"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div class="md:col-span-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Search (ce qui est cherché)</label>
              <input v-model="form.search" type="text" placeholder="ex: blouse"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div class="flex items-center gap-2">
              <button @click="saveAlias" :disabled="!form.alias || !form.search || saving"
                class="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
                {{ editingId ? 'Enregistrer' : 'Ajouter' }}
              </button>
              <button v-if="editingId" @click="resetForm"
                class="text-xs font-semibold px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300">
                Annuler
              </button>
            </div>
          </div>
          <div v-if="formError || formSuccess" class="px-6 pb-4">
            <p v-if="formError" class="text-xs text-danger-600">{{ formError }}</p>
            <p v-else-if="formSuccess" class="text-xs text-success-600">✓ {{ formSuccess }}</p>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-sm font-bold">Synonymes existants</h2>
            <input v-model="aliasSearch" @input="loadAliasesDebounced" type="text" placeholder="Filtrer…"
              class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 bg-white dark:bg-slate-900" />
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Alias</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500 w-6"></th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Search</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-500">Actif</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="loadingAliases" v-for="i in 4" :key="i"><td colspan="5" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
                <tr v-else-if="!aliases?.aliases.length"><td colspan="5" class="px-4 py-10 text-center text-gray-400">Aucun synonyme.</td></tr>
                <tr v-for="a in aliases?.aliases" :key="a.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2 font-mono text-[11px]">{{ a.alias }}</td>
                  <td class="px-4 py-2 text-gray-300">→</td>
                  <td class="px-4 py-2 font-mono text-[11px] font-semibold">{{ a.search }}</td>
                  <td class="px-4 py-2 text-center">
                    <button @click="toggleActive(a)" :disabled="togglingId === a.id"
                      :class="[
                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50',
                        a.active ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700',
                      ]">
                      <span :class="['pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition', a.active ? 'translate-x-4' : 'translate-x-0']" />
                    </button>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button @click="editAlias(a)" class="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-gray-800 mr-1">Éditer</button>
                    <button @click="deleteAlias(a)" :disabled="deletingId === a.id" class="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-50">Supprimer</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      
      <template v-if="activeTab === 'semantics'">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Embeddings</p>
            <p class="text-2xl font-extrabold">{{ semantics?.totalEmbeddings ?? 0 }}</p>
            <p class="text-[11px] text-gray-400 mt-0.5">{{ semantics?.indexedProducts ?? 0 }} produits × {{ semantics?.indexedLangs ?? 0 }} langues</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Couverture</p>
            <p class="text-2xl font-extrabold" :class="(semantics?.missingProducts ?? 0) > 0 ? 'text-warning-600' : 'text-success-600'">
              {{ coveragePct }}%
            </p>
            <p class="text-[11px] text-gray-400 mt-0.5">{{ semantics?.missingProducts ?? 0 }} produit(s) à indexer</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Modèle</p>
            <p class="text-sm font-bold font-mono truncate">{{ semantics?.model ?? '—' }}</p>
            <p class="text-[11px] text-gray-400 mt-0.5">{{ semantics?.dim ?? 0 }} dimensions</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dernière indexation</p>
            <p class="text-sm font-bold">{{ formattedLastIndexed }}</p>
            <p class="text-[11px] text-gray-400 mt-0.5">{{ relativeLastIndexed }}</p>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">Mode de recherche actif</h2>
            <p class="text-xs text-gray-500 mt-0.5">Appliqué quand la search bar front ne précise pas <code class="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800">?mode=…</code>. Stocké dans <code class="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800">ps_configuration.AC_SEARCH_MODE</code>.</p>
          </div>
          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button v-for="opt in MODE_OPTIONS" :key="opt.value"
              @click="setMode(opt.value)"
              :disabled="savingMode || semantics?.currentMode === opt.value"
              :class="[
                'text-left p-4 rounded-xl border-2 transition-all',
                semantics?.currentMode === opt.value
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600',
              ]">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider">{{ opt.label }}</span>
                <span v-if="semantics?.currentMode === opt.value" class="text-[10px] font-bold text-primary-600 bg-primary-100 dark:bg-primary-800 px-2 py-0.5 rounded-full">ACTIF</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-relaxed">{{ opt.desc }}</p>
            </button>
          </div>
          <div v-if="modeError || modeSuccess" class="px-6 pb-4">
            <p v-if="modeError" class="text-xs text-danger-600">{{ modeError }}</p>
            <p v-else-if="modeSuccess" class="text-xs text-success-600">✓ {{ modeSuccess }}</p>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">Réindexer le catalogue</h2>
            <p class="text-xs text-gray-500 mt-0.5">L'embedder Mistral skip les produits dont le contenu n'a pas changé (hash md5). Steady-state ≈ gratuit.</p>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Commande à lancer côté host</p>
              <pre class="text-[11px] font-mono bg-gray-900 text-gray-100 px-3 py-2 rounded overflow-x-auto"><code>python3 automation/ac_embedder.py --tenant {{ embedderTenant }}</code></pre>
              <p class="text-[10px] text-gray-400 mt-2 leading-relaxed">
                Wave 1 (2026-05-05) : déclenchement manuel — l'embedder vit hors du container Nuxt (pas de Python embarqué).
                Wave 2 prévue : Nitro task <code class="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-700">embeddings:reindex</code> + cron 6h.
              </p>
            </div>
          </div>
        </div>
      </template>

      
      <template v-if="activeTab === 'vocabulary'">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mots indexés (FR)</p><p class="text-2xl font-extrabold">{{ vocabulary?.totalWords ?? 0 }}</p></div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Produits indexés</p><p class="text-2xl font-extrabold">{{ vocabulary?.indexedProducts ?? 0 }}</p></div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold">Mots les plus pondérés</h2>
              <p class="text-xs text-gray-500 mt-0.5">Trié par poids cumulé dans l'index de recherche</p>
            </div>
            <input v-model="vocabSearch" @input="loadVocabDebounced" type="text" placeholder="Chercher un mot…"
              class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 bg-white dark:bg-slate-900" />
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Mot</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Poids total</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Produits</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="loadingVocab" v-for="i in 5" :key="i"><td colspan="4" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
                <tr v-else-if="!vocabulary?.words.length"><td colspan="4" class="px-4 py-10 text-center text-gray-400">Vocabulaire vide. Les produits ne sont peut-être pas encore indexés.</td></tr>
                <tr v-for="w in vocabulary?.words" :key="w.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2 font-mono text-[11px] font-semibold">{{ w.word }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ w.totalWeight }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ w.productCount }}</td>
                  <td class="px-4 py-2 text-right">
                    <button @click="prefillAlias(w.word)"
                      class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700">
                      Créer un synonyme →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Alias  { id: number; alias: string; search: string; active: boolean }
interface Word   { id: number; word: string; totalWeight: number; productCount: number }
interface SemanticsStats {
  totalEmbeddings: number
  indexedProducts: number
  indexedLangs: number
  totalActiveProducts: number
  missingProducts: number
  lastIndexedAt: string | null
  model: string | null
  dim: number
  currentMode: 'lex' | 'sem' | 'hybrid' | string
}

const activeTab = ref<'synonyms' | 'vocabulary' | 'semantics'>('synonyms')

const aliases        = ref<{ total: number; activeCount: number; aliases: Alias[] } | null>(null)
const loadingAliases = ref(true)
const aliasSearch    = ref('')
const form           = reactive({ alias: '', search: '' })
const editingId      = ref<number | null>(null)
const saving         = ref(false)
const togglingId     = ref<number | null>(null)
const deletingId     = ref<number | null>(null)
const formError      = ref('')
const formSuccess    = ref('')

async function loadAliases() {
  loadingAliases.value = true
  try {
    aliases.value = await $fetch('/api/bo/products/search-boost/aliases', {
      query: aliasSearch.value ? { search: aliasSearch.value } : {},
    })
  } catch { aliases.value = null }
  finally { loadingAliases.value = false }
}
let aliasDebounce: any
function loadAliasesDebounced() { clearTimeout(aliasDebounce); aliasDebounce = setTimeout(loadAliases, 250) }

function resetForm() {
  form.alias = ''; form.search = ''
  editingId.value = null
  formError.value = ''
}

function editAlias(a: Alias) {
  form.alias = a.alias
  form.search = a.search
  editingId.value = a.id
  formError.value = ''
  formSuccess.value = ''
}

async function saveAlias() {
  saving.value = true
  formError.value = ''
  formSuccess.value = ''
  try {
    await $fetch('/api/bo/products/search-boost/aliases', {
      method: 'POST',
      body: { id: editingId.value || undefined, alias: form.alias, search: form.search, active: true },
    })
    formSuccess.value = editingId.value ? 'Synonyme mis à jour' : 'Synonyme ajouté'
    setTimeout(() => { formSuccess.value = '' }, 2500)
    resetForm()
    loadAliases()
  } catch (e: any) {
    formError.value = e?.statusMessage || 'Erreur enregistrement'
  } finally {
    saving.value = false
  }
}

async function toggleActive(a: Alias) {
  togglingId.value = a.id
  try {
    await $fetch('/api/bo/products/search-boost/aliases', {
      method: 'POST',
      body: { id: a.id, alias: a.alias, search: a.search, active: !a.active },
    })
    a.active = !a.active
  } catch (e) { console.error(e) }
  finally { togglingId.value = null }
}

async function deleteAlias(a: Alias) {
  if (!confirm(`Supprimer le synonyme "${a.alias}" → "${a.search}" ?`)) return
  deletingId.value = a.id
  try {
    await $fetch('/api/bo/products/search-boost/aliases', { method: 'DELETE', query: { id: a.id } })
    loadAliases()
  } catch (e) { console.error(e) }
  finally { deletingId.value = null }
}

const vocabulary  = ref<{ totalWords: number; indexedProducts: number; words: Word[] } | null>(null)
const loadingVocab = ref(true)
const vocabSearch = ref('')

async function loadVocab() {
  loadingVocab.value = true
  try {
    vocabulary.value = await $fetch('/api/bo/products/search-boost/vocabulary', {
      query: vocabSearch.value ? { search: vocabSearch.value, limit: 100 } : { limit: 100 },
    })
  } catch { vocabulary.value = null }
  finally { loadingVocab.value = false }
}
let vocabDebounce: any
function loadVocabDebounced() { clearTimeout(vocabDebounce); vocabDebounce = setTimeout(loadVocab, 250) }

function prefillAlias(word: string) {
  activeTab.value = 'synonyms'
  form.search = word
  form.alias = ''
  editingId.value = null
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>('input[placeholder="ex: bloose"]')
    el?.focus()
  })
}

const MODE_OPTIONS = [
  { value: 'lex',    label: 'Lexical',  desc: 'ILIKE + trigram + ps_alias. Pas d\'appel Mistral. Plus rapide, moins tolérant aux reformulations.' },
  { value: 'sem',    label: 'Sémantique', desc: 'pgvector cosine pur. Tolère reformulations, synonymes implicites. Coût Mistral à chaque query non-cachée.' },
  { value: 'hybrid', label: 'Hybride RRF', desc: 'Fusion lex + sem (k=60). Meilleur des deux mondes. Fallback auto vers lex si Mistral indispo.' },
] as const

const semantics = ref<SemanticsStats | null>(null)
const loadingSemantics = ref(true)
const savingMode = ref(false)
const modeError   = ref('')
const modeSuccess = ref('')

async function loadSemantics() {
  loadingSemantics.value = true
  try {
    semantics.value = await $fetch<SemanticsStats>('/api/bo/products/search-boost/embeddings')
  } catch { semantics.value = null }
  finally { loadingSemantics.value = false }
}

async function setMode(mode: 'lex' | 'sem' | 'hybrid') {
  savingMode.value = true
  modeError.value = ''
  modeSuccess.value = ''
  try {
    await $fetch('/api/bo/products/search-boost/embeddings', { method: 'POST', body: { mode } })
    modeSuccess.value = `Mode actif : ${mode}`
    setTimeout(() => { modeSuccess.value = '' }, 2500)
    loadSemantics()
  } catch (e: any) {
    modeError.value = e?.statusMessage || e?.data?.statusMessage || 'Erreur enregistrement'
  } finally {
    savingMode.value = false
  }
}

const coveragePct = computed(() => {
  const total = semantics.value?.totalActiveProducts ?? 0
  const idx   = semantics.value?.indexedProducts ?? 0
  if (!total) return 0
  return Math.round((idx / total) * 100)
})

const formattedLastIndexed = computed(() => {
  const iso = semantics.value?.lastIndexedAt
  if (!iso) return 'Jamais'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
})

const relativeLastIndexed = computed(() => {
  const iso = semantics.value?.lastIndexedAt
  if (!iso) return 'Aucun embedding en DB'
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diffMs / 3_600_000)
  if (h < 1) return 'il y a moins d\'une heure'
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'il y a 1 jour' : `il y a ${d} jours`
})

const embedderTenant = computed(() => {
  if (typeof window === 'undefined') return 'ac'
  const host = window.location.hostname
  if (host.includes('example-shop')) return 'example-shop'
  if (host.includes('smoke'))   return 'example-vape'
  return 'ac'
})

watch(activeTab, (tab) => {
  if (tab === 'semantics' && !semantics.value) loadSemantics()
})

onMounted(() => { loadAliases(); loadVocab() })
</script>
