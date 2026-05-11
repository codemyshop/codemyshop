
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const { t } = useHubT()

type TabId = 'entreprise' | 'preferences' | 'systeme' | 'sauvegardes'
const activeTab = ref<TabId>('entreprise')
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'entreprise', label: t('hub.tab_entreprise', 'Entreprise') },
  { id: 'preferences', label: t('hub.tab_preferences', 'Préférences') },
  { id: 'systeme', label: t('hub.tab_systeme', 'Système') },
  { id: 'sauvegardes', label: t('hub.tab_sauvegardes', 'Sauvegardes') },
]

interface ShopInfo {
  PS_SHOP_NAME: string
  PS_SHOP_SIRET: string
  PS_SHOP_SIREN: string
  PS_SHOP_PHONE: string
  PS_SHOP_EMAIL: string
  PS_SHOP_ADDR1: string
  PS_SHOP_ADDR2: string
  PS_SHOP_CODE: string
  PS_SHOP_CITY: string
  PS_SHOP_COUNTRY_ID: string
  PS_AC_TENANT_AUDIENCE: string
}

const { data: infoData, refresh: refreshInfo } = await useFetch<{ info: ShopInfo }>('/api/hub/configuration/shop-info', {
  key: 'hub-configuration-shop-info',
})

const form = reactive<ShopInfo>({
  PS_SHOP_NAME: '',
  PS_SHOP_SIRET: '',
  PS_SHOP_SIREN: '',
  PS_SHOP_PHONE: '',
  PS_SHOP_EMAIL: '',
  PS_SHOP_ADDR1: '',
  PS_SHOP_ADDR2: '',
  PS_SHOP_CODE: '',
  PS_SHOP_CITY: '',
  PS_SHOP_COUNTRY_ID: '',
  PS_AC_TENANT_AUDIENCE: '',
})

watchEffect(() => {
  const info = infoData.value?.info
  if (!info) return
  Object.assign(form, info)
})

const savingField = ref<keyof ShopInfo | null>(null)
const savingAll = ref<boolean>(false)
const savedMessage = ref<string>('')
const errorMessage = ref<string>('')

async function saveField(key: keyof ShopInfo) {
  savingField.value = key
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    await $fetch('/api/hub/configuration/shop-info', {
      method: 'POST',
      body: { name: key, value: form[key] },
    })
    savedMessage.value = t('hub.field_saved', 'Champ enregistré')
    setTimeout(() => { savedMessage.value = '' }, 2000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? 'Erreur'
    await refreshInfo()
  } finally {
    savingField.value = null
  }
}

async function saveAll() {
  savingAll.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  
  
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  try {
    for (const key of Object.keys(form) as (keyof ShopInfo)[]) {
      await $fetch('/api/hub/configuration/shop-info', {
        method: 'POST',
        body: { name: key, value: form[key] },
      })
    }
    savedMessage.value = t('hub.all_saved', 'Tous les champs enregistrés')
    setTimeout(() => { savedMessage.value = '' }, 2500)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? 'Erreur'
    await refreshInfo()
  } finally {
    savingAll.value = false
  }
}

interface Flags {
  PS_B2B_ENABLE: string
  PS_B2B_HIDE_PRICES: string
  PS_CATALOG_MODE: string
  PS_GUEST_CHECKOUT_ENABLED: string
  PS_ORDER_RETURN: string
}

const { data: flagsData, refresh: refreshFlags } = await useFetch<{ flags: Flags }>('/api/hub/configuration/flags', {
  key: 'hub-configuration-flags',
})

const flags = computed(() => flagsData.value?.flags)
const savingFlag = ref<string | null>(null)

function isEnabled(key: keyof Flags): boolean {
  return flags.value?.[key] === '1'
}

async function toggle(key: keyof Flags) {
  savingFlag.value = key
  savedMessage.value = ''
  errorMessage.value = ''
  const newValue = isEnabled(key) ? '0' : '1'
  try {
    await $fetch('/api/hub/configuration/flags', {
      method: 'POST',
      body: { name: key, value: newValue },
    })
    await refreshFlags()
    savedMessage.value = t('hub.flag_saved', 'Réglage enregistré')
    setTimeout(() => { savedMessage.value = '' }, 2000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? 'Erreur'
  } finally {
    savingFlag.value = null
  }
}

const VERTICALS = [
  { value: 'food',        label: 'Food' },
  { value: 'beauty',      label: 'Beauty' },
  { value: 'vape',        label: 'Vape' },
  { value: 'fashion',     label: 'Fashion' },
  { value: 'services',    label: 'Services' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'generic',     label: 'Generic' },
] as const
const CHANNELS = [
  { value: 'pure-online', label: 'Pure online' },
  { value: 'phygital',    label: 'Phygital (magasin + web)' },
  { value: 'b2b-only',    label: 'B2B only' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'mix',         label: 'Mix' },
] as const

const { data: profileData, refresh: refreshProfile } = await useFetch<{ vertical: string; channel: string }>('/api/hub/configuration/business-profile', {
  key: 'hub-configuration-business-profile',
})
const businessProfile = reactive({ vertical: 'generic', channel: 'pure-online' })
watchEffect(() => {
  if (!profileData.value) return
  businessProfile.vertical = profileData.value.vertical || 'generic'
  businessProfile.channel = profileData.value.channel || 'pure-online'
})

const savingProfile = ref<'vertical' | 'channel' | null>(null)

async function saveProfile(field: 'vertical' | 'channel') {
  savingProfile.value = field
  savedMessage.value = ''
  errorMessage.value = ''
  const name = field === 'vertical' ? 'PS_AC_TENANT_VERTICAL' : 'PS_AC_TENANT_CHANNEL'
  try {
    await $fetch('/api/hub/configuration/business-profile', {
      method: 'POST',
      body: { name, value: businessProfile[field] },
    })
    savedMessage.value = t('hub.field_saved', 'Champ enregistré')
    setTimeout(() => { savedMessage.value = '' }, 2000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? 'Erreur'
    await refreshProfile()
  } finally {
    savingProfile.value = null
  }
}

interface SystemInfo {
  os: { name: string; kernel: string; type: string; arch: string }
  runtime: { node: string; nuxt: string }
  stack: { postgresql: string; pgvector: string; redis: string; nginx: string; docker: string }
  server: { hostname: string; publicIp: string; uptimeSec: number }
  cpu: { model: string; cores: number; loadAvg1: number; loadAvg5: number; loadAvg15: number }
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number }
  disk: { totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number; mountpoint: string }
}

const { data: systemData, pending: systemPending, refresh: refreshSystem } = await useFetch<{ info: SystemInfo }>('/api/hub/system/info', {
  key: 'hub-system-info',
  lazy: true,
  default: () => ({ info: null as unknown as SystemInfo }),
})

interface AssetValueComponents {
  codeValue: number
  catalogValue: number
  activeSkus: number
  customersValue: number
  activeCustomers12m: number
  dormantContacts: number
  seoValue: number
  gscClicks12m: number
  hasGsc: boolean
}
interface AssetValueResp {
  total: number
  components: AssetValueComponents
  params: {
    codeBase: number
    catalogPerSku: number
    activeCustomerValue: number
    dormantContactValue: number
    cpcEur: number
    seoMultiplier: number
    noSeoFallback: number
  }
}

const { data: valueData, pending: valuePending, refresh: refreshValue } = await useFetch<AssetValueResp>('/api/hub/system/asset-value', {
  key: 'hub-system-asset-value',
  lazy: true,
  default: () => null as unknown as AssetValueResp,
})

function formatEur(n: number, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(n) + ' €'
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-FR').format(n)
}

function formatUptime(sec: number): string {
  if (!sec) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const parts = []
  if (d) parts.push(`${d}j`)
  if (h) parts.push(`${h}h`)
  if (m && !d) parts.push(`${m}min`)
  return parts.join(' ') || `${sec}s`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const decimals = value >= 100 || i <= 1 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[i]}`
}

function usageColor(pct: number): string {
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

interface BackupObject {
  key: string
  date: string
  size: number
  lastModified: string
}
interface BackupsResp {
  tenant: string
  bucket: string
  count: number
  objects: BackupObject[]
}

const { data: backupsData, pending: backupsPending, error: backupsError, refresh: refreshBackups } = await useFetch<BackupsResp>('/api/hub/backups/list', {
  key: 'hub-backups-list',
  lazy: true,
  default: () => ({ tenant: '', bucket: '', count: 0, objects: [] }),
})

function formatDateFr(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function downloadBackup(date: string) {
  
  window.location.href = `/api/hub/backups/download?date=${encodeURIComponent(date)}`
}

useHead({ title: `Informations — Hub` })
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('hub.informations_title', 'Informations') }}</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          {{ t('hub.informations_subtitle', 'Identité légale et réglages métier du tenant. Les changements sont immédiats (pas de redeploy).') }}
        </p>
      </div>
      <button
        type="button"
        :disabled="savingAll"
        class="shrink-0 text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        @click="saveAll"
      >
        {{ savingAll ? t('hub.saving', 'Enregistrement…') : t('hub.save_all', 'Enregistrer') }}
      </button>
    </div>

    
    <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm mb-6">
      <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="[
            'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-200 dark:hover:border-slate-700'
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    
    <div v-if="savedMessage" class="mb-4 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
      {{ savedMessage }}
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
      {{ errorMessage }}
    </div>

    
    
    
    <div v-show="activeTab === 'entreprise'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_identity_title', 'Identité légale') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_identity_subtitle', 'Dénomination sociale, numéros d\'immatriculation et coordonnées. Utilisés dans les factures, emails et mentions légales.') }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_shop_name', 'Dénomination sociale') }}
            </label>
            <input
              v-model="form.PS_SHOP_NAME"
              type="text"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_NAME'"
              @blur="saveField('PS_SHOP_NAME')"
            >
          </div>

          
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              SIRET
              <span class="text-gray-400 font-normal">· 14 chiffres</span>
            </label>
            <input
              v-model="form.PS_SHOP_SIRET"
              type="text"
              inputmode="numeric"
              maxlength="14"
              placeholder="12345678900014"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_SIRET'"
              @blur="saveField('PS_SHOP_SIRET')"
            >
          </div>

          
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              SIREN
              <span class="text-gray-400 font-normal">· 9 chiffres</span>
            </label>
            <input
              v-model="form.PS_SHOP_SIREN"
              type="text"
              inputmode="numeric"
              maxlength="9"
              placeholder="123456789"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_SIREN'"
              @blur="saveField('PS_SHOP_SIREN')"
            >
          </div>

          
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_phone', 'Téléphone') }}
            </label>
            <input
              v-model="form.PS_SHOP_PHONE"
              type="tel"
              placeholder="+33 1 23 45 67 89"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_PHONE'"
              @blur="saveField('PS_SHOP_PHONE')"
            >
          </div>

          
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_email', 'Email') }}
            </label>
            <input
              v-model="form.PS_SHOP_EMAIL"
              type="email"
              placeholder="contact@exemple.fr"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_EMAIL'"
              @blur="saveField('PS_SHOP_EMAIL')"
            >
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_address_title', 'Adresse') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_address_subtitle', 'Siège social. Affiché en pied de page et sur les factures.') }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-3">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_addr1', 'Adresse') }}
            </label>
            <input
              v-model="form.PS_SHOP_ADDR1"
              type="text"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_ADDR1'"
              @blur="saveField('PS_SHOP_ADDR1')"
            >
          </div>

          <div class="md:col-span-3">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_addr2', 'Complément d\'adresse') }}
            </label>
            <input
              v-model="form.PS_SHOP_ADDR2"
              type="text"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_ADDR2'"
              @blur="saveField('PS_SHOP_ADDR2')"
            >
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_code', 'Code postal') }}
            </label>
            <input
              v-model="form.PS_SHOP_CODE"
              type="text"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_CODE'"
              @blur="saveField('PS_SHOP_CODE')"
            >
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_city', 'Ville') }}
            </label>
            <input
              v-model="form.PS_SHOP_CITY"
              type="text"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="savingField === 'PS_SHOP_CITY'"
              @blur="saveField('PS_SHOP_CITY')"
            >
          </div>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.entreprise_note', 'Source : ps_configuration (DB tenant PostgreSQL, schéma cs_main). Les champs sont sauvegardés individuellement à la sortie du champ.') }}
      </p>
    </div>

    
    
    
    <div v-show="activeTab === 'preferences'" class="space-y-6">
      
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_business_title', 'Profil business') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_business_subtitle', 'Deux axes orthogonaux qui pilotent les comportements PIM, BI et UI du tenant : le vertical métier (lots/DLC pour food, etc.) et le modèle de distribution (multi-magasin pour phygital, etc.).') }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_vertical', 'Vertical métier') }}
            </label>
            <select
              v-model="businessProfile.vertical"
              :disabled="savingProfile === 'vertical'"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              @change="saveProfile('vertical')"
            >
              <option v-for="v in VERTICALS" :key="v.value" :value="v.value">{{ v.label }}</option>
            </select>
            <p class="mt-1.5 text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
              {{ t('hub.field_vertical_hint', 'Food → prix HT/K ou HT/U dans le PIM, lots/DLC, fiches INCO. Vape → tabacologie/CRD. Generic → pas de spécialisation.') }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_channel', 'Modèle de distribution') }}
            </label>
            <select
              v-model="businessProfile.channel"
              :disabled="savingProfile === 'channel'"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              @change="saveProfile('channel')"
            >
              <option v-for="c in CHANNELS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <p class="mt-1.5 text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
              {{ t('hub.field_channel_hint', 'Phygital → multi-warehouse, click-and-collect, sélecteur de magasin. B2B-only → catalogue restreint à des comptes pros.') }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
          {{ t('hub.field_business_storage', 'Stocké dans ps_configuration (PS_AC_TENANT_VERTICAL, PS_AC_TENANT_CHANNEL). Lu par useTenantProfile() côté Vue et getTenantProfile(event) côté API.') }}
        </p>
      </section>

      
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_audience_title', 'Audience IA') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {{ t('hub.section_audience_subtitle', 'Brief audience injecté en tête de tous les prompts IA (catégories, produits, blog). Décris qui sont les acheteurs, ce qui est attendu, ce qui est exclu — un site B2B exclusif ne doit pas générer de contenu pensé pour des particuliers.') }}
        </p>

        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
            {{ t('hub.field_audience', 'Brief audience cible') }}
            <span class="text-gray-400 font-normal">· {{ form.PS_AC_TENANT_AUDIENCE.length }}/2000</span>
          </label>
          <textarea
            v-model="form.PS_AC_TENANT_AUDIENCE"
            rows="6"
            maxlength="2000"
            :placeholder="t('hub.field_audience_placeholder', 'Ex : Site B2B exclusif réservé aux professionnels avec SIRET (CHR, restaurateurs, épiceries fines, traiteurs). Conditionnement minimum 5 kg, livraison palette/franco. NE PAS rédiger pour des particuliers ou des achats domestiques. Ton expert, factuel, vocabulaire métier (HACCP, sourcing, lots, DLUO).')"
            class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
            :disabled="savingField === 'PS_AC_TENANT_AUDIENCE'"
            @blur="saveField('PS_AC_TENANT_AUDIENCE')"
          />
          <p class="mt-2 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
            {{ t('hub.field_audience_hint', 'Stocké dans ps_configuration.PS_AC_TENANT_AUDIENCE. Lu par /api/hub/tenant-brief et préfixé à chaque prompt Centaure (contenu, SEO, FAQ).') }}
          </p>
        </div>
      </section>

      
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_b2b_title', 'Mode B2B') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_b2b_subtitle', 'Active les fonctions professionnelles : champs entreprise (SIRET, VAT), encours client, prix HT.') }}
        </p>

        <div class="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-800">
          <div class="flex-1 pr-6">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">PS_B2B_ENABLE</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ t('hub.flag_b2b_desc', "Mode B2B global. Si activé : inscription SIRET/VAT, outstanding, prix HT par défaut. Lu par Nuxt (masquage prix visiteurs) et par tous les modules PS.") }}
            </p>
          </div>
          <button
            :disabled="savingFlag === 'PS_B2B_ENABLE'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="isEnabled('PS_B2B_ENABLE') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            @click="toggle('PS_B2B_ENABLE')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="isEnabled('PS_B2B_ENABLE') ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div class="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-800">
          <div class="flex-1 pr-6">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">PS_B2B_HIDE_PRICES</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ t('hub.flag_hide_prices_desc', 'Masque les prix aux visiteurs non connectés (B2B strict). Requiert PS_B2B_ENABLE.') }}
            </p>
          </div>
          <button
            :disabled="savingFlag === 'PS_B2B_HIDE_PRICES'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="isEnabled('PS_B2B_HIDE_PRICES') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            @click="toggle('PS_B2B_HIDE_PRICES')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="isEnabled('PS_B2B_HIDE_PRICES') ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div class="flex items-center justify-between py-4">
          <div class="flex-1 pr-6">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">PS_CATALOG_MODE</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ t('hub.flag_catalog_mode_desc', 'Mode vitrine pur : masque boutons panier + ajout produit (catalogue consultable uniquement). Utile pour lancement sans e-commerce.') }}
            </p>
          </div>
          <button
            :disabled="savingFlag === 'PS_CATALOG_MODE'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="isEnabled('PS_CATALOG_MODE') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            @click="toggle('PS_CATALOG_MODE')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="isEnabled('PS_CATALOG_MODE') ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </section>

      
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_order_title', 'Commande') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_order_subtitle', 'Comportement du checkout et après-vente.') }}
        </p>

        <div class="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-800">
          <div class="flex-1 pr-6">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">PS_GUEST_CHECKOUT_ENABLED</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ t('hub.flag_guest_checkout_desc', 'Autorise la commande sans création de compte (checkout invité).') }}
            </p>
          </div>
          <button
            :disabled="savingFlag === 'PS_GUEST_CHECKOUT_ENABLED'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="isEnabled('PS_GUEST_CHECKOUT_ENABLED') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            @click="toggle('PS_GUEST_CHECKOUT_ENABLED')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="isEnabled('PS_GUEST_CHECKOUT_ENABLED') ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <div class="flex items-center justify-between py-4">
          <div class="flex-1 pr-6">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">PS_ORDER_RETURN</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ t('hub.flag_order_return_desc', 'Autorise les retours de marchandise (client peut créer un RMA depuis mon compte).') }}
            </p>
          </div>
          <button
            :disabled="savingFlag === 'PS_ORDER_RETURN'"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="isEnabled('PS_ORDER_RETURN') ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            @click="toggle('PS_ORDER_RETURN')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="isEnabled('PS_ORDER_RETURN') ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.flag_note', 'Source de vérité : ps_configuration (DB tenant PostgreSQL). Tous les modules lisent les mêmes clés. Les changements sont appliqués immédiatement, sans redeploy.') }}
      </p>
    </div>

    
    
    
    <div v-show="activeTab === 'systeme'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_stack_title', 'Briques open source') }}</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400">
              {{ t('hub.section_stack_subtitle', 'Versions installées sur ce serveur. Vue globale pour suivre les mises à jour.') }}
            </p>
          </div>
          <button
            type="button"
            :disabled="systemPending"
            class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
            @click="refreshSystem()"
          >
            {{ systemPending ? '…' : t('hub.refresh', 'Rafraîchir') }}
          </button>
        </div>

        <div v-if="systemPending && !systemData?.info" class="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
          {{ t('hub.loading', 'Chargement…') }}
        </div>

        <dl v-else-if="systemData?.info" class="divide-y divide-gray-100 dark:divide-slate-800">
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
              PostgreSQL
              <span class="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">DB tenant — runtime unique</span>
            </dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.stack.postgresql || '—' }}</dd>
          </div>
          <div v-if="systemData.info.stack.pgvector" class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
              pgvector
              <span class="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">extension PG — recherche sémantique</span>
            </dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.stack.pgvector }}</dd>
          </div>
          <div v-if="systemData.info.stack.redis" class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
              Redis
              <span class="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">cache HTTP + sessions Nuxt</span>
            </dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.stack.redis }}</dd>
          </div>
          <div v-if="systemData.info.stack.nginx" class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
              Nginx
              <span class="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">reverse proxy</span>
            </dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.stack.nginx }}</dd>
          </div>
          <div v-if="systemData.info.stack.docker" class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
              Docker
              <span class="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">runtime conteneurs</span>
            </dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.stack.docker }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">Nuxt</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.runtime.nuxt || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">Node.js</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.runtime.node || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_os', 'Système d\'exploitation') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.os.name || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_kernel', 'Noyau') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.os.kernel || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_arch', 'Architecture') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.os.arch || '—' }}</dd>
          </div>
        </dl>
      </section>

      
      <section v-if="systemData?.info" class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_resources_title', 'Ressources') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_resources_subtitle', 'Consommation live du VPS : disque, mémoire et charge CPU. Rafraîchi à la demande.') }}
        </p>

        <div class="space-y-5">
          
          <div>
            <div class="flex items-baseline justify-between mb-1.5">
              <div class="text-sm font-medium text-gray-700 dark:text-slate-200">
                {{ t('hub.field_disk', 'Disque') }}
                <span class="ml-1.5 text-xs font-mono text-gray-400 dark:text-slate-500">{{ systemData.info.disk.mountpoint }}</span>
              </div>
              <div class="text-xs font-mono text-gray-600 dark:text-slate-300">
                {{ formatBytes(systemData.info.disk.usedBytes) }} / {{ formatBytes(systemData.info.disk.totalBytes) }}
                <span class="ml-1 text-gray-400 dark:text-slate-500">({{ systemData.info.disk.usedPct }} %)</span>
              </div>
            </div>
            <div class="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <div :class="['h-full transition-all', usageColor(systemData.info.disk.usedPct)]" :style="{ width: `${Math.min(systemData.info.disk.usedPct, 100)}%` }" />
            </div>
            <div class="mt-1 text-xs text-gray-400 dark:text-slate-500">
              {{ t('hub.field_disk_free', 'Libre') }} : {{ formatBytes(systemData.info.disk.freeBytes) }}
            </div>
          </div>

          
          <div>
            <div class="flex items-baseline justify-between mb-1.5">
              <div class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_memory', 'Mémoire (RAM)') }}</div>
              <div class="text-xs font-mono text-gray-600 dark:text-slate-300">
                {{ formatBytes(systemData.info.memory.usedBytes) }} / {{ formatBytes(systemData.info.memory.totalBytes) }}
                <span class="ml-1 text-gray-400 dark:text-slate-500">({{ systemData.info.memory.usedPct }} %)</span>
              </div>
            </div>
            <div class="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <div :class="['h-full transition-all', usageColor(systemData.info.memory.usedPct)]" :style="{ width: `${Math.min(systemData.info.memory.usedPct, 100)}%` }" />
            </div>
            <div class="mt-1 text-xs text-gray-400 dark:text-slate-500">
              {{ t('hub.field_memory_free', 'Libre') }} : {{ formatBytes(systemData.info.memory.freeBytes) }}
            </div>
          </div>

          
          <div class="pt-2 border-t border-gray-100 dark:border-slate-800">
            <dl class="divide-y divide-gray-100 dark:divide-slate-800">
              <div class="flex items-center justify-between py-3">
                <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_cpu_model', 'CPU') }}</dt>
                <dd class="text-sm font-mono text-gray-900 dark:text-slate-100 text-right max-w-[60%] truncate" :title="systemData.info.cpu.model">
                  {{ systemData.info.cpu.model || '—' }}
                </dd>
              </div>
              <div class="flex items-center justify-between py-3">
                <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_cpu_cores', 'Cœurs') }}</dt>
                <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.cpu.cores || '—' }}</dd>
              </div>
              <div class="flex items-center justify-between py-3">
                <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {{ t('hub.field_load_avg', 'Charge moyenne') }}
                  <span class="ml-1 text-xs font-normal text-gray-400 dark:text-slate-500">1 / 5 / 15 min</span>
                </dt>
                <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">
                  {{ systemData.info.cpu.loadAvg1.toFixed(2) }}
                  <span class="text-gray-400 dark:text-slate-500">·</span>
                  {{ systemData.info.cpu.loadAvg5.toFixed(2) }}
                  <span class="text-gray-400 dark:text-slate-500">·</span>
                  {{ systemData.info.cpu.loadAvg15.toFixed(2) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_server_title', 'Serveur') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {{ t('hub.section_server_subtitle', 'Identification réseau du VPS qui fait tourner ce tenant.') }}
        </p>

        <dl v-if="systemData?.info" class="divide-y divide-gray-100 dark:divide-slate-800">
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_public_ip', 'IP publique') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.server.publicIp || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_hostname', 'Hostname') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ systemData.info.server.hostname || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ t('hub.field_uptime', 'Uptime') }}</dt>
            <dd class="text-sm font-mono text-gray-900 dark:text-slate-100">{{ formatUptime(systemData.info.server.uptimeSec) }}</dd>
          </div>
        </dl>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.system_note', 'Lecture directe node:os (CPU, RAM, uptime) + node:fs.statfs (disque rootfs) + SELECT VERSION() PostgreSQL + extensions (pgvector). Aucun secret ni donnée privée exposée.') }}
      </p>

      
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_value_title', 'Valeur du site à la revente') }}</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400">
              {{ t('hub.section_value_subtitle', 'Estimation fourchette basse de l\'asset numérique seul (code, catalogue, base clients, SEO) — hors fonds de commerce, marque, contrats et stock.') }}
            </p>
          </div>
          <button
            type="button"
            :disabled="valuePending"
            class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
            @click="refreshValue()"
          >
            {{ valuePending ? '…' : t('hub.refresh', 'Rafraîchir') }}
          </button>
        </div>

        <div v-if="valuePending && !valueData" class="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
          {{ t('hub.loading', 'Chargement…') }}
        </div>

        <template v-else-if="valueData">
          
          <div class="rounded-xl border-2 border-primary-300 dark:border-primary-600/60 bg-primary-50 dark:bg-primary-900/20 p-6 text-center mb-6">
            <div class="text-xs uppercase tracking-wider font-semibold text-primary-600 dark:text-primary-300 mb-2">
              {{ t('hub.value_total', 'Valeur estimée — fourchette basse') }}
            </div>
            <div class="text-4xl font-extrabold text-primary-700 dark:text-primary-200 tabular-nums">
              {{ formatEur(valueData.total, { compact: true }) }}
            </div>
            <div class="text-[11px] text-primary-500 dark:text-primary-400 mt-2">
              {{ formatEur(valueData.total) }}
            </div>
          </div>

          
          <dl class="divide-y divide-gray-100 dark:divide-slate-800">
            <div class="flex items-center justify-between py-3">
              <div class="flex-1">
                <dt class="text-sm font-medium text-gray-800 dark:text-slate-200">{{ t('hub.value_code', 'Code & stack technique') }}</dt>
                <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                  {{ t('hub.value_code_detail', 'Forfait stack moderne Nuxt 4 + PostgreSQL + pgvector + features custom (B2B, paiement, recherche hybride, BO).') }}
                </p>
              </div>
              <dd class="text-sm font-mono font-semibold text-gray-900 dark:text-slate-100 tabular-nums whitespace-nowrap pl-4">
                {{ formatEur(valueData.components.codeValue) }}
              </dd>
            </div>

            <div class="flex items-center justify-between py-3">
              <div class="flex-1">
                <dt class="text-sm font-medium text-gray-800 dark:text-slate-200">{{ t('hub.value_catalog', 'Catalogue produits (MDM)') }}</dt>
                <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                  {{ formatInt(valueData.components.activeSkus) }} {{ t('hub.value_skus', 'SKUs actifs') }}
                  · {{ valueData.params.catalogPerSku }} €/SKU ({{ t('hub.value_catalog_detail', 'fiches structurées + photos + embeddings sémantiques') }})
                </p>
              </div>
              <dd class="text-sm font-mono font-semibold text-gray-900 dark:text-slate-100 tabular-nums whitespace-nowrap pl-4">
                {{ formatEur(valueData.components.catalogValue) }}
              </dd>
            </div>

            <div class="flex items-center justify-between py-3">
              <div class="flex-1">
                <dt class="text-sm font-medium text-gray-800 dark:text-slate-200">{{ t('hub.value_customers', 'Base clients (CRM)') }}</dt>
                <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                  {{ formatInt(valueData.components.activeCustomers12m) }} {{ t('hub.value_customers_active', 'actifs 12m') }} ({{ valueData.params.activeCustomerValue }} €/contact)
                  · {{ formatInt(valueData.components.dormantContacts) }} {{ t('hub.value_customers_dormant', 'dormants') }} ({{ valueData.params.dormantContactValue }} €/contact)
                </p>
              </div>
              <dd class="text-sm font-mono font-semibold text-gray-900 dark:text-slate-100 tabular-nums whitespace-nowrap pl-4">
                {{ formatEur(valueData.components.customersValue) }}
              </dd>
            </div>

            <div class="flex items-center justify-between py-3">
              <div class="flex-1">
                <dt class="text-sm font-medium text-gray-800 dark:text-slate-200">{{ t('hub.value_seo', 'Trafic organique (SEO)') }}</dt>
                <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                  <template v-if="valueData.components.hasGsc">
                    {{ formatInt(valueData.components.gscClicks12m) }} {{ t('hub.value_seo_clicks', 'clics 12m Search Console') }}
                    · {{ valueData.params.cpcEur.toFixed(2) }} €/clic × {{ valueData.params.seoMultiplier }}× ({{ t('hub.value_seo_detail', 'décote conservatrice') }})
                  </template>
                  <template v-else>
                    {{ t('hub.value_seo_no_gsc', 'Forfait antériorité de domaine — Google Search Console non configuré pour ce tenant.') }}
                  </template>
                </p>
              </div>
              <dd class="text-sm font-mono font-semibold text-gray-900 dark:text-slate-100 tabular-nums whitespace-nowrap pl-4">
                {{ formatEur(valueData.components.seoValue) }}
              </dd>
            </div>
          </dl>

          <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            {{ t('hub.value_disclaimer', 'Fourchette basse, défendable face à un acquéreur d\'asset numérique pur. Le périmètre exclut volontairement la marque, les contrats fournisseurs, le stock, l\'équipe et le fonds de roulement — qui restent chez le dirigeant. Tous les paramètres sont overridables via ps_configuration (AC_VALUATION_*).') }}
          </p>
        </template>
      </section>
    </div>

    
    
    
    <div v-show="activeTab === 'sauvegardes'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ t('hub.section_backups_title', 'Sauvegardes DB') }}</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400">
              {{ t('hub.section_backups_subtitle', 'Dump quotidien de la base de ce tenant sur Scaleway Object Storage (Paris, chiffré, rotation 10 jours automatique). Cliquer une date pour télécharger le dump compressé.') }}
            </p>
          </div>
          <button
            type="button"
            :disabled="backupsPending"
            class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
            @click="refreshBackups()"
          >
            {{ backupsPending ? '…' : t('hub.refresh', 'Rafraîchir') }}
          </button>
        </div>

        
        <div v-if="backupsError" class="px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          {{ backupsError.data?.message ?? backupsError.message ?? 'Erreur chargement sauvegardes' }}
        </div>

        
        <div v-else-if="backupsPending && !backupsData?.count" class="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
          {{ t('hub.loading', 'Chargement…') }}
        </div>

        
        <div v-else-if="!backupsData?.count" class="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
          {{ t('hub.backups_empty', 'Aucune sauvegarde disponible pour ce tenant. Le cron tourne chaque nuit à 03:00 UTC.') }}
        </div>

        
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
              <th class="pb-2 font-medium">{{ t('hub.backup_date', 'Date') }}</th>
              <th class="pb-2 font-medium">{{ t('hub.backup_created', 'Créé le') }}</th>
              <th class="pb-2 font-medium text-right">{{ t('hub.backup_size', 'Taille') }}</th>
              <th class="pb-2 font-medium text-right">{{ t('hub.backup_download', 'Télécharger') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
            <tr v-for="o in backupsData.objects" :key="o.key" class="hover:bg-gray-50 dark:hover:bg-slate-800/50">
              <td class="py-3 font-mono text-gray-900 dark:text-slate-100">{{ o.date || '—' }}</td>
              <td class="py-3 text-gray-500 dark:text-slate-400">{{ formatDateFr(o.lastModified) }}</td>
              <td class="py-3 text-right font-mono text-gray-600 dark:text-slate-300">{{ formatBytes(o.size) }}</td>
              <td class="py-3 text-right">
                <button
                  type="button"
                  :disabled="!o.date"
                  class="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  @click="downloadBackup(o.date)"
                >
                  ⬇ .sql.gz
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.backups_note', 'Source : bucket Scaleway ac-db-backups (Paris, SSE-ONE). Chaque tenant ne voit que ses propres sauvegardes. Le lien de téléchargement est signé et expire après 5 minutes — il ne faut pas le partager. Restauration : bin/restore-db-from-s3.sh côté ops.') }}
      </p>
    </div>
  </div>
</template>
