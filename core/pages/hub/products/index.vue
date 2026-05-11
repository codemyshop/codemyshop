<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Produits</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ total }} produit{{ total > 1 ? 's' : '' }}</p>
        </div>
        <button
          v-if="categoryId"
          type="button"
          @click="clearCategoryFilter"
          class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-950/60 transition-colors"
          title="Retirer le filtre catégorie"
        >
          <span>Catégorie : {{ categoryName || `#${categoryId}` }}</span>
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" placeholder="Nom, réf, EAN…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
        <a
          href="/api/bo/products/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Télécharger le catalogue complet (CSV)"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Exporter
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Importer des produits depuis un CSV"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          Importer
        </button>
        <NuxtLink to="/hub/products/create" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau
        </NuxtLink>
      </div>
    </header>

    <HubImportModal
      :open="importOpen"
      title="Importer des produits"
      subtitle="CSV — UPSERT par référence ou EAN13. On ne touche qu'aux prix / noms / stocks."
      endpoint="/api/bo/products/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['reference', 'ean13']"
      create-missing-label="Créer les produits manquants"
      create-missing-hint="Insère un nouveau produit si la référence (ou l'EAN13) n'existe pas encore. Le produit est créé dans la catégorie par défaut, actif, sans image. Désactivé par défaut pour rester safe."
      @close="importOpen = false"
      @done="onImportDone"
    />

    
    <Transition enter-active-class="transition duration-150" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-100" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="selected.size > 0" class="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200 dark:border-violet-800 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <span class="text-xs font-medium text-violet-700 dark:text-violet-300">
          {{ selected.size }} produit{{ selected.size > 1 ? 's' : '' }} sélectionné{{ selected.size > 1 ? 's' : '' }}
        </span>
        <button @click="bulkRedaction" :disabled="bulkLoading" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          Rédaction IA
        </button>
        <button @click="selected.clear(); selectedProducts.clear()" class="text-xs text-violet-500 hover:text-violet-700 transition-colors">Désélectionner</button>
        <span v-if="bulkStatus" class="text-xs ml-auto" :class="bulkStatusClass">{{ bulkStatus }}</span>
      </div>
    </Transition>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="produits" :per-page="perPage" :per-page-options="perPageOptions" @go="goPage" @update:per-page="setPerPage" class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !products.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!products.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun produit trouvé</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-10">
              <input type="checkbox" :checked="allSelected" :indeterminate="someSelected && !allSelected" @change="toggleAll" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">ID <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-2 py-2.5 font-medium w-12">Image</th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('name')">Nom <span v-if="sortBy === 'name'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-4 py-2.5 font-medium">Réf.</th>
            <th class="px-4 py-2.5 font-medium">Catégorie</th>
            <th class="px-4 py-2.5 font-medium text-right cursor-pointer hover:text-gray-600" @click="toggleSort('price')">Prix HT <span v-if="sortBy === 'price'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th v-if="isFood" class="px-4 py-2.5 font-medium text-right" title="Prix au kilo / litre / unité — calculé depuis unit_price_ratio + unity (fallback poids)">Prix unitaire</th>
            <th class="px-4 py-2.5 font-medium text-center cursor-pointer hover:text-gray-600" @click="toggleSort('stock')">Stock <span v-if="sortBy === 'stock'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-4 py-2.5 font-medium text-center">Actif</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" @click="$router.push(`/hub/products/${p.id}`)">
            <td class="px-4 py-2.5" @click.stop>
              <input type="checkbox" :checked="selected.has(p.id)" @change="toggleSelect(p)" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ p.id }}</td>
            <td class="px-2 py-1.5" @click.stop="openImageModal(p)">
              <img v-if="p.imageUrl && !p._imgError" :src="p.imageUrl" :alt="p.name" loading="lazy" decoding="async" class="h-10 w-10 object-cover rounded cursor-pointer hover:ring-2 hover:ring-primary-400 hover:scale-110 transition-all" @error="p._imgError = true" />
              <div v-else class="h-10 w-10 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
              </div>
            </td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 max-w-[250px] truncate">{{ p.name }}</td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">{{ p.reference || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ p.categoryName || '—' }}</td>
            <td class="px-4 py-2.5 text-right font-medium" @click.stop="startEditPrice(p)">
              <input
                v-if="editingPrice === p.id"
                :ref="(el) => { if (el) priceInputRef = (el as HTMLInputElement) }"
                v-model.number="editPriceValue"
                type="number"
                step="0.01"
                min="0"
                class="w-24 text-right text-sm border border-primary-300 dark:border-primary-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-800"
                @keyup.enter="savePrice(p)"
                @blur="savePrice(p)"
                @click.stop
              />
              <span v-else class="hover:text-primary-600 hover:underline cursor-text">{{ formatEur(p.priceHT) }}</span>
            </td>
            <td v-if="isFood" class="px-4 py-2.5 text-right text-xs text-gray-500 dark:text-slate-400 font-mono">
              <template v-if="computeUnitPrice(p)">
                {{ formatEur(computeUnitPrice(p)!.value) }}
                <span class="text-[10px] text-gray-400 ml-0.5">{{ computeUnitPrice(p)!.label }}</span>
              </template>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop="startEditStock(p)">
              <input
                v-if="editingStock === p.id"
                :ref="(el) => { if (el) stockInputRef = (el as HTMLInputElement) }"
                v-model.number="editStockValue"
                type="number"
                step="1"
                min="0"
                class="w-20 text-center text-sm border border-primary-300 dark:border-primary-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-800"
                @keyup.enter="saveStock(p)"
                @blur="saveStock(p)"
                @click.stop
              />
              <span v-else class="font-medium hover:text-primary-600 hover:underline cursor-text" :class="p.stock <= 0 ? 'text-red-600' : p.stock < 5 ? 'text-amber-600' : 'text-gray-800 dark:text-slate-100'">{{ p.stock }}</span>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop="toggleActive(p)">
              <button
                :title="p.active ? 'Désactiver' : 'Activer'"
                class="group relative"
                :disabled="savingActive === p.id"
              >
                <span v-if="savingActive === p.id" class="w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full inline-block animate-spin" />
                <span v-else-if="p.active" class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block ring-2 ring-transparent group-hover:ring-green-200 transition-all" />
                <span v-else class="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block ring-2 ring-transparent group-hover:ring-gray-200 transition-all" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="produits" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />

    <HubProductImageModal
      :open="imageModalOpen"
      :images="imageModalImages"
      :client-id="imageModalClientId"
      :product-name="imageModalName"
      @close="imageModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const { isFood } = useTenantProfile()

function unitPriceLabel(unity: string | null): string {
  const u = String(unity || '').toLowerCase().trim()
  if (!u) return 'HT/U'
  if (/^(k|kg|kilo|kilogramme)/.test(u)) return 'HT/K'
  if (/^(l|litre|liter)/.test(u)) return 'HT/L'
  if (/^(u|unité|unite|piece|pièce|pce)/.test(u)) return 'HT/U'
  return `HT/${u.toUpperCase()}`
}
function computeUnitPrice(p: any): { value: number; label: string } | null {
  const price = Number(p.priceHT) || 0
  if (price <= 0) return null
  const ratio = Number(p.unitPriceRatio) || 0
  if (ratio > 0) {
    return { value: price / ratio, label: unitPriceLabel(p.unity) }
  }
  const weight = Number(p.weight) || 0
  if (weight > 0) {
    return { value: price / weight, label: 'HT/K' }
  }
  return null
}

const products = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')
const importOpen = ref(false)
const importTargetFields = [
  { key: 'reference',    label: 'Référence', required: false },
  { key: 'ean13',        label: 'EAN13',     required: false },
  { key: 'name',         label: 'Nom',       required: false },
  { key: 'priceHT',      label: 'Prix HT',   required: false },
  { key: 'stock',        label: 'Stock',     required: false },
  { key: 'categoryName', label: 'Catégorie', required: false },
]
const importFieldAliases: Record<string, string[]> = {
  reference:    ['ref', 'reference', 'référence', 'sku', 'réf'],
  ean13:        ['ean', 'ean13', 'code-barres', 'codebarres', 'barcode', 'gtin'],
  name:         ['nom', 'name', 'titre', 'title', 'libelle', 'libellé'],
  priceHT:      ['prix', 'price', 'prix ht', 'price ht', 'pht', 'prix ttc', 'price ttc'],
  stock:        ['stock', 'quantite', 'quantité', 'quantity', 'qty', 'qte'],
  categoryName: ['categorie', 'catégorie', 'category', 'categorie defaut'],
}

const route = useRoute()
const router = useRouter()
const categoryId = ref<number>(Number(route.query.category) || 0)
const categoryName = computed(() => {
  if (!categoryId.value) return ''
  return products.value.find(p => Number(p.categoryId) === categoryId.value)?.categoryName || ''
})

function clearCategoryFilter() {
  categoryId.value = 0
  router.replace({ query: { ...route.query, category: undefined } })
  goPage(1)
}

watch(() => route.query.category, (val) => {
  const next = Number(val) || 0
  if (next !== categoryId.value) {
    categoryId.value = next
    goPage(1)
  }
})

const selected = reactive(new Set<number>())
const selectedProducts = reactive(new Map<number, { name: string; slug: string }>())
const bulkLoading = ref(false)
const bulkStatus = ref<string | null>(null)
const bulkStatusClass = ref('text-violet-600')

const allSelected = computed(() => products.value.length > 0 && products.value.every(p => selected.has(p.id)))
const someSelected = computed(() => products.value.some(p => selected.has(p.id)))

function toggleSelect(p: any) {
  if (selected.has(p.id)) {
    selected.delete(p.id)
    selectedProducts.delete(p.id)
  } else {
    selected.add(p.id)
    selectedProducts.set(p.id, { name: p.name, slug: p.reference || '' })
  }
}

function toggleAll() {
  if (allSelected.value) {
    products.value.forEach(p => { selected.delete(p.id); selectedProducts.delete(p.id) })
  } else {
    products.value.forEach(p => { selected.add(p.id); selectedProducts.set(p.id, { name: p.name, slug: p.reference || '' }) })
  }
}

async function bulkRedaction() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = `Mise en queue de ${selected.size} produit(s)…`
  bulkStatusClass.value = 'text-violet-600'
  let ok = 0, fail = 0
  for (const id of selected) {
    const info = selectedProducts.get(id)
    if (!info) continue
    try {
      await $fetch('/api/bo/products/generate-content', { method: 'POST', body: { id_product: id, name: info.name, slug: info.slug } })
      ok++
    } catch { fail++ }
  }
  bulkLoading.value = false
  bulkStatus.value = fail === 0 ? `${ok} en queue rédaction IA` : `${ok} en queue, ${fail} erreur(s)`
  bulkStatusClass.value = fail === 0 ? 'text-emerald-600' : 'text-amber-600'
  setTimeout(() => { bulkStatus.value = null }, 5000)
}

const editingPrice = ref<number | null>(null)
const editPriceValue = ref(0)
const priceInputRef = ref<HTMLInputElement | null>(null)
const editingStock = ref<number | null>(null)
const editStockValue = ref(0)
const stockInputRef = ref<HTMLInputElement | null>(null)
const savingActive = ref<number | null>(null)

const imageModalOpen = ref(false)
const imageModalImages = ref<number[]>([])
const imageModalClientId = ref('')
const imageModalName = ref('')

function openImageModal(p: any) {
  const ids: number[] = p.imageIds ?? []
  if (!ids.length && p.imageUrl) {
    
    const match = p.imageUrl.match(/\/api\/catalogue\/image\/(\d+)/)
    if (match) ids.push(Number(match[1]))
  }
  if (!ids.length) return
  
  const clientMatch = p.imageUrl?.match(/clientId=([^&]+)/)
  imageModalClientId.value = clientMatch ? clientMatch[1] : 'ac-hub'
  imageModalImages.value = ids
  imageModalName.value = p.name || ''
  imageModalOpen.value = true
}

function onImportDone() {
  load()
}

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  else { sortBy.value = col; sortDir.value = 'DESC' }
  goPage(1)
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/products', { query: { page: page.value, perPage: perPage.value, search: search.value, sort: sortBy.value, dir: sortDir.value, category: categoryId.value || undefined } })
    products.value = data.products ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

function startEditPrice(p: any) {
  editingPrice.value = p.id
  editPriceValue.value = Number(p.priceHT) || 0
  nextTick(() => priceInputRef.value?.select())
}

async function savePrice(p: any) {
  if (editingPrice.value !== p.id) return
  const newPrice = Math.round(editPriceValue.value * 100) / 100
  editingPrice.value = null
  if (newPrice === Number(p.priceHT)) return
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { priceHT: newPrice } })
    p.priceHT = newPrice
  } catch (e) {
    console.error('[products] price save failed', e)
  }
}

function startEditStock(p: any) {
  editingStock.value = p.id
  editStockValue.value = Number(p.stock) || 0
  nextTick(() => stockInputRef.value?.select())
}

async function saveStock(p: any) {
  if (editingStock.value !== p.id) return
  const newStock = Math.round(editStockValue.value)
  editingStock.value = null
  if (newStock === Number(p.stock)) return
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { stock: newStock } })
    p.stock = newStock
  } catch (e) {
    console.error('[products] stock save failed', e)
  }
}

async function toggleActive(p: any) {
  if (savingActive.value === p.id) return
  savingActive.value = p.id
  const newActive = !p.active
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { active: newActive } })
    p.active = newActive ? 1 : 0
  } catch (e) {
    console.error('[products] active toggle failed', e)
  } finally {
    savingActive.value = null
  }
}

onMounted(load)
</script>
