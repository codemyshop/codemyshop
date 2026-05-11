<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Référencement</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">Meta title, meta description, slug. Preview SERP Google en direct.</p>
      </div>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">SEO</span>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-xs font-medium text-gray-500">Meta title</label>
        <span class="text-[10px] font-mono" :class="titleCounterClass">{{ titleLength }} / 60</span>
      </div>
      <input
        v-model="model.metaTitle"
        type="text"
        :placeholder="model.name || 'Titre affiché dans Google et l onglet navigateur'"
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
      <p class="text-[10px] text-gray-400 mt-1">Si vide, Google utilisera le nom du produit.</p>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-xs font-medium text-gray-500">Meta description</label>
        <span class="text-[10px] font-mono" :class="descCounterClass">{{ descLength }} / 160</span>
      </div>
      <textarea
        v-model="model.metaDescription"
        rows="3"
        placeholder="Résumé affiché sous le lien dans les résultats Google."
        class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">URL réécrite (link rewrite)</label>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-gray-400 font-mono select-none">/</span>
        <input
          v-model="model.linkRewrite"
          type="text"
          placeholder="mon-produit"
          @input="sanitizeSlug"
          class="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <button
          type="button"
          @click="regenerateSlug"
          class="text-[10px] uppercase tracking-wide px-2 py-2 rounded border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          title="Régénérer depuis le nom du produit"
        >
          Régénérer
        </button>
      </div>
      <p class="text-[10px] text-gray-400 mt-1">Minuscules, tirets, pas d'accent ni d'espace.</p>
    </div>

    
    <div class="pt-4 border-t border-gray-100 dark:border-slate-800">
      <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Aperçu Google</p>
      <div class="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-4 font-sans">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white text-[10px] font-bold">G</div>
          <div class="flex flex-col">
            <span class="text-xs text-gray-600 dark:text-slate-300 leading-tight">{{ siteName }}</span>
            <span class="text-[10px] text-gray-400 leading-tight truncate max-w-md">{{ previewUrl }}</span>
          </div>
        </div>
        <h3 class="text-lg text-[#1a0dab] dark:text-blue-400 font-normal leading-snug cursor-pointer hover:underline">
          {{ previewTitle }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-slate-400 leading-snug mt-1 line-clamp-2">
          {{ previewDescription }}
        </p>
      </div>
      <p class="text-[10px] text-gray-400 mt-2">
        <span v-if="titleLength > 60" class="text-amber-600">⚠ Le meta title dépasse 60 caractères, Google tronquera.</span>
        <span v-else-if="descLength > 160" class="text-amber-600">⚠ La meta description dépasse 160 caractères, Google tronquera.</span>
        <span v-else class="text-emerald-600">✓ Longueurs conformes aux recommandations Google.</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SeoForm {
  name: string
  metaTitle: string
  metaDescription: string
  linkRewrite: string
  description: string
  descriptionShort: string
}

const model = defineModel<SeoForm>({ required: true })

const props = defineProps<{
  siteHost?: string
}>()

const siteName = computed(() => (props.siteHost || 'www.example-shop.com').replace(/^https?:\/\//, ''))
const previewUrl = computed(() => `${siteName.value} › ${model.value.linkRewrite || 'produit'}`)

const previewTitle = computed(() => {
  const t = (model.value.metaTitle || '').trim() || (model.value.name || '').trim() || 'Titre du produit'
  return t.length > 60 ? t.slice(0, 60) + '…' : t
})

const previewDescription = computed(() => {
  const d = (model.value.metaDescription || '').trim()
    || stripHtml(model.value.descriptionShort || '').trim()
    || stripHtml(model.value.description || '').trim()
    || 'Aucune description. Google générera un snippet automatiquement.'
  return d.length > 160 ? d.slice(0, 160) + '…' : d
})

const titleLength = computed(() => (model.value.metaTitle || '').length)
const descLength = computed(() => (model.value.metaDescription || '').length)

const titleCounterClass = computed(() => {
  const l = titleLength.value
  if (l === 0) return 'text-gray-400'
  if (l > 60) return 'text-red-600'
  if (l > 50) return 'text-amber-600'
  return 'text-emerald-600'
})

const descCounterClass = computed(() => {
  const l = descLength.value
  if (l === 0) return 'text-gray-400'
  if (l > 160) return 'text-red-600'
  if (l > 140) return 'text-amber-600'
  return 'text-emerald-600'
})

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function sanitizeSlug() {
  const cleaned = (model.value.linkRewrite || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
  if (cleaned !== model.value.linkRewrite) model.value.linkRewrite = cleaned
}

function regenerateSlug() {
  model.value.linkRewrite = slugify(model.value.name)
}
</script>
