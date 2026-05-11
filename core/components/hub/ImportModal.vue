<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="close"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ title }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</p>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      
      <div class="flex-1 overflow-auto px-6 py-5 space-y-5">
        
        <div v-if="!parsedRows.length && !importing && !result">
          <label
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
            :class="dragOver ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20' : 'border-gray-200 dark:border-slate-700'"
            class="block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <p class="mt-3 text-sm text-gray-600 dark:text-slate-300">Glisser-déposer votre CSV ici</p>
            <p class="text-xs text-gray-400 mt-1">ou cliquer pour parcourir</p>
            <input type="file" accept=".csv,text/csv" class="hidden" @change="onFileInput" />
          </label>
          <p class="text-[11px] text-gray-400 mt-3">
            Séparateur auto-détecté (<span class="font-mono">,</span> ou <span class="font-mono">;</span>). Première ligne = en-têtes.
            Colonnes reconnues :
            <span class="font-mono">{{ recognizedHeaders }}</span>.
          </p>
        </div>

        
        <div v-else-if="parsedRows.length && !importing && !result" class="space-y-5">
          <div class="flex items-center justify-between bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-gray-800 dark:text-slate-100">{{ fileName }}</p>
              <p class="text-[11px] text-gray-400">{{ parsedRows.length }} ligne{{ parsedRows.length > 1 ? 's' : '' }} détectée{{ parsedRows.length > 1 ? 's' : '' }} — séparateur <span class="font-mono">{{ detectedSep }}</span></p>
            </div>
            <button @click="reset" class="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 underline">Changer de fichier</button>
          </div>

          
          <div>
            <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide mb-2">Correspondance des colonnes</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div v-for="field in targetFields" :key="field.key" class="flex items-center gap-2">
                <label class="text-xs text-gray-500 w-36 shrink-0">
                  {{ field.label }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <select
                  v-model="mapping[field.key]"
                  class="flex-1 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option :value="undefined">— ignorer —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
                <span v-if="autoMapped[field.key]" class="text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shrink-0" title="Mapping détecté automatiquement">auto</span>
              </div>
            </div>
            <p v-if="!matchingKeyOK" class="text-[11px] text-red-600 mt-2">
              ⚠ Il faut mapper au minimum {{ matchingKeysLabel }} pour identifier les lignes.
            </p>
          </div>

          
          <div>
            <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide mb-2">Aperçu (5 premières lignes)</h3>
            <div class="overflow-auto border border-gray-100 dark:border-slate-800 rounded-lg">
              <table class="w-full text-xs">
                <thead class="bg-gray-50 dark:bg-slate-950/60">
                  <tr>
                    <th v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                      {{ h }}
                      <span v-if="reverseMap[h]" class="text-[9px] text-primary-600 dark:text-primary-400 font-normal ml-1">→ {{ reverseMap[h] }}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in parsedRows.slice(0, 5)" :key="idx" class="border-t border-gray-100 dark:border-slate-800">
                    <td v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-gray-700 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate" :title="String(row[h] ?? '')">
                      {{ row[h] ?? '' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          
          <div v-if="allowCreateMissing" class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-4 py-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="createMissing" class="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <div class="flex-1">
                <p class="text-xs font-medium text-amber-900 dark:text-amber-200">{{ createMissingLabel }}</p>
                <p class="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{{ createMissingHint }}</p>
              </div>
            </label>
          </div>
        </div>

        
        <div v-else-if="importing" class="py-12 text-center">
          <svg class="w-10 h-10 mx-auto animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          <p class="text-sm text-gray-600 dark:text-slate-300 mt-3">Import en cours… {{ parsedRows.length }} lignes</p>
        </div>

        
        <div v-else-if="result" class="space-y-4">
          <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-4">
            <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Import terminé</p>
            <div class="grid grid-cols-4 gap-2 mt-3 text-center">
              <div>
                <p class="text-xl font-bold text-gray-800 dark:text-slate-100">{{ result.stats.total }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">Total</p>
              </div>
              <div>
                <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{{ result.stats.updated }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">Mis à jour</p>
              </div>
              <div>
                <p class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ result.stats.created }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">Créés</p>
              </div>
              <div>
                <p class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ result.stats.skipped }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">Skippés</p>
              </div>
            </div>
          </div>
          <div v-if="result.stats.errors?.length" class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
            <p class="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">{{ result.stats.errors.length }} erreur(s)</p>
            <ul class="text-[11px] text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-auto">
              <li v-for="(e, i) in result.stats.errors.slice(0, 20)" :key="i">Ligne {{ e.row }} : {{ e.reason }}</li>
            </ul>
          </div>
        </div>
      </div>

      
      <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-gray-50/50 dark:bg-slate-950/40">
        <button
          v-if="!importing"
          @click="close"
          class="text-xs px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 transition-colors"
        >
          {{ result ? 'Fermer' : 'Annuler' }}
        </button>
        <button
          v-if="parsedRows.length && !importing && !result"
          @click="runImport"
          :disabled="!matchingKeyOK"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          Importer {{ parsedRows.length }} ligne{{ parsedRows.length > 1 ? 's' : '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface TargetField {
  key: string
  label: string
  required?: boolean
}

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle: string
  endpoint: string
  targetFields: TargetField[]
  fieldAliases: Record<string, string[]>
  matchingKeys: string[]
  allowCreateMissing?: boolean
  createMissingLabel?: string
  createMissingHint?: string
}>(), {
  allowCreateMissing: true,
  createMissingLabel: 'Créer les lignes manquantes',
  createMissingHint: 'Insère une nouvelle ligne si la clé (référence/email/slug/nom) n\'existe pas encore. Désactivé par défaut pour rester safe.',
})

const emit = defineEmits<{ close: []; done: [stats: any] }>()

const dragOver = ref(false)
const fileName = ref('')
const detectedSep = ref(',')
const csvHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, any>[]>([])
const mapping = reactive<Record<string, string | undefined>>({})
const autoMapped = reactive<Record<string, boolean>>({})
const createMissing = ref(false)
const importing = ref(false)
const result = ref<any>(null)

function initMapping() {
  for (const f of props.targetFields) mapping[f.key] = undefined
}
initMapping()

const recognizedHeaders = computed(() =>
  props.targetFields.map(f => f.label.toLowerCase()).join(', ')
)

const matchingKeysLabel = computed(() => {
  const labels = props.matchingKeys
    .map(k => props.targetFields.find(f => f.key === k)?.label || k)
  if (labels.length <= 1) return labels[0] || ''
  return labels.slice(0, -1).join(', ') + ' ou ' + labels[labels.length - 1]
})

const reverseMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const f of props.targetFields) {
    const col = mapping[f.key]
    if (col) m[col] = f.label
  }
  return m
})

const matchingKeyOK = computed(() => props.matchingKeys.some(k => !!mapping[k]))

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
}

function runAutoMap(headers: string[]) {
  for (const k of Object.keys(mapping)) mapping[k] = undefined
  for (const k of Object.keys(autoMapped)) delete autoMapped[k]

  for (const header of headers) {
    const norm = normalize(header)
    for (const [field, aliases] of Object.entries(props.fieldAliases)) {
      if (mapping[field]) continue
      if (aliases.some(a => normalize(a) === norm)) {
        mapping[field] = header
        autoMapped[field] = true
        break
      }
    }
  }
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; sep: string } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const countSemi = (firstLine.match(/;/g) || []).length
  const countComma = (firstLine.match(/,/g) || []).length
  const sep = countSemi > countComma ? ';' : ','

  const records: string[][] = []
  let cur: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === sep) { cur.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { cur.push(field); records.push(cur); cur = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field.length || cur.length) { cur.push(field); records.push(cur) }

  const headers = (records.shift() || []).map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (const rec of records) {
    if (rec.length === 1 && rec[0] === '') continue
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = (rec[idx] ?? '').trim() })
    rows.push(obj)
  }
  return { headers, rows, sep }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) handleFile(f)
}

async function handleFile(f: File) {
  fileName.value = f.name
  const text = await f.text()
  const { headers, rows, sep } = parseCSV(text)
  csvHeaders.value = headers
  parsedRows.value = rows
  detectedSep.value = sep
  runAutoMap(headers)
}

async function runImport() {
  importing.value = true
  try {
    const cleanMapping: Record<string, string> = {}
    for (const [k, v] of Object.entries(mapping)) if (v) cleanMapping[k] = v
    const res = await $fetch<any>(props.endpoint, {
      method: 'POST',
      body: {
        rows: parsedRows.value,
        mapping: cleanMapping,
        createMissing: createMissing.value,
      },
    })
    result.value = res
    emit('done', res?.stats)
  } catch (err: any) {
    result.value = {
      stats: {
        total: parsedRows.value.length,
        updated: 0, created: 0, skipped: 0,
        errors: [{ row: 0, reason: err?.data?.message || err?.data?.statusMessage || err?.message || 'Erreur inconnue' }],
      },
    }
  } finally {
    importing.value = false
  }
}

function reset() {
  fileName.value = ''
  csvHeaders.value = []
  parsedRows.value = []
  result.value = null
  createMissing.value = false
  initMapping()
  for (const k of Object.keys(autoMapped)) delete autoMapped[k]
}

function close() {
  reset()
  emit('close')
}

watch(() => props.open, (v) => { if (!v) reset() })
watch(() => props.targetFields, () => { initMapping() }, { deep: true })
</script>
