<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Origines &amp; Calibres</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ products.length }} produit{{ products.length > 1 ? 's' : '' }} · {{ nbWithLegal }} avec mentions · {{ nbInherited }} via héritage lot</p>
      </div>
      <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- Legend -->
      <section class="bg-amber-50/40 dark:bg-slate-800/30 border border-amber-100 dark:border-slate-700 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-lg">🏷️</span>
          <div class="text-xs text-gray-700 dark:text-slate-300 space-y-1">
            <p><span class="font-semibold">Mentions légales obligatoires B2B grossiste</span> — injectées sur fiche produit + PDF facture/BL.</p>
            <p class="text-gray-500 dark:text-slate-400">Si les champs produit sont vides, les valeurs sont héritées du lot FIFO actif (<code class="font-mono bg-gray-100 dark:bg-slate-800 px-1 rounded">cs_lot</code>). Badge <span class="font-semibold text-primary-600">lot</span> = source héritée, <span class="font-semibold text-gray-700 dark:text-slate-200">produit</span> = valeur explicite.</p>
          </div>
        </div>
      </section>

      <!-- Tableau produits -->
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500">Produits</h2>
          <input v-model="filter" type="text" placeholder="🔍 filtrer nom/ref…" class="text-xs px-2 py-1 border border-gray-200 dark:border-slate-700 rounded w-48" />
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 5" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="!filtered.length" class="py-10 text-center text-xs text-gray-400">Aucun produit ne correspond.</div>
        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium">Origine</th>
              <th class="px-4 py-2.5 font-medium">Calibre</th>
              <th class="px-4 py-2.5 font-medium">Catégorie légale</th>
              <th class="px-4 py-2.5 font-medium">Mentions</th>
              <th class="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.idProduct" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-amber-50/20 dark:hover:bg-amber-900/10">
              <td class="px-4 py-2">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-gray-800 dark:text-slate-100">{{ p.productName || `#${p.idProduct}` }}</span>
                  <span class="text-[10px] font-mono text-gray-400">{{ p.reference || '—' }}</span>
                </div>
              </td>
              <td class="px-4 py-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-semibold">{{ p.effectiveOrigin || '—' }}</span>
                  <span v-if="p.effectiveOrigin" class="text-[10px] px-1.5 py-0.5 rounded-full" :class="sourceBadge(p.originIso2 ? 'product' : 'lot')">
                    {{ p.originIso2 ? 'produit' : 'lot' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs">{{ p.effectiveCaliber || '—' }}</span>
                  <span v-if="p.effectiveCaliber" class="text-[10px] px-1.5 py-0.5 rounded-full" :class="sourceBadge(p.caliber ? 'product' : 'lot')">
                    {{ p.caliber ? 'produit' : 'lot' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2 text-xs text-gray-600 dark:text-slate-400">{{ p.categoryLegal || '—' }}</td>
              <td class="px-4 py-2 text-xs text-gray-500 max-w-xs truncate" :title="p.additionalMentions">{{ p.additionalMentions || '—' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-1">
                  <button @click="openEdit(p)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-primary-600" title="Éditer">✎</button>
                  <button v-if="p.id" @click="deleteLegal(p)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-danger-500" title="Vider (retour héritage lot)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- Edit modal -->
    <div v-if="editModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="editModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-lg mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">
            Mentions légales — {{ editForm.productName || `#${editForm.idProduct}` }}
          </h2>
          <button @click="editModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitEdit" class="p-5 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Origine (ISO alpha-2)</span>
              <input v-model="editForm.originIso2" maxlength="2" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 font-mono uppercase" placeholder="FR, US, ES…" />
              <span v-if="inheritedHint.origin" class="text-[10px] text-amber-600 mt-0.5 block">Si vide, héritage lot : <code>{{ inheritedHint.origin }}</code></span>
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Calibre</span>
              <input v-model="editForm.caliber" maxlength="32" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="23/25, M, Extra…" />
              <span v-if="inheritedHint.caliber" class="text-[10px] text-amber-600 mt-0.5 block">Si vide, héritage lot : <code>{{ inheritedHint.caliber }}</code></span>
            </label>
          </div>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Catégorie légale</span>
            <input v-model="editForm.categoryLegal" maxlength="64" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="Fruit sec, Légume frais, Épice…" />
          </label>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Mentions additionnelles</span>
            <textarea v-model="editForm.additionalMentions" rows="4" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs" placeholder="Allergènes, conservation, DLC, lot, etc." />
          </label>

          <!-- Preview rendu -->
          <div class="mt-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded border border-dashed border-gray-200 dark:border-slate-700">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Preview (fiche / facture)</p>
            <p class="text-xs text-gray-800 dark:text-slate-100">
              <span v-if="previewOrigin">🌍 Origine : <span class="font-semibold">{{ previewOrigin }}</span></span>
              <span v-if="previewCaliber"> · 📏 Calibre : <span class="font-semibold">{{ previewCaliber }}</span></span>
              <span v-if="editForm.categoryLegal"> · 🏷️ <span class="font-semibold">{{ editForm.categoryLegal }}</span></span>
            </p>
            <p v-if="editForm.additionalMentions" class="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap">{{ editForm.additionalMentions }}</p>
          </div>

          <p v-if="editError" class="text-xs text-danger-500">{{ editError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="editModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="saving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ saving ? 'Enreg…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface ProductLegal {
  idProduct: number
  idLang: number
  productName: string | null
  reference: string | null
  id: number | null
  originIso2: string | null
  caliber: string | null
  categoryLegal: string | null
  additionalMentions: string | null
  active: number | null
  inheritedOrigin: string | null
  inheritedCaliber: string | null
  effectiveOrigin: string | null
  effectiveCaliber: string | null
  hasLegal: boolean
  hasInheritance: boolean
}

const products = ref<ProductLegal[]>([])
const loading = ref(true)
const filter = ref('')

const editModalOpen = ref(false)
const editError = ref('')
const saving = ref(false)
const editForm = ref({
  idProduct: 0 as number,
  productName: '' as string | null,
  originIso2: '' as string | null,
  caliber: '' as string | null,
  categoryLegal: '' as string | null,
  additionalMentions: '' as string | null,
})
const inheritedHint = ref({ origin: '' as string | null, caliber: '' as string | null })

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter(p =>
    (p.productName?.toLowerCase().includes(q))
    || (p.reference?.toLowerCase().includes(q))
    || (p.effectiveOrigin?.toLowerCase().includes(q))
    || (p.effectiveCaliber?.toLowerCase().includes(q))
  )
})
const nbWithLegal = computed(() => products.value.filter(p => p.hasLegal).length)
const nbInherited = computed(() => products.value.filter(p => p.hasInheritance).length)

const previewOrigin = computed(() => editForm.value.originIso2 || inheritedHint.value.origin || null)
const previewCaliber = computed(() => editForm.value.caliber || inheritedHint.value.caliber || null)

function sourceBadge(src: 'product' | 'lot'): string {
  return src === 'product'
    ? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
    : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; products: ProductLegal[] }>('/api/bo/legal-labels')
    products.value = res.products || []
  } catch (e) {
    console.error('legal-labels load failed', e)
    products.value = []
  } finally {
    loading.value = false
  }
}

function openEdit(p: ProductLegal) {
  editError.value = ''
  editForm.value = {
    idProduct: p.idProduct,
    productName: p.productName,
    originIso2: p.originIso2 || '',
    caliber: p.caliber || '',
    categoryLegal: p.categoryLegal || '',
    additionalMentions: p.additionalMentions || '',
  }
  inheritedHint.value = {
    origin: p.inheritedOrigin || null,
    caliber: p.inheritedCaliber || null,
  }
  editModalOpen.value = true
}

async function submitEdit() {
  saving.value = true
  editError.value = ''
  try {
    await $fetch('/api/bo/legal-labels/upsert', {
      method: 'POST',
      body: {
        idProduct: editForm.value.idProduct,
        idLang: 1,
        originIso2: (editForm.value.originIso2 || '').toUpperCase() || null,
        caliber: editForm.value.caliber || null,
        categoryLegal: editForm.value.categoryLegal || null,
        additionalMentions: editForm.value.additionalMentions || null,
        active: 1,
      },
    })
    editModalOpen.value = false
    await load()
  } catch (e: any) {
    editError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    saving.value = false
  }
}

async function deleteLegal(p: ProductLegal) {
  if (!p.id) return
  if (!confirm(`Vider les mentions de "${p.productName}" ? (l'héritage lot reprendra la main)`)) return
  try {
    await $fetch(`/api/bo/legal-labels/${p.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(load)
</script>
