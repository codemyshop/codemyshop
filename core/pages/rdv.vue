<!--
  Page publique /rdv — RDV souverain (Calendly-like).
  Layout 3 panneaux dans une carte centrée :
    1. Owner / meeting info (gauche)
    2. Calendrier mensuel (centre)
    3. Timeslots du jour sélectionné (droite, apparaît après clic date)
  Après clic sur un slot : form prospect en swap. Confirmation finale en swap.

  Marque blanche : primary-600 = couleur tenant (vert Meyva/Example Shop, vert AC, etc.).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'funnel' })

interface Slot {
  id_availability: number
  date_start: string
  duration_min: number
  notes: string | null
}

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const meetingTitle = String((cfg.public as any).appointmentTitle ?? 'Rendez-vous')
const b2bMode = !!(cfg.public as any).b2bMode
// Appointment modality (DB-first on tenant side): 'phone' / 'video' / 'both'.
// Controls icon + sidebar / confirmation / email text. Default 'both'
// (legacy behavior: video or phone).
type AppointmentMode = 'phone' | 'video' | 'both'
const appointmentMode = ((cfg.public as any).appointmentMode || 'both') as AppointmentMode
const appointmentSchedule = String((cfg.public as any).appointmentSchedule ?? '')

// i18n DB-first via ps_translation (consistent with the rest of the tenant Nuxt app).
const { t } = useHubT()

const appointmentModeLabel = computed(() => {
  if (appointmentMode === 'phone') return t('rdv.rdv_mode_phone', 'Échange téléphonique')
  if (appointmentMode === 'video') return t('rdv.rdv_mode_video', 'Visioconférence')
  return t('rdv.rdv_mode_both', 'Visio ou téléphone')
})
const appointmentModeHint = computed(() => {
  if (appointmentMode === 'phone') return t('rdv.rdv_hint_phone', 'Nous vous appellerons au numéro indiqué.')
  if (appointmentMode === 'video') return t('rdv.rdv_hint_video', 'Lien de visio envoyé par email après confirmation.')
  return t('rdv.rdv_hint_both', 'Détails par email après confirmation.')
})
const confirmationDetailLine = computed(() => {
  if (appointmentMode === 'phone') return t('rdv.rdv_confirm_phone', 'Vous allez recevoir un email de confirmation. Nous vous appellerons au numéro indiqué à l\'horaire choisi.')
  if (appointmentMode === 'video') return t('rdv.rdv_confirm_video', 'Vous allez recevoir un email de confirmation avec le lien de visio.')
  return t('rdv.rdv_confirm_both', 'Vous allez recevoir un email de confirmation. Les détails de connexion (visio ou téléphone) y figureront.')
})

const metaModalityLabel = computed(() => {
  if (appointmentMode === 'phone') return t('rdv.rdv_meta_phone', 'téléphonique')
  if (appointmentMode === 'video') return t('rdv.rdv_meta_video', 'visio')
  return t('rdv.rdv_meta_both', 'visio ou téléphone')
})
useHead({
  title: brand
    ? t('rdv.rdv_page_title', 'Prendre rendez-vous — {brand}').replace('{brand}', brand)
    : t('rdv.rdv_page_title_fallback', 'Prendre rendez-vous'),
  meta: [{
    name: 'description',
    content: brand
      ? t('rdv.rdv_meta_desc_branded', 'Réservez un créneau {modality} avec l\'équipe {brand}.')
          .replace('{modality}', metaModalityLabel.value)
          .replace('{brand}', brand)
      : t('rdv.rdv_meta_desc', 'Réservez un créneau {modality}.')
          .replace('{modality}', metaModalityLabel.value),
  }],
})

const { data, pending, error, refresh } = await useFetch<{ success: boolean; slots: Slot[] }>(
  '/api/appointment/slots',
  { default: () => ({ success: true, slots: [] }) },
)

// Appointment slot owner (left panel) — resolved on the server side from
// cs_employee_extra (first active employee with photo). Null if nothing
// configured: we fall back to the existing brand-only display.
interface Owner {
  id: number
  slug: string
  name: string
  title: string
  image: string
  linkedinUrl: string
}
const { data: ownerData } = await useFetch<{ owner: Owner | null }>('/api/appointment/owner', {
  default: () => ({ owner: null }),
})
const owner = computed(() => ownerData.value?.owner ?? null)

// ── Slots indexed by day (YYYY-MM-DD in Paris time) ────────────────────
function isoDayParis(iso: string): string {
  const d = new Date(iso)
  // Retrieve the calendar day in the Europe/Paris timezone (independent of env)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const dd = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${dd}`
}

const slotsByDay = computed<Record<string, Slot[]>>(() => {
  const groups: Record<string, Slot[]> = {}
  for (const s of (data.value?.slots ?? [])) {
    const k = isoDayParis(s.date_start)
    if (!groups[k]) groups[k] = []
    groups[k].push(s)
  }
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => a.date_start.localeCompare(b.date_start))
  }
  return groups
})

// ── Calendrier mensuel ──────────────────────────────────────────────────────
const todayISO = isoDayParis(new Date().toISOString())
const todayY = Number(todayISO.slice(0, 4))
const todayM = Number(todayISO.slice(5, 7)) - 1

const viewYear = ref(todayY)
const viewMonth = ref(todayM) // 0..11

const monthLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const dayHeaders = computed(() => [
  t('rdv.rdv_weekday_lun', 'LUN'),
  t('rdv.rdv_weekday_mar', 'MAR'),
  t('rdv.rdv_weekday_mer', 'MER'),
  t('rdv.rdv_weekday_jeu', 'JEU'),
  t('rdv.rdv_weekday_ven', 'VEN'),
  t('rdv.rdv_weekday_sam', 'SAM'),
  t('rdv.rdv_weekday_dim', 'DIM'),
])

interface Cell {
  iso: string
  dayNum: number
  isPast: boolean
  isToday: boolean
  hasSlots: boolean
}

const monthCells = computed<(Cell | null)[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7 // 0 = lundi
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (Cell | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      iso,
      dayNum: d,
      isPast: iso < todayISO,
      isToday: iso === todayISO,
      hasSlots: !!slotsByDay.value[iso]?.length,
    })
  }
  return cells
})

const canGoPrev = computed(() => {
  return viewYear.value > todayY || (viewYear.value === todayY && viewMonth.value > todayM)
})

function prevMonth() {
  if (!canGoPrev.value) return
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  }
  else {
    viewMonth.value -= 1
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  }
  else {
    viewMonth.value += 1
  }
}

// ── Date / slot / form selection ─────────────────────────────────────────────
const selectedDate = ref<string | null>(null)
const selectedSlot = ref<Slot | null>(null)
const confirmed = ref<{ date_start: string; duration_min: number } | null>(null)

const selectedDateSlots = computed<Slot[]>(() => {
  if (!selectedDate.value) return []
  return slotsByDay.value[selectedDate.value] ?? []
})

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T12:00:00`)
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

function selectDate(cell: Cell) {
  if (!cell.hasSlots || cell.isPast) return
  selectedDate.value = cell.iso
  selectedSlot.value = null
}

function selectSlot(slot: Slot) {
  selectedSlot.value = slot
  errorMsg.value = ''
}

function backToCalendar() {
  selectedSlot.value = null
  errorMsg.value = ''
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}
function fmtDateLong(iso: string): string {
  const s = new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Form submit ──────────────────────────────────────────────────────────────
const form = reactive({
  prospectName: '',
  prospectEmail: '',
  prospectPhone: '',
  prospectMessage: '',
  prospectSiret: '',
})
const submitting = ref(false)
const errorMsg = ref('')

// ── Prefilling from query string ───────────────────────────────────────────
// Signed format (preferred): `/rdv?quote=<id>&t=<hmac>` — the page fetches
// /api/rdv/prefill on the server side, which reads cs_quote_request (DB) and
// returns name/email/phone/siret. Short URL, robust against truncation and
// email client encoding issues.
//
// Legacy format (backward-compat for emails already sent): `/rdv?prospectName=…
// &prospectEmail=…&prospectPhone=…&prospectSiret=…&quoteRef=Q-N` — fragile
// (5 open params), kept as long as older emails are still in
// circulation. Remove after ~30 days of soak time.
const route = useRoute()
const q = route.query
const setIfStr = (key: keyof typeof form, raw: unknown) => {
  if (typeof raw === 'string' && raw.trim()) form[key] = raw.trim().slice(0, 500)
}

let prefilledQuoteRef = ''

// Signed format: attempt DB fetch and populate the form from the response.
// Silent error — if the HMAC is invalid or the quote is not found, the
// visitor simply sees an empty form (degraded but non-blocking UX).
const quoteId = Number(q.quote)
const rdvToken = typeof q.t === 'string' ? q.t : ''
if (Number.isFinite(quoteId) && quoteId > 0 && rdvToken) {
  try {
    const r = await $fetch<{
      success:       boolean
      quoteRef:      string
      prospectName:  string
      prospectEmail: string
      prospectPhone: string
      prospectSiret: string
    }>('/api/rdv/prefill', { query: { id: quoteId, t: rdvToken } })
    if (r?.success) {
      setIfStr('prospectName',  r.prospectName)
      setIfStr('prospectEmail', r.prospectEmail)
      setIfStr('prospectPhone', r.prospectPhone)
      setIfStr('prospectSiret', r.prospectSiret)
      prefilledQuoteRef = r.quoteRef || ''
    }
  } catch { /* lien invalide/expiré — form vide, pas d'erreur visible */ }
}

// Legacy format (backward-compat): open params. Does not override a signed
// prefill already applied — we only fill empty fields.
if (typeof q.prospectName === 'string' && !form.prospectName)  setIfStr('prospectName',  q.prospectName)
if (typeof q.prospectEmail === 'string' && !form.prospectEmail) setIfStr('prospectEmail', q.prospectEmail)
if (typeof q.prospectPhone === 'string' && !form.prospectPhone) setIfStr('prospectPhone', q.prospectPhone)
if (typeof q.prospectSiret === 'string' && !form.prospectSiret) setIfStr('prospectSiret', q.prospectSiret)

// Message: if provided, we respect it. Otherwise, if we have a quoteRef (from
// signed OR legacy format), we pre-format it ("Following quote Q-10 — …").
if (typeof q.prospectMessage === 'string' && q.prospectMessage.trim()) {
  form.prospectMessage = q.prospectMessage.trim().slice(0, 1000)
} else {
  // NB: do not name this variable `ref` — shadows the Vue composable
  // auto-imported and breaks all `ref()` calls in the file (TDZ → "ref is not
  // defined" 500 SSR).
  const quoteRef = prefilledQuoteRef
    || (typeof q.quoteRef === 'string' ? q.quoteRef.trim().slice(0, 32) : '')
  if (quoteRef) {
    // i18n via ps_translation key 'rdv.rdv_prefilled_quote_msg' with
    // substitution {quote_ref} on DB template side. Fallback to French if the key
    // has not been seeded on the tenant.
    const tpl = t('rdv.rdv_prefilled_quote_msg', `Suite au devis {quote_ref} — je souhaite un échange visio avec un commercial pour la présentation de l'offre et l'ajustement du devis.`)
    form.prospectMessage = tpl.replace('{quote_ref}', quoteRef)
  }
}
// NB: `if (form.prospectSiret) onSiretInput()` moved AFTER the declaration
// of siretDebounce/siretLookup — the function is hoisted but the `let
// siretDebounce` is in TDZ until it is initialized. Scar from
// 2026-05-06 ("Cannot access 'siretDebounce' before initialization" on
// /rdv?quote=N&t=…). Each time a prefill is added to the query string, verify
// that every side-effect call remains after the B2B declarations.

// ── B2B : enrichissement SIRET via API gouv (debounce 500ms) ─────────────────
interface SiretLookup {
  status: 'idle' | 'pending' | 'ok' | 'error'
  companyName?: string
  city?: string
  legalForm?: string
  error?: string
}
const siretLookup = reactive<SiretLookup>({ status: 'idle' })
let siretDebounce: ReturnType<typeof setTimeout> | null = null

function onSiretInput() {
  const cleaned = form.prospectSiret.replace(/\D/g, '')
  if (siretDebounce) clearTimeout(siretDebounce)
  if (cleaned.length === 0) {
    siretLookup.status = 'idle'
    return
  }
  if (cleaned.length < 14) {
    siretLookup.status = 'pending'
    return
  }
  siretLookup.status = 'pending'
  siretDebounce = setTimeout(async () => {
    try {
      const r = await $fetch<{
        valid: boolean
        companyName?: string
        city?: string
        legalForm?: string
        error?: string
      }>('/api/siret-verify', { query: { siret: cleaned } })
      if (r.valid) {
        siretLookup.status = 'ok'
        siretLookup.companyName = r.companyName
        siretLookup.city = r.city
        siretLookup.legalForm = r.legalForm
      } else {
        siretLookup.status = 'error'
        siretLookup.error = r.error || t('rdv.rdv_siret_not_found', 'SIRET introuvable')
      }
    } catch {
      siretLookup.status = 'error'
      siretLookup.error = t('rdv.rdv_siret_verify_unavailable', 'Vérification indisponible, réessayez.')
    }
  }, 500)
}

const siretValid = computed(() => siretLookup.status === 'ok')

// If SIRET is already filled (via signed OR legacy prefill) → trigger the
// INSEE lookup for immediate enrichment. Must remain AFTER the declaration
// de siretDebounce (TDZ — cf. incidents 2026-05-06).
if (form.prospectSiret) onSiretInput()

async function onSubmit() {
  if (submitting.value || !selectedSlot.value) return
  if (b2bMode && !siretValid.value) {
    errorMsg.value = t('rdv.rdv_siret_required_b2b', 'Merci de renseigner un SIRET valide.')
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ success: boolean; dateAppointment: string; durationMin: number }>(
      '/api/appointment/book',
      {
        method: 'POST',
        body: {
          idAvailability: selectedSlot.value.id_availability,
          prospectName: form.prospectName.trim(),
          prospectEmail: form.prospectEmail.trim(),
          prospectPhone: form.prospectPhone.trim(),
          prospectMessage: form.prospectMessage.trim(),
          prospectSiret: b2bMode ? form.prospectSiret.replace(/\D/g, '') : '',
        },
      },
    )
    confirmed.value = {
      date_start: res.dateAppointment,
      duration_min: res.durationMin,
    }
    selectedSlot.value = null
    selectedDate.value = null
    form.prospectName = ''
    form.prospectEmail = ''
    form.prospectPhone = ''
    form.prospectMessage = ''
    form.prospectSiret = ''
    siretLookup.status = 'idle'
  }
  catch (err: any) {
    const code = err?.statusCode || err?.data?.statusCode
    errorMsg.value = getApiErrorMessage(err, t)
    if (code === 409) {
      // Slot taken during form filling — reload
      selectedSlot.value = null
      selectedDate.value = null
      await refresh()
    }
  }
  finally {
    submitting.value = false
  }
}

// If the user navigates to a month with no slots → reset selectedDate
watch([viewYear, viewMonth], () => { selectedDate.value = null })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950 py-6 sm:py-12 flex items-center">
    <div class="w-full max-w-5xl mx-auto px-3 sm:px-4">

        <!-- ═══ CONFIRMATION ═══ -->
        <div v-if="confirmed" class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 sm:p-12 text-center">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <svg class="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('rdv.rdv_confirmed_title', 'Rendez-vous confirmé') }}</h1>
          <p class="text-gray-700 dark:text-slate-200 mb-1">
            <strong>{{ fmtDateLong(confirmed.date_start) }}</strong>
          </p>
          <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">{{ t('rdv.rdv_duration_label', 'Durée : {n} minutes').replace('{n}', String(confirmed.duration_min)) }}</p>
          <p class="text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto">
            {{ confirmationDetailLine }} {{ t('rdv.rdv_soon_farewell', 'À tout de suite —') }}
          </p>
        </div>

        <!-- ═══ CARTE PRINCIPALE ═══ -->
        <div v-else class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div class="grid grid-cols-1 md:grid-cols-12">

            <!-- ─── Panneau gauche : owner / meeting info ─── -->
            <aside class="md:col-span-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 p-6 sm:p-8">
              <div v-if="owner" class="flex items-center gap-3 mb-5">
                <img
                  v-if="owner.image"
                  :src="owner.image"
                  :alt="owner.name"
                  class="w-14 h-14 rounded-full object-cover shrink-0 shadow-sm border border-gray-100 dark:border-slate-700"
                  loading="eager"
                />
                <div class="min-w-0">
                  <div v-if="brand" class="text-xs font-medium text-gray-500 dark:text-slate-400 truncate">{{ brand }}</div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    <NuxtLink v-if="owner.slug" :to="`/auteur/${owner.slug}`" class="hover:text-primary-600 transition-colors">
                      {{ owner.name }}
                    </NuxtLink>
                    <template v-else>{{ owner.name }}</template>
                  </div>
                  <div v-if="owner.title" class="text-xs text-gray-500 dark:text-slate-400 truncate">{{ owner.title }}</div>
                </div>
              </div>
              <div v-else-if="brand" class="text-sm font-medium text-gray-500 dark:text-slate-400">{{ brand }}</div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 mb-6 leading-tight">
                {{ meetingTitle }}
              </h1>
              <ul class="space-y-3 text-sm text-gray-600 dark:text-slate-300">
                <li class="flex items-start gap-2.5">
                  <svg class="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>{{ appointmentSchedule || t('rdv.rdv_schedule_variable', 'Variable selon le créneau') }}</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <!-- Phone icon if phone-only, otherwise video icon (camera). -->
                  <svg v-if="appointmentMode === 'phone'" class="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.105a1.125 1.125 0 0 0-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <svg v-else class="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span><strong>{{ appointmentModeLabel }}</strong> — {{ appointmentModeHint }}</span>
                </li>
              </ul>

              <!-- Selected slot summary (visible when on the form) -->
              <div v-if="selectedSlot" class="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                <div class="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mb-2">{{ t('rdv.rdv_selected_slot_label', 'Créneau choisi') }}</div>
                <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ fmtDateLong(selectedSlot.date_start) }}</div>
                <div class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ t('rdv.rdv_minutes_label', '{n} minutes').replace('{n}', String(selectedSlot.duration_min)) }}</div>
                <button
                  type="button"
                  class="mt-3 text-xs font-semibold text-primary-600 hover:underline"
                  @click="backToCalendar"
                >
                  {{ t('rdv.rdv_pick_another', '← Choisir un autre horaire') }}
                </button>
              </div>
            </aside>

            <!-- ─── Panneau droit : calendrier+slots, OU form ─── -->
            <div class="md:col-span-8 p-6 sm:p-8">

              <!-- ── Erreur API au chargement ── -->
              <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
                {{ t('rdv.rdv_load_slots_error', 'Impossible de charger les créneaux. Réessayez dans quelques minutes.') }}
              </div>

              <!-- ── No slots at all over 60 days ── -->
              <div v-else-if="!pending && !Object.keys(slotsByDay).length && !selectedSlot" class="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                <p class="text-amber-800 dark:text-amber-200 font-semibold mb-1">{{ t('rdv.rdv_no_slots_title', 'Aucun créneau disponible pour le moment') }}</p>
                <p class="text-sm text-amber-700 dark:text-amber-300">
                  {{ t('rdv.rdv_no_slots_cta', 'Écrivez-nous via /contact et on vous propose un horaire.') }}
                </p>
              </div>

              <!-- ── FORM (slot selected) ── -->
              <div v-else-if="selectedSlot">
                <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{{ t('rdv.rdv_form_title', 'Vos coordonnées') }}</h2>
                <p class="text-sm text-gray-500 dark:text-slate-400 mb-5">
                  {{ appointmentMode === 'phone'
                    ? t('rdv.rdv_form_subtitle_phone', 'Pour qu\'on vous appelle au bon numéro.')
                    : appointmentMode === 'video'
                      ? t('rdv.rdv_form_subtitle_video', 'Pour recevoir le lien de visio.')
                      : t('rdv.rdv_form_subtitle_both', 'Pour recevoir les détails de connexion.') }}
                </p>

                <form class="space-y-4" @submit.prevent="onSubmit">
                  <div v-if="errorMsg" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
                    {{ errorMsg }}
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('rdv.rdv_field_fullname', 'Nom complet *') }}</label>
                    <input v-model="form.prospectName" type="text" required class="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 focus:outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('rdv.rdv_field_email', 'Email *') }}</label>
                    <input v-model="form.prospectEmail" type="email" required class="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 focus:outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                      {{ appointmentMode === 'phone' ? t('rdv.rdv_field_phone_required', 'Téléphone *') : t('rdv.rdv_field_phone_optional', 'Téléphone') }}
                    </label>
                    <input
                      v-model="form.prospectPhone"
                      type="tel"
                      :required="appointmentMode === 'phone'"
                      class="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 focus:outline-none"
                    />
                  </div>
                  <div v-if="b2bMode">
                    <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('rdv.rdv_field_siret', 'SIRET *') }}</label>
                    <input
                      v-model="form.prospectSiret"
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      maxlength="17"
                      :placeholder="t('rdv.rdv_siret_placeholder', '14 chiffres')"
                      required
                      :class="[
                        'w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:outline-none dark:bg-slate-700 dark:text-white',
                        siretLookup.status === 'ok'
                          ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-100 dark:focus:ring-emerald-900/40'
                          : siretLookup.status === 'error'
                            ? 'border-red-500 focus:border-red-600 focus:ring-red-100 dark:focus:ring-red-900/40'
                            : 'border-gray-300 dark:border-slate-600 focus:border-primary-600 focus:ring-primary-100 dark:focus:ring-primary-900/40',
                      ]"
                      @input="onSiretInput"
                    />
                    <p v-if="siretLookup.status === 'pending'" class="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {{ t('rdv.rdv_siret_checking', 'Vérification en cours…') }}
                    </p>
                    <div v-else-if="siretLookup.status === 'ok'" class="mt-2 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs">
                      <p class="font-semibold text-emerald-800 dark:text-emerald-200">{{ siretLookup.companyName }}</p>
                      <p v-if="siretLookup.city" class="text-emerald-700 dark:text-emerald-300">{{ siretLookup.city }}<span v-if="siretLookup.legalForm"> · {{ siretLookup.legalForm }}</span></p>
                    </div>
                    <p v-else-if="siretLookup.status === 'error'" class="mt-1 text-xs text-red-600 dark:text-red-400">
                      {{ siretLookup.error }}
                    </p>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('rdv.rdv_field_message', 'Sujet du rendez-vous (optionnel)') }}</label>
                    <textarea v-model="form.prospectMessage" rows="3" class="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 focus:outline-none resize-none" :placeholder="t('rdv.rdv_message_placeholder', 'Contexte, attentes, questions…')" />
                  </div>
                  <button
                    type="submit"
                    :disabled="submitting || (b2bMode && !siretValid)"
                    class="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    {{ submitting ? t('rdv.rdv_submit_button_loading', 'Réservation…') : t('rdv.rdv_submit_button_idle', 'Confirmer le rendez-vous') }}
                  </button>
                </form>
              </div>

              <!-- ── CALENDRIER + TIMESLOTS ── -->
              <div v-else>
                <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-5">{{ t('rdv.rdv_calendar_title', 'Choisir une date & un horaire') }}</h2>

                <div v-if="pending" class="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">
                  {{ t('rdv.rdv_slots_loading', 'Chargement des créneaux…') }}
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">

                  <!-- Calendrier -->
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        :disabled="!canGoPrev"
                        class="w-8 h-8 flex items-center justify-center rounded-full text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        @click="prevMonth"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                      </button>
                      <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ monthLabel }}</div>
                      <button
                        type="button"
                        class="w-8 h-8 flex items-center justify-center rounded-full text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors"
                        @click="nextMonth"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                      </button>
                    </div>

                    <div class="grid grid-cols-7 gap-1 text-[10px] font-semibold text-gray-500 dark:text-slate-400 text-center mb-2">
                      <div v-for="d in dayHeaders" :key="d">{{ d }}</div>
                    </div>

                    <div class="grid grid-cols-7 gap-1">
                      <template v-for="(cell, i) in monthCells" :key="i">
                        <div v-if="!cell" class="aspect-square" />
                        <button
                          v-else
                          type="button"
                          :disabled="!cell.hasSlots || cell.isPast"
                          :class="[
                            'aspect-square w-full rounded-full text-sm font-semibold transition-colors relative',
                            cell.iso === selectedDate
                              ? 'bg-primary-600 text-white'
                              : cell.hasSlots && !cell.isPast
                                ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 cursor-pointer'
                                : 'text-gray-300 dark:text-slate-600 cursor-not-allowed',
                          ]"
                          @click="selectDate(cell)"
                        >
                          {{ cell.dayNum }}
                          <span
                            v-if="cell.isToday && cell.iso !== selectedDate"
                            class="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full bg-primary-600"
                          />
                        </button>
                      </template>
                    </div>

                    <div class="text-[11px] text-gray-500 dark:text-slate-400 mt-4 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18" />
                      </svg>
                      {{ t('rdv.rdv_timezone_label', 'Fuseau horaire : Europe/Paris') }}
                    </div>
                  </div>

                  <!-- Timeslots of the selected day -->
                  <div v-if="selectedDate" class="sm:border-l sm:border-gray-100 dark:sm:border-slate-700 sm:pl-6 sm:-ml-px">
                    <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-3">
                      {{ selectedDateLabel }}
                    </h3>
                    <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      <button
                        v-for="slot in selectedDateSlots"
                        :key="slot.id_availability"
                        type="button"
                        class="w-full px-4 py-3 border-2 border-primary-600 text-primary-700 dark:text-primary-300 hover:bg-primary-600 hover:text-white dark:hover:text-white rounded-lg font-bold text-sm tracking-wide transition-colors"
                        @click="selectSlot(slot)"
                      >
                        {{ fmtTime(slot.date_start) }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="hidden sm:flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 italic">
                    {{ t('rdv.rdv_select_date_hint', 'Sélectionnez une date à gauche') }}
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

    </div>
  </div>
</template>
