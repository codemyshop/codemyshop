<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <!-- Header + Jauge -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-8 py-6 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Cerveau de Marque IA</h1>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Votre IA conna&icirc;t le contexte de l'entreprise &agrave; <strong class="text-primary-600 dark:text-primary-400">{{ completionPercent }}%</strong>.
              {{ completionHint }}
            </p>
          </div>
          <!-- Save button -->
          <AIActionButton
            label="Compiler le Cerveau IA"
            loading-label="Compilation..."
            :is-loading="compiling"
            @click="compile"
          >
            <template #icon>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </template>
          </AIActionButton>
        </div>
        <!-- Barre de progression -->
        <div class="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-700"
            :style="`width: ${completionPercent}%`"
          />
        </div>
        <!-- Compilation result toast -->
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-2">
          <div v-if="compileResult" class="mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg"
            :class="compileResult.success ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400'">
            <svg v-if="compileResult.success" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
            {{ compileResult.message }}
          </div>
        </Transition>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-8 py-8 space-y-8">

      <!-- Tabs -->
      <div class="flex gap-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-1.5">
        <button
          v-for="tab in TABS" :key="tab.id" @click="activeTab = tab.id"
          :class="[
            'flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300',
            activeTab === tab.id
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800',
          ]"
        >
          {{ tab.icon }} {{ tab.label }}
          <span v-if="tab.id === 'voice'" class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </button>
      </div>

      <!-- ═══ Onglet 1 : Fondation & Dirigeant ═══ -->
      <template v-if="activeTab === 'foundation'">
        <BrandCard title="La Vision" placeholder="O&ugrave; voyez-vous votre entreprise dans 5 ans ? Quel impact voulez-vous avoir sur votre march&eacute; ?"
          v-model="brand.vision" :generating="genField === 'vision'" @generate="generateDraft('vision', 'une vision d\u2019entreprise B2B ambitieuse pour un grossiste alimentaire')" />

        <BrandCard title="La Mission" placeholder="Quelle est votre raison d'&ecirc;tre au quotidien ? Quel probl&egrave;me r&eacute;solvez-vous pour vos clients ?"
          v-model="brand.mission" :generating="genField === 'mission'" @generate="generateDraft('mission', 'une mission d\u2019entreprise centr\u00e9e sur la qualit\u00e9 et la fiabilit\u00e9')" />

        <BrandCard title="Les Valeurs" placeholder="3 &agrave; 5 valeurs fondamentales qui guident vos d&eacute;cisions."
          v-model="brand.values" :generating="genField === 'values'" @generate="generateDraft('values', '5 valeurs d\u2019entreprise B2B : qualit\u00e9, proximit\u00e9, innovation, transparence, engagement')" />

        <BrandCard title="Le Manifeste du Dirigeant" subtitle="Par Nareg DEMIR, CEO"
          placeholder="Pourquoi avez-vous cr&eacute;&eacute; cette entreprise ? Qu'est-ce qui vous anime chaque matin ?"
          v-model="brand.manifesto" :generating="genField === 'manifesto'" @generate="generateDraft('manifesto', 'un manifeste de dirigeant passionn\u00e9 par son m\u00e9tier de grossiste depuis 40 ans')" />
      </template>

      <!-- ═══ Tab 2: Marketing & Operational ═══ -->
      <template v-else-if="activeTab === 'marketing'">
        <BrandCard title="Persona Cible" subtitle="Par Aude Moyne, Resp. Marketing"
          placeholder="D&eacute;crivez votre client id&eacute;al : qui est-il, quels sont ses besoins, ses frustrations ?"
          v-model="brand.persona" :generating="genField === 'persona'" @generate="generateDraft('persona', 'un persona B2B : acheteur CHR/\u00e9picerie fine, 35-55 ans, soucieux de la qualit\u00e9 d\u2019origine')" />

        <BrandCard title="Analyse SWOT" placeholder="Forces, Faiblesses, Opportunit&eacute;s, Menaces — en quelques lignes pour chaque."
          v-model="brand.swot" :generating="genField === 'swot'" @generate="generateDraft('swot', 'une analyse SWOT pour un grossiste en fruits secs B2B avec 500+ produits')" />

        <BrandCard title="Tone of Voice" placeholder="Comment votre marque parle-t-elle ? Formelle ? D&eacute;contract&eacute;e ? Experte ? Quels mots utiliser / &eacute;viter ?"
          v-model="brand.tone" :generating="genField === 'tone'" @generate="generateDraft('tone', 'un guide de ton de voix B2B : expert, rassurant, pr\u00e9cis, jamais familier')" />

        <BrandCard title="Mix Marketing (4P)" placeholder="Produit, Prix, Distribution, Communication — votre strat&eacute;gie r&eacute;sum&eacute;e."
          v-model="brand.mix" :generating="genField === 'mix'" @generate="generateDraft('mix', 'un mix marketing 4P pour un grossiste alimentaire B2B en ligne')" />
      </template>

      <!-- ═══ Tab 3: Customer Voice (Live) ═══ -->
      <template v-else-if="activeTab === 'voice'">

        <!-- Sync button -->
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-slate-400">Donn&eacute;es extraites de votre boutique PrestaShop</p>
          <button
            @click="syncVoice"
            :disabled="syncing"
            class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-300 active:scale-95 disabled:opacity-50"
          >
            <svg :class="syncing ? 'animate-spin' : ''" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {{ syncing ? 'Synchronisation...' : 'Synchroniser PrestaShop' }}
          </button>
        </div>

        <!-- Shimmer / Data -->
        <template v-if="syncing">
          <div v-for="i in 3" :key="i" class="bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6 space-y-3">
            <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/4 shimmer" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full shimmer" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-5/6 shimmer" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-2/3 shimmer" />
          </div>
        </template>

        <template v-else>
          <!-- Intentions de recherche -->
          <div class="bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6">
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-4">Intentions de Recherche</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in voiceData.searchIntents" :key="tag"
                class="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20">
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Frictions SAV -->
          <div class="bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6">
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-4">Frictions SAV</h3>
            <ul class="space-y-2">
              <li v-for="(item, i) in voiceData.frictions" :key="i" class="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-300">
                <span class="w-1.5 h-1.5 rounded-full bg-danger-400 mt-2 shrink-0" />
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Verbatims positifs -->
          <div class="bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-6">
            <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-4">Verbatims Positifs</h3>
            <div class="space-y-3">
              <blockquote v-for="(v, i) in voiceData.verbatims" :key="i"
                class="pl-4 border-l-2 border-primary-300 dark:border-primary-600 text-sm text-gray-600 dark:text-slate-300 italic leading-relaxed">
                &laquo; {{ v.text }} &raquo;
                <span class="block text-xs text-gray-500 dark:text-slate-500 mt-1 not-italic">— {{ v.author }}</span>
              </blockquote>
            </div>
          </div>
        </template>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })
const { resolvedClientId } = useClientDetection()

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = 'foundation' | 'marketing' | 'voice'
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'foundation', icon: '🏛️', label: 'Fondation & Dirigeant' },
  { id: 'marketing',  icon: '📊', label: 'Marketing & Opérationnel' },
  { id: 'voice',      icon: '🎙️', label: 'Voix du Client (Live)' },
]
const activeTab = ref<TabId>('foundation')

// ── Brand data ────────────────────────────────────────────────────────────────

const brand = reactive({
  vision: '',
  mission: '',
  values: '',
  manifesto: '',
  persona: '',
  swot: '',
  tone: '',
  mix: '',
})

// ── Completion gauge ──────────────────────────────────────────────────────────

const completionPercent = computed(() => {
  const fields = Object.values(brand)
  const filled = fields.filter(v => v.trim().length > 20).length
  return Math.round((filled / fields.length) * 100)
})

const completionHint = computed(() => {
  if (completionPercent.value >= 90) return 'Excellent ! Votre IA a un contexte tr\u00e8s riche.'
  if (completionPercent.value >= 60) return 'Compl\u00e9tez le SWOT et le Mix pour des analyses plus pr\u00e9cises.'
  if (completionPercent.value >= 30) return 'Bon d\u00e9but. Remplissez la Vision et la Mission en priorit\u00e9.'
  return 'Commencez par documenter votre Vision pour d\u00e9bloquer l\u2019IA.'
})

// ── AI Draft generation ───────────────────────────────────────────────────────

const genField = ref<string | null>(null)

async function generateDraft(field: keyof typeof brand, instruction: string) {
  genField.value = field
  // Simuler la génération (en prod : appel callAI via /api/ai/brand-draft)
  await new Promise(r => setTimeout(r, 1500))

  const DRAFTS: Record<string, string> = {
    vision: 'Devenir le partenaire de r\u00e9f\u00e9rence des professionnels CHR et \u00e9piceries fines en Europe, en garantissant une tra\u00e7abilit\u00e9 totale depuis le producteur jusqu\u2019au point de vente. D\u2019ici 2030, chaque professionnel qui commande chez nous doit savoir exactement d\u2019o\u00f9 vient son produit.',
    mission: 'S\u00e9lectionner les meilleurs fruits secs et sp\u00e9cialit\u00e9s du monde, les conditionner avec rigueur, et les livrer aux professionnels dans des d\u00e9lais imbattables \u2014 pour que nos clients puissent se concentrer sur leur m\u00e9tier.',
    values: '1. Qualit\u00e9 d\u2019origine \u2014 On conna\u00eet chaque producteur.\n2. Fiabilit\u00e9 \u2014 Livr\u00e9 \u00e0 l\u2019heure, toujours.\n3. Proximit\u00e9 \u2014 Un interlocuteur d\u00e9di\u00e9 pour chaque compte.\n4. Innovation \u2014 Nouveaux formats, nouvelles gammes, chaque saison.\n5. Transparence \u2014 Tra\u00e7abilit\u00e9 compl\u00e8te et prix justes.',
    manifesto: 'Mon p\u00e8re a commenc\u00e9 avec un \u00e9tal de march\u00e9 et une camionnette. 40 ans plus tard, Example Shop est r\u00e9f\u00e9renc\u00e9 dans les plus belles tables de France. Ce qui n\u2019a pas chang\u00e9 : on go\u00fbte chaque lot avant de le r\u00e9f\u00e9rencer. On ne vendra jamais un produit qu\u2019on ne mettrait pas sur notre propre table.',
    persona: 'Mohamed, 42 ans, g\u00e9rant d\u2019\u00e9picerie fine \u00e0 Lyon. Il commande 2x/mois, panier moyen 450\u20ac HT. Ses crit\u00e8res : qualit\u00e9 irr\u00e9prochable, livraison rapide, et un fournisseur qui comprend les pics saisonniers (Ramadan, No\u00ebl).',
    swot: 'FORCES : 40 ans d\u2019expertise, relations directes producteurs, 500+ r\u00e9f\u00e9rences.\nFAIBLESSES : Site web vieillissant, pas de CRM structur\u00e9.\nOPPORTUNIT\u00c9S : March\u00e9 bio en croissance, CHR post-COVID en demande.\nMENACES : Amazon B2B, concurrents avec livraison J+1 en \u00cele-de-France.',
    tone: 'Ton expert et rassurant. Vouvoiement syst\u00e9matique en B2B. Toujours citer l\u2019origine g\u00e9ographique du produit. \u00c9viter : le jargon marketing, les superlatifs vides, le tutoiement. Privil\u00e9gier : les chiffres pr\u00e9cis, les labels qualit\u00e9, les t\u00e9moignages clients.',
    mix: 'PRODUIT : S\u00e9lection rigoureuse, conditionn\u00e9e en seaux/sachets/doypacks.\nPRIX : Tarifs d\u00e9gressifs B2B, franco d\u00e8s 300\u20ac HT.\nDISTRIBUTION : E-commerce headless + drive & collect entrepôt.\nCOMMUNICATION : Newsletter pro mensuelle, pr\u00e9sence LinkedIn, salons pro.',
  }

  brand[field] = DRAFTS[field] ?? ''
  genField.value = null
}

// ── Voice of Customer ─────────────────────────────────────────────────────────

const syncing = ref(false)
const voiceData = reactive({
  searchIntents: [
    'dattes medjoul gros', 'fruits secs bio vrac', 'd\u00e9lais livraison grossiste',
    'qualit\u00e9 premium amandes', 'franco de port fruits secs', 'conditionnement CHR',
    'olives kalamata professionnel', '\u00e9pices premium restaurant',
  ],
  frictions: [
    'D\u00e9lai de livraison d\u00e9pass\u00e9 de 48h sur la derni\u00e8re commande (Ticket #4521)',
    'Emballage endommag\u00e9 sur les seaux 5kg \u2014 3 retours ce mois',
    'Difficult\u00e9 \u00e0 trouver le bon conditionnement sur le site (UX recherche)',
    'Demande de paiement en 3x non disponible pour les nouveaux comptes',
  ],
  verbatims: [
    { text: 'La qualit\u00e9 des dattes Medjoul est exceptionnelle. Mon fournisseur pr\u00e9c\u00e9dent ne tenait pas la comparaison.', author: 'G\u00e9rant, \u00c9picerie Fine Lyon 6e' },
    { text: 'Livraison toujours \u00e0 l\u2019heure et service client tr\u00e8s r\u00e9actif. Example Shop est notre partenaire depuis 3 ans.', author: 'Chef Cuisinier, Restaurant \u00e9toil\u00e9 Paris' },
    { text: 'Le seau Meyva est parfait pour notre buffet petit-d\u00e9jeuner. Format pro, DLC longue, go\u00fbt constant.', author: 'Responsable Achats, H\u00f4tel Marriott Marseille' },
  ],
})

async function syncVoice() {
  syncing.value = true
  await new Promise(r => setTimeout(r, 2000))
  syncing.value = false
}

// ── Compile ───────────────────────────────────────────────────────────────────

const compiling = ref(false)

const compileResult = ref<{ success: boolean; message: string; wordCount?: number } | null>(null)

async function compile() {
  compiling.value = true
  compileResult.value = null
  try {
    const res = await $fetch<{ success: boolean; message: string; wordCount: number }>('/api/brand-os/compile', {
      method: 'POST',
      body: {
        clientId: resolvedClientId.value,
        foundation: {
          vision:    brand.vision,
          mission:   brand.mission,
          values:    brand.values,
          manifesto: brand.manifesto,
        },
        marketing: {
          persona: brand.persona,
          swot:    brand.swot,
          tone:    brand.tone,
          mix:     brand.mix,
        },
        voiceOfCustomer: {
          searchIntents: voiceData.searchIntents,
          frictions:     voiceData.frictions,
          verbatims:     voiceData.verbatims,
        },
      },
    })
    compileResult.value = res
  } catch (err: any) {
    compileResult.value = { success: false, message: err?.data?.message || 'Erreur de compilation' }
  } finally {
    compiling.value = false
    if (compileResult.value) setTimeout(() => { compileResult.value = null }, 5000)
  }
}
</script>

<!-- ── BrandCard sub-component (inline) ────────────────────────────────────── -->
<script lang="ts">
import { defineComponent, ref } from 'vue'

const BrandCard = defineComponent({
  name: 'BrandCard',
  props: {
    title: String,
    subtitle: String,
    placeholder: String,
    modelValue: String,
    generating: Boolean,
  },
  emits: ['update:modelValue', 'generate'],
  setup(props, { emit }) {
    const textarea = ref<HTMLTextAreaElement>()

    function autoResize() {
      if (!textarea.value) return
      textarea.value.style.height = 'auto'
      textarea.value.style.height = textarea.value.scrollHeight + 'px'
    }

    return { textarea, autoResize, emit }
  },
  template: `
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 transition-all duration-300 hover:shadow-sm">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-sm font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
        <button
          @click="$emit('generate')"
          :disabled="generating"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300"
          :class="generating
            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white animate-pulse'
            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          {{ generating ? 'Brouillon IA...' : 'Brouillon IA' }}
        </button>
      </div>
      <textarea
        ref="textarea"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value); autoResize()"
        :placeholder="placeholder"
        rows="4"
        class="w-full bg-transparent text-sm text-gray-700 dark:text-slate-300 leading-relaxed resize-none focus:outline-none focus:ring-0 placeholder:text-gray-300 dark:placeholder:text-slate-600"
      />
    </div>
  `,
})

export default { components: { BrandCard } }
</script>

<style scoped>
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
</style>
