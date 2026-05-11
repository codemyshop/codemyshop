
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const { t } = useHubT()

type TabId = 'mail' | 'templates_client' | 'queue' | 'notifs_admin' | 'smtp' | 'newsletter'
const activeTab = ref<TabId>('mail')
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'mail',             label: t('hub.email_tab_mail',       'Boîte de réception') },
  { id: 'templates_client', label: t('hub.email_tab_clients',    'Templates clients') },
  { id: 'queue',            label: t('hub.email_tab_queue',      'Queue d\'envoi') },
  { id: 'notifs_admin',     label: t('hub.email_tab_notifs',     'Templates notifs') },
  { id: 'newsletter',       label: t('hub.email_tab_newsletter', 'Newsletter') },
  { id: 'smtp',             label: t('hub.email_tab_smtp',       'SMTP') },
]

interface EmailTemplate {
  slug:           string
  audience:       'client' | 'admin'
  label:          string
  description:    string
  trigger:        string
  recipient_to:   string
}

interface EmailTemplateRow {
  slug:         string
  audience:     'client' | 'admin'
  label:        string
  description:  string
  trigger_hint: string | null
  active:       number
  subject_fr:   string | null
  html_size:    number | null
  recipient_to: string | null
}
const { data: templatesData } = await useFetch<{ templates: EmailTemplateRow[] }>(
  '/api/bo/email-templates',
  { default: () => ({ templates: [] }) },
)

const allTemplates = computed<EmailTemplate[]>(() => {
  return (templatesData.value?.templates ?? []).map(r => ({
    slug:         r.slug,
    audience:     r.audience,
    
    
    label:        r.label || r.slug.replace(/_/g, ' '),
    description:  r.description || '',
    trigger:      r.trigger_hint || '',
    recipient_to: r.recipient_to || '',
  }))
})
const clientTemplates = computed(() => allTemplates.value.filter(t => t.audience === 'client'))
const adminTemplates  = computed(() => allTemplates.value.filter(t => t.audience === 'admin'))

interface SmtpConfig {
  host:       string
  port:       number
  user:       string
  from:       string
  secure:     boolean
  from_email: string
  reply_to:   string
}
const { data: smtpData, refresh: refreshSmtp } = await useFetch<{ config: SmtpConfig; source: 'db' | 'env' }>(
  '/api/bo/email-config/smtp',
  { default: () => ({ config: { host: '', port: 587, user: '', from: '', secure: true, from_email: '', reply_to: '' }, source: 'env' as const }) },
)
const smtpForm = reactive<SmtpConfig>({
  host: '', port: 587, user: '', from: '', secure: true, from_email: '', reply_to: '',
})
function syncSmtpForm() {
  if (!smtpData.value) return
  smtpForm.host       = smtpData.value.config.host || ''
  smtpForm.port       = smtpData.value.config.port || 587
  smtpForm.user       = smtpData.value.config.user || ''
  smtpForm.from       = smtpData.value.config.from || ''
  smtpForm.secure     = smtpData.value.config.secure !== false
  smtpForm.from_email = smtpData.value.config.from_email || ''
  smtpForm.reply_to   = smtpData.value.config.reply_to   || ''
}
syncSmtpForm()
watch(smtpData, syncSmtpForm)

const smtpSaving = ref(false)
const smtpMessage = ref('')
const smtpError = ref('')
async function saveSmtp() {
  smtpSaving.value = true
  smtpMessage.value = ''
  smtpError.value = ''
  try {
    await $fetch('/api/bo/email-config/smtp', {
      method: 'PUT',
      body: {
        host:       smtpForm.host || undefined,
        port:       smtpForm.port || undefined,
        user:       smtpForm.user || undefined,
        from:       smtpForm.from || undefined,
        secure:     smtpForm.secure,
        from_email: smtpForm.from_email || undefined,
        reply_to:   smtpForm.reply_to || undefined,
      },
    })
    smtpMessage.value = 'Configuration enregistrée.'
    await refreshSmtp()
  } catch (err: any) {
    smtpError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    smtpSaving.value = false
  }
}

interface QueuedEmail {
  id_ac_email_queue: number
  to_email:          string
  subject:           string
  template_slug:     string | null
  id_lang:           number | null
  status:            'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  attempts:          number
  max_attempts:      number
  last_error:        string | null
  resend_id:         string | null
  scheduled_at:      string | null
  sent_at:           string | null
  priority:          number
  date_add:          string
  date_upd:          string
}

function priorityBadge(p: number | null | undefined): { label: string; cls: string } {
  const v = Number(p ?? 50)
  if (v <= 15) return { label: 'Critique',  cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200' }
  if (v <= 30) return { label: 'Important', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' }
  if (v <= 70) return { label: 'Standard',  cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
  return            { label: 'Marketing', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200' }
}
interface QueueResponse {
  emails:  QueuedEmail[]
  summary: { pending: number; sending: number; sent: number; failed: number; cancelled: number }
}

const { data: queueData, refresh: refreshQueue } = await useFetch<QueueResponse>(
  '/api/bo/email-queue',
  { default: () => ({ emails: [], summary: { pending: 0, sending: 0, sent: 0, failed: 0, cancelled: 0 } }) },
)

let queueTimer: ReturnType<typeof setInterval> | null = null
watch(activeTab, (tab) => {
  if (tab === 'queue') {
    refreshQueue()
    if (!queueTimer) queueTimer = setInterval(refreshQueue, 30_000)
  } else if (queueTimer) {
    clearInterval(queueTimer)
    queueTimer = null
  }
}, { immediate: true })
onUnmounted(() => { if (queueTimer) clearInterval(queueTimer) })

const queueActionId = ref<number | null>(null)
const queueErrorMsg = ref('')

async function cancelEmail(id: number) {
  queueActionId.value = id
  queueErrorMsg.value = ''
  try {
    await $fetch(`/api/bo/email-queue/${id}`, { method: 'DELETE' })
    await refreshQueue()
  } catch (err: any) {
    queueErrorMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    queueActionId.value = null
  }
}

async function retryEmail(id: number) {
  queueActionId.value = id
  queueErrorMsg.value = ''
  try {
    await $fetch(`/api/bo/email-queue/${id}/retry`, { method: 'POST' })
    await refreshQueue()
  } catch (err: any) {
    queueErrorMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    queueActionId.value = null
  }
}

const processingNow = ref(false)
const processNowMsg = ref('')
async function processNow() {
  processingNow.value = true
  processNowMsg.value = ''
  queueErrorMsg.value = ''
  try {
    const r = await $fetch<{ scanned: number; processed: number; errors: number }>(
      '/api/bo/email-queue/process-now',
      { method: 'POST', body: { limit: 5 } },
    )
    if (r.scanned === 0) {
      processNowMsg.value = 'Queue vide — rien à envoyer.'
    } else {
      processNowMsg.value = `${r.processed}/${r.scanned} envoyé${r.processed > 1 ? 's' : ''}` + (r.errors > 0 ? `, ${r.errors} en erreur` : '') + '.'
    }
    await refreshQueue()
  } catch (err: any) {
    queueErrorMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    processingNow.value = false
  }
}

const STATUS_LABEL: Record<QueuedEmail['status'], string> = {
  pending:   'En attente',
  sending:   'Envoi…',
  sent:      'Envoyé',
  failed:    'Échec',
  cancelled: 'Annulé',
}
const STATUS_BADGE: Record<QueuedEmail['status'], string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  sending:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sent:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
}

interface InboxMessage {
  id:             number
  uid:            number | null
  messageId:      string
  fromEmail:      string
  fromName:       string
  toEmails:       string
  ccEmails:       string
  subject:        string
  dateReceived:   string | null
  bodyText:       string
  hasAttachments: boolean
  isRead:         boolean
}
interface InboxResp { account: string; folder: string; messages: InboxMessage[] }
interface AttachmentMeta { id: number; filename: string; mimeType: string; sizeBytes: number }

const inboxData      = ref<InboxResp | null>(null)
const inboxLoading   = ref(false)
const inboxError     = ref('')
const inboxFolder    = ref<'inbox' | 'sent' | 'draft'>('inbox')
const syncing        = ref(false)
const syncMsg        = ref('')
const syncSinceDays  = ref(14)
const selectedId     = ref<number | null>(null)
const attachmentsBy  = ref<Record<number, AttachmentMeta[]>>({})
const composeOpen    = ref(false)

async function loadInbox() {
  inboxLoading.value = true
  inboxError.value   = ''
  try {
    const r = await $fetch<InboxResp>('/api/bo/email-client/inbox', {
      query: { folder: inboxFolder.value, limit: 200 },
    })
    inboxData.value = r
    if (selectedId.value && !r.messages.find(m => m.id === selectedId.value)) {
      selectedId.value = null
    }
  } catch (err: any) {
    inboxError.value = err?.data?.statusMessage || err?.message || 'Erreur lecture inbox'
  } finally {
    inboxLoading.value = false
  }
}

async function syncImap() {
  syncing.value = true
  syncMsg.value = ''
  inboxError.value = ''
  try {
    const r = await $fetch<{ fetched: number; inserted: number; skipped: number; attachments_inserted: number }>(
      '/api/bo/email-client/sync',
      { method: 'POST', body: { sinceDays: syncSinceDays.value } },
    )
    syncMsg.value = `Sync : ${r.inserted} nouveaux / ${r.fetched} fetch${r.attachments_inserted ? ` · ${r.attachments_inserted} pj` : ''}.`
    await loadInbox()
  } catch (err: any) {
    inboxError.value = err?.data?.statusMessage || err?.message || 'Erreur sync IMAP'
  } finally {
    syncing.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'mail' && !inboxData.value) loadInbox()
})
watch(inboxFolder, () => { selectedId.value = null; loadInbox() })

const selectedMessage = computed<InboxMessage | null>(() => {
  if (!selectedId.value || !inboxData.value) return null
  return inboxData.value.messages.find(m => m.id === selectedId.value) ?? null
})

watch(selectedMessage, async (m) => {
  if (!m || !m.hasAttachments) return
  if (attachmentsBy.value[m.id]) return
  try {
    const r = await $fetch<{ attachments: AttachmentMeta[] }>(`/api/bo/email-client/messages/${m.id}/attachments`)
    attachmentsBy.value[m.id] = r.attachments
  } catch (err: any) {
    console.warn('[mail] load attachments', err?.message)
  }
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

interface CannedTemplate { id: number; label: string; subject: string; body: string; position: number }
interface SignatureData { bodyText: string; bodyHtml: string }
interface PickedAttachment { filename: string; mimeType: string; sizeBytes: number; contentBase64: string }

const cannedList = ref<CannedTemplate[]>([])
const signature  = ref<SignatureData>({ bodyText: '', bodyHtml: '' })
const useSignature = ref(true)

async function loadCanned() {
  try {
    const r = await $fetch<{ canned: CannedTemplate[] }>('/api/bo/email-client/canned')
    cannedList.value = r.canned
  } catch (err: any) { console.warn('[mail] load canned:', err?.message) }
}
async function loadSignature() {
  try {
    const r = await $fetch<{ signature: SignatureData }>('/api/bo/email-client/signature')
    signature.value = r.signature
  } catch (err: any) { console.warn('[mail] load signature:', err?.message) }
}
watch(activeTab, (tab) => {
  if (tab === 'mail') {
    if (cannedList.value.length === 0) loadCanned()
    if (!signature.value.bodyText && !signature.value.bodyHtml) loadSignature()
  }
})

function bodyWithSignature(body: string): string {
  if (!useSignature.value || !signature.value.bodyText) return body
  return `${body}\n\n-- \n${signature.value.bodyText}`
}

const composeForm = reactive({ to: '', subject: '', body: '', replyTo: '' })
const composeAttachments = ref<PickedAttachment[]>([])
const composeSending = ref(false)
const composeMsg = ref('')
const composeError = ref('')
const cannedPickerId = ref<number | null>(null)
const currentDraftId = ref<number | null>(null)
const draftSavingState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
let draftDebounceTimer: ReturnType<typeof setTimeout> | null = null

let suppressDraftSave = false

function withoutDraftSave(fn: () => void) {
  suppressDraftSave = true
  fn()
  
  
  nextTick(() => { suppressDraftSave = false })
}

function openCompose() {
  withoutDraftSave(() => {
    composeForm.to = ''
    composeForm.subject = ''
    composeForm.body = ''
    composeForm.replyTo = ''
    composeAttachments.value = []
    composeMsg.value = ''
    composeError.value = ''
    cannedPickerId.value = null
    currentDraftId.value = null
    draftSavingState.value = 'idle'
  })
  composeOpen.value = true
}

function loadDraft(m: InboxMessage) {
  withoutDraftSave(() => {
    currentDraftId.value = m.id
    composeForm.to = m.toEmails || ''
    composeForm.subject = m.subject || ''
    composeForm.body = m.bodyText || ''
    composeForm.replyTo = ''
    composeAttachments.value = []
    composeMsg.value = ''
    composeError.value = ''
    cannedPickerId.value = null
    draftSavingState.value = 'saved'
  })
  composeOpen.value = true
}

async function saveDraftNow() {
  
  if (!composeForm.to && !composeForm.subject && !composeForm.body) {
    draftSavingState.value = 'idle'
    return
  }
  draftSavingState.value = 'saving'
  try {
    if (currentDraftId.value) {
      await $fetch(`/api/bo/email-client/draft/${currentDraftId.value}`, {
        method: 'PUT',
        body: {
          to:      composeForm.to,
          subject: composeForm.subject,
          body:    composeForm.body,
        },
      })
    } else {
      const r = await $fetch<{ id: number }>('/api/bo/email-client/draft', {
        method: 'POST',
        body: {
          to:      composeForm.to,
          subject: composeForm.subject,
          body:    composeForm.body,
          replyTo: composeForm.replyTo,
        },
      })
      currentDraftId.value = r.id
    }
    draftSavingState.value = 'saved'
  } catch (err: any) {
    console.warn('[mail] draft save:', err?.message)
    draftSavingState.value = 'error'
  }
}

function scheduleDraftSave() {
  if (!composeOpen.value || suppressDraftSave) return
  draftSavingState.value = 'saving'
  if (draftDebounceTimer) clearTimeout(draftDebounceTimer)
  draftDebounceTimer = setTimeout(saveDraftNow, 1500)
}

watch(
  () => [composeForm.to, composeForm.subject, composeForm.body],
  scheduleDraftSave,
)

async function discardDraft() {
  if (!currentDraftId.value) {
    composeOpen.value = false
    return
  }
  if (!confirm('Supprimer ce brouillon ?')) return
  try {
    await $fetch(`/api/bo/email-client/draft/${currentDraftId.value}`, { method: 'DELETE' })
    currentDraftId.value = null
    composeOpen.value = false
    if (inboxFolder.value === 'draft') loadInbox()
  } catch (err: any) {
    composeError.value = err?.data?.statusMessage || err?.message || 'Erreur suppression'
  }
}

function closeComposeKeepDraft() {
  
  if (draftDebounceTimer) {
    clearTimeout(draftDebounceTimer)
    draftDebounceTimer = null
    saveDraftNow()
  }
  composeOpen.value = false
  if (inboxFolder.value === 'draft') loadInbox()
}

function applyCanned() {
  if (!cannedPickerId.value) return
  const tpl = cannedList.value.find(c => c.id === cannedPickerId.value)
  if (!tpl) return
  if (tpl.subject && !composeForm.subject) composeForm.subject = tpl.subject
  composeForm.body = composeForm.body
    ? `${tpl.body}\n\n${composeForm.body}`
    : tpl.body
  cannedPickerId.value = null
}

async function addFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const f of Array.from(input.files)) {
    const buf = await f.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    composeAttachments.value.push({
      filename:      f.name,
      mimeType:      f.type || 'application/octet-stream',
      sizeBytes:     f.size,
      contentBase64: b64,
    })
  }
  input.value = ''
}
function removeAttachment(idx: number) {
  composeAttachments.value.splice(idx, 1)
}

function openReply(m: InboxMessage) {
  composeForm.to = m.fromEmail
  composeForm.subject = m.subject.startsWith('Re: ') ? m.subject : `Re: ${m.subject}`
  const quoted = (m.bodyText || '').split('\n').map(l => `> ${l}`).join('\n')
  composeForm.body = `\n\n--- Le ${formatDate(m.dateReceived)} ${m.fromName || m.fromEmail} a écrit ---\n${quoted}`
  composeForm.replyTo = ''
  composeMsg.value = ''
  composeError.value = ''
  composeOpen.value = true
}

async function sendCompose() {
  composeSending.value = true
  composeMsg.value = ''
  composeError.value = ''
  try {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) {
      throw new Error('Champs requis : To, Subject, Body.')
    }
    await $fetch('/api/bo/email-client/send', {
      method: 'POST',
      body: {
        to:      composeForm.to,
        subject: composeForm.subject,
        body:    bodyWithSignature(composeForm.body),
        replyTo: composeForm.replyTo || undefined,
        attachments: composeAttachments.value.length
          ? composeAttachments.value.map(a => ({
              filename:      a.filename,
              mimeType:      a.mimeType,
              contentBase64: a.contentBase64,
            }))
          : undefined,
        draftId: currentDraftId.value || undefined,
      },
    })
    composeMsg.value = 'Email envoyé.'
    currentDraftId.value = null
    if (draftDebounceTimer) { clearTimeout(draftDebounceTimer); draftDebounceTimer = null }
    setTimeout(() => {
      composeOpen.value = false
      
      if (inboxFolder.value === 'draft') loadInbox()
    }, 1200)
  } catch (err: any) {
    composeError.value = err?.data?.statusMessage || err?.message || 'Erreur envoi'
  } finally {
    composeSending.value = false
  }
}

const prefsOpen = ref(false)
const prefsTab = ref<'canned' | 'signature'>('canned')
const cannedDraft = reactive({ id: 0 as number | null, label: '', subject: '', body: '' })
const cannedDraftSaving = ref(false)
const cannedDraftError = ref('')
const signatureDraft = ref('')
const signatureSaving = ref(false)
const signatureMsg = ref('')

function openPrefs() {
  prefsOpen.value = true
  prefsTab.value = 'canned'
  cannedDraft.id = null
  cannedDraft.label = ''
  cannedDraft.subject = ''
  cannedDraft.body = ''
  cannedDraftError.value = ''
  signatureDraft.value = signature.value.bodyText || ''
  signatureMsg.value = ''
  loadCanned()
}

function editCanned(c: CannedTemplate) {
  cannedDraft.id = c.id
  cannedDraft.label = c.label
  cannedDraft.subject = c.subject
  cannedDraft.body = c.body
  cannedDraftError.value = ''
}
function newCanned() {
  cannedDraft.id = null
  cannedDraft.label = ''
  cannedDraft.subject = ''
  cannedDraft.body = ''
  cannedDraftError.value = ''
}

async function saveCanned() {
  if (!cannedDraft.label.trim()) {
    cannedDraftError.value = 'Label requis.'
    return
  }
  cannedDraftSaving.value = true
  cannedDraftError.value = ''
  try {
    if (cannedDraft.id) {
      await $fetch(`/api/bo/email-client/canned/${cannedDraft.id}`, {
        method: 'PUT',
        body: { label: cannedDraft.label, subject: cannedDraft.subject, body: cannedDraft.body },
      })
    } else {
      await $fetch('/api/bo/email-client/canned', {
        method: 'POST',
        body: { label: cannedDraft.label, subject: cannedDraft.subject, body: cannedDraft.body },
      })
    }
    await loadCanned()
    newCanned()
  } catch (err: any) {
    cannedDraftError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    cannedDraftSaving.value = false
  }
}

async function deleteCanned(id: number) {
  if (!confirm('Supprimer ce modèle ?')) return
  try {
    await $fetch(`/api/bo/email-client/canned/${id}`, { method: 'DELETE' })
    await loadCanned()
    if (cannedDraft.id === id) newCanned()
  } catch (err: any) {
    cannedDraftError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  }
}

async function saveSignature() {
  signatureSaving.value = true
  signatureMsg.value = ''
  try {
    await $fetch('/api/bo/email-client/signature', {
      method: 'PUT',
      body: { bodyText: signatureDraft.value, bodyHtml: '' },
    })
    signature.value = { bodyText: signatureDraft.value, bodyHtml: '' }
    signatureMsg.value = 'Signature enregistrée.'
  } catch (err: any) {
    signatureMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    signatureSaving.value = false
  }
}

function formatPickedSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type NewsletterStatus = 'pending' | 'confirmed' | 'unsubscribed' | 'bounced'
interface NewsletterSubscriber {
  id_subscriber:     number
  email:             string
  status:            NewsletterStatus
  locale:            string | null
  source:            string
  source_url:        string | null
  ip:                string | null
  user_agent:        string | null
  consent_at:        string
  confirmed_at:      string | null
  unsubscribed_at:   string | null
  bounce_reason:     string | null
  date_add:          string
}
interface NewsletterListResp {
  rows:     NewsletterSubscriber[]
  total:    number
  byStatus: Record<NewsletterStatus, number>
}

const newsletterStatus = ref<NewsletterStatus | 'all'>('all')
const newsletterSearch = ref('')
const newsletterLoading = ref(false)
const newsletterError = ref('')
const newsletterData = ref<NewsletterListResp | null>(null)
const newsletterPage = ref(0)
const NEWSLETTER_PAGE_SIZE = 50

async function loadNewsletter() {
  newsletterLoading.value = true
  newsletterError.value = ''
  try {
    newsletterData.value = await $fetch<NewsletterListResp>('/api/bo/crm/newsletter', {
      query: {
        status: newsletterStatus.value,
        q:      newsletterSearch.value.trim() || undefined,
        limit:  NEWSLETTER_PAGE_SIZE,
        offset: newsletterPage.value * NEWSLETTER_PAGE_SIZE,
      },
    })
  } catch (err: any) {
    newsletterError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    newsletterLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'newsletter' && !newsletterData.value) loadNewsletter()
})
watch([newsletterStatus, newsletterPage], () => {
  if (activeTab.value === 'newsletter') loadNewsletter()
})

const newsletterSearchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
function onNewsletterSearchInput() {
  if (newsletterSearchTimer.value) clearTimeout(newsletterSearchTimer.value)
  newsletterSearchTimer.value = setTimeout(() => {
    newsletterPage.value = 0
    loadNewsletter()
  }, 300)
}

const newsletterUnsubscribingId = ref<number | null>(null)
async function newsletterUnsubscribe(s: NewsletterSubscriber) {
  if (!confirm(`Désabonner ${s.email} de la newsletter ?`)) return
  newsletterUnsubscribingId.value = s.id_subscriber
  try {
    await $fetch(`/api/bo/crm/newsletter/${s.id_subscriber}/unsubscribe`, {
      method: 'POST',
      body: { reason: 'Désabonnement manuel BO' },
    })
    await loadNewsletter()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Erreur désabonnement')
  } finally {
    newsletterUnsubscribingId.value = null
  }
}

function newsletterExportCsv() {
  const url = `/api/bo/crm/newsletter/export.csv?status=${newsletterStatus.value}`
  window.open(url, '_blank')
}

const NEWSLETTER_STATUS_LABEL: Record<NewsletterStatus, string> = {
  pending:      'En attente',
  confirmed:    'Confirmé',
  unsubscribed: 'Désabonné',
  bounced:      'Bounce',
}
const NEWSLETTER_STATUS_BADGE: Record<NewsletterStatus, string> = {
  pending:      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  confirmed:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  unsubscribed: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  bounced:      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

function formatNewsletterDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
       + ' '
       + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t('hub.email_title', 'Emails') }}
      </h1>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        {{ t('hub.email_subtitle', 'Configuration des emails envoyés depuis le site (clients + admin) et serveur d\'envoi SMTP.') }}
      </p>
    </div>

    
    <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm mb-6">
      <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800 overflow-x-auto" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="[
            'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium whitespace-nowrap',
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

    
    <div v-show="activeTab === 'templates_client'" class="space-y-3">
      <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
        {{ t('hub.email_clients_help', 'Emails transactionnels envoyés automatiquement aux clients suite à un événement (commande, paiement, expédition, devis, mot de passe…).') }}
      </p>
      <div
        v-for="tpl in clientTemplates"
        :key="tpl.slug"
        class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ tpl.label }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">{{ tpl.description }}</p>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-mono">
              <span class="uppercase tracking-wide">slug</span> {{ tpl.slug }} · <span class="uppercase tracking-wide">trigger</span> {{ tpl.trigger }}
            </p>
          </div>
          <NuxtLink
            :to="`/hub/crm/email/template/${tpl.slug}`"
            class="shrink-0 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {{ t('hub.email_edit', 'Éditer') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    
    <div v-show="activeTab === 'queue'" class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <p class="text-xs text-gray-500 dark:text-slate-400 max-w-2xl">
          {{ t('hub.email_queue_help', 'File d\'attente des emails à envoyer. Un cron draine la queue toutes les minutes (1 email à la fois) pour préserver la réputation du serveur SMTP et éviter d\'être marqué spam.') }}
        </p>
        <button
          type="button"
          :disabled="processingNow || !(queueData?.summary?.pending)"
          class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium whitespace-nowrap"
          :title="t('hub.email_process_now_help', 'Bypass le cron 60s : envoie jusqu\'à 5 emails pending immédiatement.')"
          @click="processNow"
        >
          {{ processingNow ? 'Envoi…' : 'Process now' }}
        </button>
      </div>

      
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div v-for="(label, key) in STATUS_LABEL" :key="key" class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3">
          <div class="text-[10px] uppercase tracking-wide text-gray-400">{{ label }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {{ queueData?.summary?.[key] ?? 0 }}
          </div>
        </div>
      </div>

      <div v-if="processNowMsg" class="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{{ processNowMsg }}</div>
      <div v-if="queueErrorMsg" class="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{{ queueErrorMsg }}</div>

      
      <div v-if="!queueData?.emails?.length" class="rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center text-sm text-gray-500 dark:text-slate-400">
        {{ t('hub.email_queue_empty', 'Aucun email dans la queue.') }}
      </div>
      <div v-else class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800/40">
            <tr class="text-left text-gray-500 uppercase tracking-wide text-[10px]">
              <th class="font-medium px-4 py-2.5">Statut</th>
              <th class="font-medium px-4 py-2.5">Priorité</th>
              <th class="font-medium px-4 py-2.5">Destinataire</th>
              <th class="font-medium px-4 py-2.5">Sujet</th>
              <th class="font-medium px-4 py-2.5">Template</th>
              <th class="font-medium px-4 py-2.5">Tentatives</th>
              <th class="font-medium px-4 py-2.5">Créé</th>
              <th class="font-medium px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in queueData.emails"
              :key="m.id_ac_email_queue"
              class="border-t border-gray-100 dark:border-slate-800"
              :class="m.status === 'failed' ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''"
            >
              <td class="px-4 py-2.5">
                <span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full" :class="STATUS_BADGE[m.status]">
                  {{ STATUS_LABEL[m.status] }}
                </span>
              </td>
              <td class="px-4 py-2.5">
                <span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-mono" :class="priorityBadge(m.priority).cls" :title="`Priorité ${m.priority}/100`">
                  {{ priorityBadge(m.priority).label }}
                </span>
              </td>
              <td class="px-4 py-2.5 font-mono text-xs">{{ m.to_email }}</td>
              <td class="px-4 py-2.5 max-w-xs truncate" :title="m.subject">{{ m.subject }}</td>
              <td class="px-4 py-2.5 text-xs font-mono">
                <NuxtLink
                  v-if="m.template_slug"
                  :to="`/hub/crm/email/template/${m.template_slug}`"
                  class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
                  :title="`Éditer le template ${m.template_slug}`"
                >{{ m.template_slug }}</NuxtLink>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-2.5 text-xs">
                {{ m.attempts }}/{{ m.max_attempts }}
                <span v-if="m.last_error" class="block text-[10px] text-rose-600 truncate max-w-[180px]" :title="m.last_error">
                  {{ m.last_error }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">{{ String(m.date_add).slice(0, 16).replace('T', ' ') }}</td>
              <td class="px-4 py-2.5 text-right">
                <button
                  v-if="m.status === 'pending'"
                  type="button"
                  :disabled="queueActionId === m.id_ac_email_queue"
                  class="text-xs px-2 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40"
                  @click="cancelEmail(m.id_ac_email_queue)"
                >
                  Annuler
                </button>
                <button
                  v-else-if="m.status === 'failed' || m.status === 'cancelled'"
                  type="button"
                  :disabled="queueActionId === m.id_ac_email_queue"
                  class="text-xs px-2 py-1 border border-primary-200 text-primary-700 hover:bg-primary-50 rounded transition-colors disabled:opacity-40"
                  @click="retryEmail(m.id_ac_email_queue)"
                >
                  Réessayer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    <div v-show="activeTab === 'notifs_admin'" class="space-y-3">
      <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
        {{ t('hub.email_admin_help', 'Emails de notification envoyés aux administrateurs du site lors d\'événements clients (nouvelle commande, lead, contact, alertes).') }}
      </p>
      <div
        v-for="tpl in adminTemplates"
        :key="tpl.slug"
        class="rounded-xl bg-white dark:bg-slate-900 border p-4 transition-colors"
        :class="!tpl.recipient_to
          ? 'border-rose-300 dark:border-rose-700 hover:border-rose-400'
          : 'border-gray-100 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700'"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ tpl.label }}</h3>
              <span
                v-if="!tpl.recipient_to"
                class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                :title="t('hub.email_admin_no_recipient_help', 'Aucune adresse destinataire — l\'email ne partira pas tant que ce champ reste vide.')"
              >
                {{ t('hub.email_admin_no_recipient_badge', 'Destinataire manquant') }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">{{ tpl.description }}</p>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-mono">
              <span class="uppercase tracking-wide">slug</span> {{ tpl.slug }} · <span class="uppercase tracking-wide">trigger</span> {{ tpl.trigger }}
              <span v-if="tpl.recipient_to"> · <span class="uppercase tracking-wide">to</span> {{ tpl.recipient_to }}</span>
            </p>
          </div>
          <NuxtLink
            :to="`/hub/crm/email/template/${tpl.slug}`"
            class="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
            :class="!tpl.recipient_to
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'"
          >
            {{ t('hub.email_edit', 'Éditer') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    
    <div v-show="activeTab === 'smtp'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap mb-1">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ t('hub.email_smtp_title', 'Serveur d\'envoi') }}
          </h2>
          <span
            class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
            :class="smtpData?.source === 'db'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'"
          >
            {{ smtpData?.source === 'db' ? 'Source : DB' : 'Source : .env (fallback)' }}
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">
          {{ t('hub.email_smtp_help', 'Paramètres SMTP (IMAP réception, alertes) + Resend (envois transactionnels). Persistés en DB après sauvegarde — surchargent les variables .env. Le mot de passe SMTP reste géré via .env (jamais affiché ni édité ici).') }}
        </p>

        <div v-if="smtpMessage" class="mb-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{{ smtpMessage }}</div>
        <div v-if="smtpError" class="mb-4 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{{ smtpError }}</div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">Host SMTP/IMAP</label>
            <input v-model="smtpForm.host" type="text" placeholder="ssl0.ovh.net" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">Port</label>
            <input v-model.number="smtpForm.port" type="number" min="1" max="65535" placeholder="465" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">Utilisateur</label>
            <input v-model="smtpForm.user" type="text" placeholder="contact@…" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
          </div>
          <div>
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">From SMTP (expéditeur brut)</label>
            <input v-model="smtpForm.from" type="text" placeholder="contact@…" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
          </div>
          <div class="col-span-1 sm:col-span-2">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="smtpForm.secure" type="checkbox" class="rounded" />
              <span>Connexion sécurisée (TLS / port 465)</span>
            </label>
          </div>

          <div class="col-span-1 sm:col-span-2 border-t border-gray-100 dark:border-slate-800 pt-4 mt-1">
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
              {{ t('hub.email_resend_help', 'Resend (envois transactionnels via API) — utilisé par tous les emails passant par la queue.') }}
            </p>
          </div>
          <div class="col-span-1 sm:col-span-2">
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">From Resend (expéditeur affiché)</label>
            <input v-model="smtpForm.from_email" type="text" placeholder='Example Shop <notifications@example-shop.com>' class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
            <p class="text-[10px] text-gray-400 mt-1">Format <span class="font-mono">Nom &lt;email@domaine.tld&gt;</span> — le domaine doit être vérifié dans Resend.</p>
          </div>
          <div class="col-span-1 sm:col-span-2">
            <label class="block text-xs uppercase text-gray-500 tracking-wide mb-1">Reply-to par défaut</label>
            <input v-model="smtpForm.reply_to" type="text" placeholder="contact@…" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
          </div>
        </div>

        <div class="flex items-center gap-3 mt-6">
          <button
            type="button"
            :disabled="smtpSaving"
            class="text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
            @click="saveSmtp"
          >
            {{ smtpSaving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          <button
            type="button"
            class="text-xs px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
            disabled
            :title="t('hub.email_smtp_test_soon', 'Bientôt disponible')"
          >
            {{ t('hub.email_smtp_test', 'Tester l\'envoi') }}
          </button>
        </div>
      </section>
    </div>

    
    <div v-show="activeTab === 'mail'" class="space-y-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <p class="text-xs text-gray-500 dark:text-slate-400">
            {{ t('hub.email_mail_help', 'Boîte mail persistée en DB (cs_email_message) — sync IMAP explicite. Envois SMTP archivés en folder=sent.') }}
          </p>
          <p v-if="inboxData?.account" class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-mono">
            <span class="uppercase tracking-wide">compte</span> {{ inboxData.account }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <div class="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              :class="[ 'text-xs px-3 py-1.5 transition-colors', inboxFolder === 'inbox' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50' ]"
              @click="inboxFolder = 'inbox'"
            >
              📥 Reçus
            </button>
            <button
              type="button"
              :class="[ 'text-xs px-3 py-1.5 transition-colors', inboxFolder === 'sent' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50' ]"
              @click="inboxFolder = 'sent'"
            >
              📤 Envoyés
            </button>
            <button
              type="button"
              :class="[ 'text-xs px-3 py-1.5 transition-colors', inboxFolder === 'draft' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50' ]"
              @click="inboxFolder = 'draft'"
            >
              📝 Brouillons
            </button>
          </div>
          <select
            v-model.number="syncSinceDays"
            class="text-xs px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            :title="t('hub.email_mail_sync_window', 'Fenêtre de sync IMAP (combien de jours en arrière fetch).')"
          >
            <option :value="7">Sync 7j</option>
            <option :value="14">Sync 14j</option>
            <option :value="30">Sync 30j</option>
            <option :value="90">Sync 90j</option>
          </select>
          <button
            type="button"
            :disabled="syncing"
            class="text-xs px-3 py-1.5 border border-primary-200 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-40 transition-colors font-medium"
            @click="syncImap"
          >
            {{ syncing ? 'Sync…' : '↻ Synchroniser' }}
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
            :title="t('hub.email_mail_prefs', 'Modèles + signature')"
            @click="openPrefs"
          >
            ⚙ Préférences
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            @click="openCompose"
          >
            ✉ Nouveau message
          </button>
        </div>
      </div>

      <div v-if="syncMsg" class="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{{ syncMsg }}</div>
      <div v-if="inboxError" class="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{{ inboxError }}</div>

      
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr] gap-4 min-h-[480px]">
        
        <div class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div v-if="inboxLoading && !inboxData" class="p-8 text-center text-sm text-gray-500">
            Chargement IMAP…
          </div>
          <div v-else-if="!inboxData?.messages?.length" class="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Boîte vide sur la période sélectionnée.
          </div>
          <ul v-else class="divide-y divide-gray-100 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
            <li
              v-for="m in inboxData.messages"
              :key="m.id"
              :class="[
                'px-3 py-2.5 cursor-pointer transition-colors',
                selectedId === m.id
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
              ]"
              @click="inboxFolder === 'draft' ? loadDraft(m) : (selectedId = m.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    <span class="truncate">{{ inboxFolder === 'inbox' ? (m.fromName || m.fromEmail) : (m.toEmails || '— Sans destinataire') }}</span>
                    <span v-if="m.hasAttachments" class="text-amber-500" title="Pièces jointes">📎</span>
                    <span v-if="inboxFolder === 'draft'" class="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">brouillon</span>
                  </div>
                  <div class="text-xs text-gray-700 dark:text-slate-300 truncate mt-0.5">
                    {{ m.subject || '(sans objet)' }}
                  </div>
                  <div v-if="inboxFolder === 'inbox'" class="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5 font-mono">
                    {{ m.fromEmail }}
                  </div>
                  <div v-else-if="inboxFolder === 'draft'" class="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                    {{ (m.bodyText || '').slice(0, 80) }}…
                  </div>
                </div>
                <span class="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                  {{ formatDate(m.dateReceived) }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        
        <div class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <div v-if="!selectedMessage" class="p-12 text-center text-sm text-gray-400">
            <template v-if="inboxFolder === 'draft'">← Clique sur un brouillon pour reprendre la rédaction</template>
            <template v-else>← Sélectionne un message</template>
          </div>
          <div v-else class="flex flex-col h-full">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">{{ selectedMessage.subject || '(sans objet)' }}</h3>
              <div class="flex items-center justify-between gap-4 mt-2 flex-wrap">
                <div class="text-xs text-gray-600 dark:text-slate-400">
                  <div><span class="text-gray-400">De :</span> <span class="font-medium">{{ selectedMessage.fromName || selectedMessage.fromEmail }}</span> <span class="text-gray-400 font-mono">&lt;{{ selectedMessage.fromEmail }}&gt;</span></div>
                  <div v-if="selectedMessage.toEmails"><span class="text-gray-400">À :</span> <span class="font-mono">{{ selectedMessage.toEmails }}</span></div>
                  <div class="text-[10px] text-gray-400 mt-0.5">{{ selectedMessage.dateReceived ? new Date(selectedMessage.dateReceived).toLocaleString('fr-FR') : '—' }}</div>
                </div>
                <button
                  v-if="inboxFolder === 'inbox'"
                  type="button"
                  class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  @click="openReply(selectedMessage)"
                >
                  ↩ Répondre
                </button>
              </div>
            </div>

            
            <div v-if="selectedMessage.hasAttachments && attachmentsBy[selectedMessage.id]?.length" class="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mb-2">📎 {{ attachmentsBy[selectedMessage.id].length }} pièce{{ attachmentsBy[selectedMessage.id].length > 1 ? 's' : '' }} jointe{{ attachmentsBy[selectedMessage.id].length > 1 ? 's' : '' }}</p>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="att in attachmentsBy[selectedMessage.id]"
                  :key="att.id"
                  :href="`/api/bo/email-client/attachments/${att.id}`"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  :title="att.mimeType"
                >
                  <span class="font-medium truncate max-w-[200px]">{{ att.filename }}</span>
                  <span class="text-gray-400 whitespace-nowrap">{{ formatSize(att.sizeBytes) }}</span>
                </a>
              </div>
            </div>

            <div class="px-5 py-4 flex-1 overflow-y-auto">
              <pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-slate-200 font-sans leading-relaxed">{{ selectedMessage.bodyText || '(corps vide)' }}</pre>
            </div>
          </div>
        </div>
      </div>

      
      <div
        v-if="composeOpen"
        class="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center px-4 py-8"
        @click.self="composeOpen = false"
      >
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <h3 class="text-base font-bold text-gray-900 dark:text-white truncate">{{ currentDraftId ? 'Brouillon' : 'Nouveau message' }}</h3>
              <span
                v-if="draftSavingState !== 'idle'"
                class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
                :class="{
                  'bg-amber-100 text-amber-700': draftSavingState === 'saving',
                  'bg-emerald-100 text-emerald-700': draftSavingState === 'saved',
                  'bg-rose-100 text-rose-700': draftSavingState === 'error',
                }"
              >
                {{ draftSavingState === 'saving' ? 'Sauvegarde…' : draftSavingState === 'saved' ? 'Brouillon enregistré' : 'Erreur sauvegarde' }}
              </span>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 text-lg"
              :title="t('hub.email_mail_close_keep', 'Fermer (le brouillon est conservé)')"
              @click="closeComposeKeepDraft"
            >✕</button>
          </div>
          <div class="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
            <div>
              <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Destinataire</label>
              <input v-model="composeForm.to" type="email" placeholder="contact@exemple.com" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
            </div>

            
            <div v-if="cannedList.length > 0" class="flex items-center gap-2">
              <select
                v-model.number="cannedPickerId"
                class="flex-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              >
                <option :value="null">— Insérer un modèle —</option>
                <option v-for="c in cannedList" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
              <button
                type="button"
                :disabled="!cannedPickerId"
                class="text-xs px-3 py-1.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 disabled:opacity-40 transition-colors font-medium"
                @click="applyCanned"
              >
                Insérer
              </button>
            </div>

            <div>
              <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Sujet</label>
              <input v-model="composeForm.subject" type="text" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Reply-to (optionnel)</label>
              <input v-model="composeForm.replyTo" type="email" placeholder="laisser vide = compte SMTP par défaut" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Message</label>
              <textarea v-model="composeForm.body" rows="10" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"></textarea>

              
              <div v-if="signature.bodyText" class="mt-2 space-y-1">
                <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                  <input v-model="useSignature" type="checkbox" class="rounded" />
                  <span>Ajouter ma signature</span>
                </label>
                <pre v-if="useSignature" class="text-[11px] text-gray-500 dark:text-slate-500 italic whitespace-pre-wrap font-sans border-l-2 border-gray-200 dark:border-slate-700 pl-3">{{ signature.bodyText }}</pre>
              </div>
            </div>

            
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-[10px] uppercase text-gray-500 tracking-wide">Pièces jointes</label>
                <label class="text-xs px-3 py-1 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors font-medium">
                  📎 Ajouter
                  <input type="file" multiple class="hidden" @change="addFiles" />
                </label>
              </div>
              <div v-if="composeAttachments.length === 0" class="text-[11px] text-gray-400 italic">Aucune pièce jointe.</div>
              <ul v-else class="space-y-1">
                <li v-for="(a, idx) in composeAttachments" :key="idx" class="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-medium truncate">{{ a.filename }}</div>
                    <div class="text-[10px] text-gray-400 font-mono">{{ a.mimeType }} · {{ formatPickedSize(a.sizeBytes) }}</div>
                  </div>
                  <button type="button" class="text-xs text-rose-600 hover:text-rose-700 px-2" @click="removeAttachment(idx)">✕</button>
                </li>
              </ul>
              <p class="text-[10px] text-gray-400 mt-1">Limite 25 MB total.</p>
            </div>

            <div v-if="composeMsg" class="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{{ composeMsg }}</div>
            <div v-if="composeError" class="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{{ composeError }}</div>
          </div>
          <div class="px-5 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              v-if="currentDraftId"
              type="button"
              class="text-xs px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-medium"
              @click="discardDraft"
            >
              🗑 Supprimer brouillon
            </button>
            <span v-else></span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                @click="closeComposeKeepDraft"
              >
                Fermer
              </button>
              <button
                type="button"
                :disabled="composeSending"
                class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
                @click="sendCompose"
              >
                {{ composeSending ? 'Envoi…' : 'Envoyer' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      
      <div
        v-if="prefsOpen"
        class="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center px-4 py-8"
        @click.self="prefsOpen = false"
      >
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 class="text-base font-bold text-gray-900 dark:text-white">Préférences Mail</h3>
            <button type="button" class="text-gray-400 hover:text-gray-600" @click="prefsOpen = false">✕</button>
          </div>
          <nav class="flex border-b border-gray-100 dark:border-slate-800 px-4">
            <button
              type="button"
              :class="[ 'text-xs px-4 py-2.5 -mb-px border-b-2 transition-colors font-medium', prefsTab === 'canned' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700' ]"
              @click="prefsTab = 'canned'"
            >Modèles ({{ cannedList.length }})</button>
            <button
              type="button"
              :class="[ 'text-xs px-4 py-2.5 -mb-px border-b-2 transition-colors font-medium', prefsTab === 'signature' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700' ]"
              @click="prefsTab = 'signature'"
            >Signature</button>
          </nav>

          
          <div v-if="prefsTab === 'canned'" class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr]">
            <div class="border-r border-gray-100 dark:border-slate-800 overflow-y-auto">
              <button type="button" class="w-full text-left px-4 py-2.5 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-b border-gray-100 dark:border-slate-800" @click="newCanned">+ Nouveau modèle</button>
              <ul class="divide-y divide-gray-100 dark:divide-slate-800">
                <li
                  v-for="c in cannedList"
                  :key="c.id"
                  :class="[
                    'px-4 py-2.5 cursor-pointer transition-colors',
                    cannedDraft.id === c.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  ]"
                  @click="editCanned(c)"
                >
                  <div class="text-xs font-semibold truncate">{{ c.label }}</div>
                  <div v-if="c.subject" class="text-[10px] text-gray-500 truncate mt-0.5">{{ c.subject }}</div>
                </li>
              </ul>
            </div>
            <div class="p-4 overflow-y-auto space-y-3">
              <div>
                <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Label (visible dans le picker)</label>
                <input v-model="cannedDraft.label" type="text" placeholder="Réponse devis B2B" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Sujet (optionnel)</label>
                <input v-model="cannedDraft.subject" type="text" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label class="block text-[10px] uppercase text-gray-500 tracking-wide mb-1">Corps</label>
                <textarea v-model="cannedDraft.body" rows="10" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"></textarea>
              </div>
              <div v-if="cannedDraftError" class="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{{ cannedDraftError }}</div>
              <div class="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  :disabled="cannedDraftSaving"
                  class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
                  @click="saveCanned"
                >
                  {{ cannedDraftSaving ? '…' : (cannedDraft.id ? 'Mettre à jour' : 'Créer') }}
                </button>
                <button
                  v-if="cannedDraft.id"
                  type="button"
                  class="text-xs px-4 py-1.5 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-medium"
                  @click="deleteCanned(cannedDraft.id!)"
                >
                  Supprimer
                </button>
                <button
                  v-if="cannedDraft.id"
                  type="button"
                  class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  @click="newCanned"
                >
                  Annuler édition
                </button>
              </div>
            </div>
          </div>

          
          <div v-else class="p-5 flex-1 overflow-y-auto space-y-3">
            <p class="text-xs text-gray-500 dark:text-slate-400">
              Signature ajoutée automatiquement à tes nouveaux mails (toggle "Ajouter ma signature" coché par défaut).
            </p>
            <textarea
              v-model="signatureDraft"
              rows="8"
              placeholder="Cordialement,&#10;Aude DURAND&#10;Example Shop — fruits secs &amp; épicerie fine&#10;06 12 34 56 78"
              class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
            ></textarea>
            <div v-if="signatureMsg" class="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{{ signatureMsg }}</div>
            <button
              type="button"
              :disabled="signatureSaving"
              class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
              @click="saveSignature"
            >
              {{ signatureSaving ? '…' : 'Enregistrer la signature' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    
    <div v-show="activeTab === 'newsletter'" class="space-y-4">
      <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
        {{ t('hub.email_newsletter_help', 'Liste des inscrits à la newsletter (footer du site). Stockage RGPD : email, IP, user-agent, texte de consentement, date — preuve du recueil. Désabonnement en 1 clic disponible côté visiteur.') }}
      </p>

      
      <div v-if="newsletterData" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          v-for="s in (['confirmed','pending','unsubscribed','bounced'] as NewsletterStatus[])"
          :key="s"
          type="button"
          :class="[
            'rounded-xl border p-3 text-left transition-colors',
            newsletterStatus === s
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
              : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
          ]"
          @click="newsletterStatus = newsletterStatus === s ? 'all' : s; newsletterPage = 0"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            {{ NEWSLETTER_STATUS_LABEL[s] }}
          </p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {{ newsletterData.byStatus[s] ?? 0 }}
          </p>
        </button>
      </div>

      
      <div class="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3">
        <div class="flex items-center gap-2">
          <label class="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Statut</label>
          <select
            v-model="newsletterStatus"
            class="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            @change="newsletterPage = 0"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="unsubscribed">Désabonné</option>
            <option value="bounced">Bounce</option>
          </select>
        </div>
        <div class="flex items-center gap-2 flex-1 min-w-[200px]">
          <label class="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400">Recherche</label>
          <input
            v-model="newsletterSearch"
            type="search"
            placeholder="email…"
            class="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            @input="onNewsletterSearchInput"
          />
        </div>
        <button
          type="button"
          class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
          @click="newsletterExportCsv"
        >
          Export CSV
        </button>
      </div>

      
      <p v-if="newsletterLoading" class="text-xs text-gray-400 italic text-center py-4">Chargement…</p>
      <p v-else-if="newsletterError" class="text-xs text-rose-600 dark:text-rose-400 text-center py-4">{{ newsletterError }}</p>

      
      <div
        v-else-if="newsletterData && newsletterData.rows.length > 0"
        class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden"
      >
        <table class="w-full text-xs">
          <thead class="bg-gray-50 dark:bg-slate-800 text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
            <tr>
              <th class="px-3 py-2 font-semibold">Email</th>
              <th class="px-3 py-2 font-semibold">Statut</th>
              <th class="px-3 py-2 font-semibold">Source</th>
              <th class="px-3 py-2 font-semibold">Locale</th>
              <th class="px-3 py-2 font-semibold">Consentement</th>
              <th class="px-3 py-2 font-semibold">IP</th>
              <th class="px-3 py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
            <tr
              v-for="s in newsletterData.rows"
              :key="s.id_subscriber"
              class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <td class="px-3 py-2 font-mono text-gray-800 dark:text-slate-200">{{ s.email }}</td>
              <td class="px-3 py-2">
                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', NEWSLETTER_STATUS_BADGE[s.status]]">
                  {{ NEWSLETTER_STATUS_LABEL[s.status] }}
                </span>
              </td>
              <td class="px-3 py-2 text-gray-500 dark:text-slate-400">{{ s.source }}</td>
              <td class="px-3 py-2 text-gray-500 dark:text-slate-400">{{ s.locale || '—' }}</td>
              <td class="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {{ formatNewsletterDate(s.consent_at) }}
              </td>
              <td class="px-3 py-2 font-mono text-gray-400 dark:text-slate-500">{{ s.ip || '—' }}</td>
              <td class="px-3 py-2 text-right">
                <button
                  v-if="s.status !== 'unsubscribed'"
                  type="button"
                  :disabled="newsletterUnsubscribingId === s.id_subscriber"
                  class="text-[10px] font-semibold px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 disabled:opacity-40"
                  @click="newsletterUnsubscribe(s)"
                >
                  Désabonner
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        
        <div class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800 text-[10px] text-gray-500 dark:text-slate-400">
          <span>
            {{ newsletterData.rows.length }} / {{ newsletterData.total }}
            <span v-if="newsletterStatus !== 'all'"> ({{ NEWSLETTER_STATUS_LABEL[newsletterStatus as NewsletterStatus] }})</span>
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="newsletterPage === 0"
              class="px-2 py-1 rounded-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              @click="newsletterPage = Math.max(0, newsletterPage - 1)"
            >← Préc.</button>
            <span>Page {{ newsletterPage + 1 }}</span>
            <button
              type="button"
              :disabled="(newsletterPage + 1) * NEWSLETTER_PAGE_SIZE >= newsletterData.total"
              class="px-2 py-1 rounded-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              @click="newsletterPage = newsletterPage + 1"
            >Suiv. →</button>
          </div>
        </div>
      </div>

      
      <div
        v-else-if="newsletterData"
        class="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center"
      >
        <p class="text-sm text-gray-500 dark:text-slate-400">
          {{ t('hub.email_newsletter_empty', 'Aucun inscrit pour le moment. Active le formulaire dans le builder (Footer → Newsletter) pour commencer à collecter des opt-ins.') }}
        </p>
      </div>
    </div>

  </div>
</template>
