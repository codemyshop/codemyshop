<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Combinaisons</h2>
        <p class="text-[11px] text-gray-400 mt-0.5">Croise les attributs pour générer les variantes de produit.</p>
      </div>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">
        {{ loading ? 'Chargement…' : groups.length ? `${groups.length} groupe(s)` : 'Aucun groupe' }}
      </span>
    </div>

    
    <div v-if="loading" class="py-8 text-center text-xs text-gray-400">
      Chargement des attributs…
    </div>

    
    <div
      v-else-if="!groups.length"
      class="py-8 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-950/40"
    >
      <p class="text-sm text-gray-500">Aucun groupe d'attribut dans le catalogue.</p>
      <p class="text-[11px] text-gray-400 mt-1">
        Créez des attributs dans PrestaShop (Catalogue → Attributs &amp; caractéristiques) pour activer le générateur.
      </p>
    </div>

    
    <div
      v-else
      class="grid gap-4"
      :class="groups.length === 1 ? 'grid-cols-1' : groups.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'"
    >
      <div
        v-for="group in groups"
        :key="group.id"
        class="border border-gray-100 dark:border-slate-800 rounded-lg p-4 bg-gray-50/50 dark:bg-slate-950/40"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">{{ group.name }}</h3>
          <span class="text-[10px] text-gray-400">{{ selectedCount(group.id) }}/{{ group.values.length }}</span>
        </div>
        <div v-if="group.values.length" class="space-y-2 max-h-56 overflow-y-auto">
          <label
            v-for="value in group.values"
            :key="value.id"
            class="flex items-center gap-2 text-sm cursor-pointer select-none hover:bg-white dark:hover:bg-slate-900 rounded px-2 py-1 transition-colors"
          >
            <input
              type="checkbox"
              :checked="isSelected(value.id)"
              @change="toggleValue(value.id)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span
              v-if="group.isColorGroup && value.color"
              class="inline-block w-3 h-3 rounded-full border border-gray-200"
              :style="{ backgroundColor: value.color }"
            />
            <span class="text-gray-700 dark:text-slate-200">{{ value.name }}</span>
          </label>
        </div>
        <p v-else class="text-xs text-gray-400">Aucune valeur</p>
      </div>
    </div>

    
    <div v-if="groups.length" class="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <span
          class="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
          :class="combinations.length ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="combinations.length ? 'bg-primary-500' : 'bg-gray-400'" />
          {{ combinations.length }} combinaison{{ combinations.length > 1 ? 's' : '' }} générée{{ combinations.length > 1 ? 's' : '' }}
        </span>
        <div class="flex items-center gap-3 text-[11px]">
          <span v-if="hydratedCount" class="text-gray-400">
            {{ hydratedCount }} pré-remplie{{ hydratedCount > 1 ? 's' : '' }} depuis la DB
          </span>
          <button
            v-if="combinations.length"
            type="button"
            @click="clearAll"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      <div v-if="combinations.length" class="overflow-x-auto -mx-6 px-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-slate-800">
              <th class="text-left font-semibold py-2 pr-3">Combinaison</th>
              <th class="text-left font-semibold py-2 pr-3 w-32">Référence</th>
              <th class="text-right font-semibold py-2 pr-3 w-32">Impact Prix HT</th>
              <th class="text-right font-semibold py-2 w-24">Quantité</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(combo, idx) in combinations"
              :key="combo.key"
              class="border-b border-gray-50 dark:border-slate-800/60 last:border-0"
              :class="combo.hydrated ? 'bg-primary-50/20 dark:bg-primary-950/10' : ''"
            >
              <td class="py-2 pr-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span
                    v-for="(part, i) in combo.parts"
                    :key="i"
                    class="text-[11px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 px-2 py-0.5 rounded"
                  >
                    {{ part }}
                  </span>
                  <span
                    v-if="combo.hydrated"
                    class="text-[9px] uppercase tracking-wide text-primary-600 dark:text-primary-400 ml-1"
                    title="Déclinaison existante en base"
                  >
                    ● en base
                  </span>
                </div>
              </td>
              <td class="py-2 pr-3">
                <input
                  v-model="combo.reference"
                  type="text"
                  :placeholder="`REF-${idx + 1}`"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/40"
                />
              </td>
              <td class="py-2 pr-3">
                <div class="relative">
                  <input
                    v-model.number="combo.priceImpact"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded pl-2 pr-5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-primary-500/40"
                  />
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">€</span>
                </div>
              </td>
              <td class="py-2">
                <input
                  v-model.number="combo.quantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-primary-500/40"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center py-6 text-xs text-gray-400">
        Sélectionne au moins une valeur pour générer les combinaisons.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AttributeValue {
  id: number
  name: string
  color: string | null
  position: number
}

interface AttributeGroup {
  id: number
  name: string
  publicName: string
  isColorGroup: boolean
  groupType: string
  position: number
  values: AttributeValue[]
}

interface ExistingCombination {
  id: number
  reference: string | null
  priceImpact: number
  quantity: number
  attributes: Array<{ attributeId: number; groupId: number; name: string }>
}

interface ComboState {
  id: number | null
  reference: string
  priceImpact: number
  quantity: number
  hydrated: boolean
}

interface Combination extends ComboState {
  key: string
  parts: string[]
}

const props = defineProps<{
  existingCombinations?: ExistingCombination[]
}>()

const groups = ref<AttributeGroup[]>([])
const loading = ref(true)

const selectedIds = reactive(new Set<number>())
const comboState = reactive<Record<string, ComboState>>({})

async function loadAttributes() {
  loading.value = true
  try {
    const data = await $fetch<{ groups: AttributeGroup[] }>('/api/bo/attributes')
    groups.value = data.groups || []
    hydrateFromExisting()
  } catch (err) {
    console.error('[HubProductCombinations] load attributes error:', err)
    groups.value = []
  } finally {
    loading.value = false
  }
}

function hydrateFromExisting() {
  if (!props.existingCombinations?.length || !groups.value.length) return

  
  
  const groupOrder = groups.value.map(g => g.id)

  for (const ec of props.existingCombinations) {
    if (!ec.attributes?.length) continue

    
    for (const a of ec.attributes) selectedIds.add(a.attributeId)

    
    const sorted = [...ec.attributes].sort((a, b) =>
      groupOrder.indexOf(a.groupId) - groupOrder.indexOf(b.groupId)
    )
    const key = sorted.map(a => a.attributeId).join('|')

    comboState[key] = {
      id: ec.id,
      reference: ec.reference || '',
      priceImpact: Number(ec.priceImpact) || 0,
      quantity: Number(ec.quantity) || 0,
      hydrated: true,
    }
  }
}

function isSelected(valueId: number): boolean {
  return selectedIds.has(valueId)
}

function toggleValue(valueId: number) {
  if (selectedIds.has(valueId)) selectedIds.delete(valueId)
  else selectedIds.add(valueId)
}

function selectedCount(groupId: number): number {
  const g = groups.value.find(x => x.id === groupId)
  if (!g) return 0
  return g.values.filter(v => selectedIds.has(v.id)).length
}

const combinations = computed<Combination[]>(() => {
  
  const activeGroups = groups.value
    .map(g => ({ id: g.id, values: g.values.filter(v => selectedIds.has(v.id)) }))
    .filter(g => g.values.length > 0)

  if (activeGroups.length === 0) return []

  
  let result: AttributeValue[][] = [[]]
  for (const group of activeGroups) {
    const next: AttributeValue[][] = []
    for (const acc of result) {
      for (const value of group.values) next.push([...acc, value])
    }
    result = next
  }

  return result.map(combo => {
    const key = combo.map(v => v.id).join('|')
    if (!comboState[key]) {
      comboState[key] = { id: null, reference: '', priceImpact: 0, quantity: 0, hydrated: false }
    }
    return Object.assign(comboState[key], {
      key,
      parts: combo.map(v => v.name),
    }) as Combination
  })
})

const hydratedCount = computed(() => combinations.value.filter(c => c.hydrated).length)

function clearAll() {
  selectedIds.clear()
}

watch(() => props.existingCombinations, hydrateFromExisting, { deep: false })

onMounted(loadAttributes)

defineExpose({
  getDirtyCombinations(): Array<{ id: number; priceImpact: number; quantity: number; reference: string }> {
    return Object.values(comboState)
      .filter((c): c is ComboState & { id: number } => c.id !== null && c.id !== undefined)
      .map(c => ({
        id: c.id,
        priceImpact: Number(c.priceImpact) || 0,
        quantity: Number(c.quantity) || 0,
        reference: c.reference || '',
      }))
  },
})
</script>
