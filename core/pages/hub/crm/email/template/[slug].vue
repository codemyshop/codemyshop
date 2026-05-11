
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const route = useRoute()
const slug = String(route.params.slug || '')

interface Lang {
  id_lang:    number
  subject:    string
  html_body:  string
  plain_body: string | null
}
interface TemplateData {
  template: {
    slug: string
    audience: string
    trigger_hint: string
    active: number
    recipient_to:  string
    recipient_cc:  string
    recipient_bcc: string
    priority:      number
  }
  langs: Lang[]
}

const PRIORITY_LEVELS = [
  { value: 10, label: 'Critique',   hint: 'UX bloquant si retard (welcome, confirmation commande, reset mdp)' },
  { value: 20, label: 'Important',  hint: 'Délai gênant (devis, expédition, RIB virement)' },
  { value: 50, label: 'Standard',   hint: 'Notifs admin, transactionnel non urgent' },
  { value: 80, label: 'Marketing',  hint: 'Peut attendre (relance panier, newsletter, promo)' },
]

const { data: tplData, refresh } = await useFetch<TemplateData>(`/api/bo/email-templates/${slug}`)

const recipientForm = reactive({
  recipient_to:  '',
  recipient_cc:  '',
  recipient_bcc: '',
  priority:      50,
})
function syncRecipients() {
  const t = tplData.value?.template
  if (!t) return
  recipientForm.recipient_to  = t.recipient_to  || ''
  recipientForm.recipient_cc  = t.recipient_cc  || ''
  recipientForm.recipient_bcc = t.recipient_bcc || ''
  recipientForm.priority      = Number(t.priority ?? 50)
}
syncRecipients()
watch(tplData, syncRecipients)

const isAdminTemplate = computed(() => tplData.value?.template?.audience === 'admin')

const recipientsSaving = ref(false)
async function saveRecipients() {
  recipientsSaving.value = true
  message.value = ''
  errorMsg.value = ''
  try {
    await $fetch(`/api/bo/email-templates/${slug}`, {
      method: 'PUT',
      body: {
        recipient_to:  recipientForm.recipient_to,
        recipient_cc:  recipientForm.recipient_cc,
        recipient_bcc: recipientForm.recipient_bcc,
        priority:      recipientForm.priority,
      },
    })
    message.value = 'Destinataires + priorité enregistrés.'
    await refresh()
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    recipientsSaving.value = false
  }
}

const LANG_LABELS: Record<number, string> = { 1: 'Français', 2: 'English' }

const formByLang = reactive<Record<number, Lang>>({})
function syncForm() {
  for (const l of tplData.value?.langs ?? []) {
    formByLang[l.id_lang] = { ...l }
  }
  
  for (const id of [1, 2]) {
    if (!formByLang[id]) formByLang[id] = { id_lang: id, subject: '', html_body: '', plain_body: null }
  }
}
syncForm()
watch(tplData, syncForm)

const activeLang = ref<number>(1)
const saving = ref(false)
const message = ref('')
const errorMsg = ref('')

async function save(idLang: number) {
  saving.value = true
  message.value = ''
  errorMsg.value = ''
  try {
    const body = formByLang[idLang]
    await $fetch(`/api/bo/email-templates/${slug}`, {
      method: 'PUT',
      body: {
        id_lang:    idLang,
        subject:    body.subject,
        html_body:  body.html_body,
        plain_body: body.plain_body,
      },
    })
    message.value = `${LANG_LABELS[idLang]} : enregistré.`
    await refresh()
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    saving.value = false
  }
}

const previewSrcDoc = computed(() => formByLang[activeLang.value]?.html_body || '<p style="color:#999;font-family:sans-serif;padding:1rem">(corps HTML vide — saisir à gauche pour prévisualiser)</p>')

const testTo = ref('')
const testing = ref(false)
const testMessage = ref('')
const testError = ref('')

async function sendTest() {
  testMessage.value = ''
  testError.value = ''
  if (!testTo.value || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(testTo.value)) {
    testError.value = 'Adresse email invalide'
    return
  }
  testing.value = true
  try {
    const r = await $fetch<{ ok: boolean; id?: string; to: string }>(
      `/api/bo/email-templates/${slug}/test-send`,
      { method: 'POST', body: { id_lang: activeLang.value, to: testTo.value.trim() } },
    )
    testMessage.value = `✓ Envoyé à ${r.to} (id ${r.id || '—'}). Variables d'exemple substituées.`
  } catch (err: any) {
    testError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <NuxtLink to="/hub/crm/email" class="text-xs text-gray-500 hover:text-primary-600 transition-colors mb-2 inline-block">
          ← Retour à la liste des emails
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ tplData?.template?.slug }}
          <span v-if="tplData?.template?.audience" class="ml-2 text-xs uppercase tracking-wide px-2 py-0.5 rounded-full"
                :class="tplData.template.audience === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
            {{ tplData.template.audience }}
          </span>
        </h1>
        <p v-if="tplData?.template?.trigger_hint" class="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">
          Déclencheur : {{ tplData.template.trigger_hint }}
        </p>
      </div>
    </div>

    
    <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm mb-6">
      <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
        <button
          v-for="(label, id) in LANG_LABELS"
          :key="id"
          type="button"
          :aria-selected="activeLang === Number(id)"
          :class="[
            'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium',
            activeLang === Number(id)
              ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
          ]"
          @click="activeLang = Number(id)"
        >
          {{ label }}
        </button>
      </nav>
    </div>

    <div v-if="message" class="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{{ message }}</div>
    <div v-if="errorMsg" class="mb-4 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{{ errorMsg }}</div>

    
    <section class="mb-6 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700/40 p-5 space-y-3">
      <div>
        <h2 class="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
          Priorité d'envoi
        </h2>
        <p class="text-xs text-indigo-800 dark:text-indigo-300">
          Le worker traite la queue par ordre de priorité (0 = critique en premier,
          100 = marketing en dernier). Si plusieurs emails sont en attente, les plus
          critiques partent avant.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <label
          v-for="lvl in PRIORITY_LEVELS"
          :key="lvl.value"
          :class="[
            'cursor-pointer rounded-lg border-2 px-3 py-2 transition-colors',
            recipientForm.priority === lvl.value
              ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30'
              : 'border-indigo-200 dark:border-indigo-700/40 hover:border-indigo-400',
          ]"
          :title="lvl.hint"
        >
          <input v-model.number="recipientForm.priority" type="radio" :value="lvl.value" class="sr-only" />
          <div class="text-xs font-bold text-indigo-900 dark:text-indigo-200">{{ lvl.label }}</div>
          <div class="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5">{{ lvl.value }}</div>
        </label>
      </div>
      <button
        type="button"
        :disabled="recipientsSaving"
        class="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
        @click="saveRecipients"
      >
        {{ recipientsSaving ? 'Enregistrement…' : 'Enregistrer la priorité' }}
      </button>
    </section>

    
    <section
      v-if="isAdminTemplate"
      class="mb-6 rounded-xl border p-5 space-y-3"
      :class="!recipientForm.recipient_to
        ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-300 dark:border-rose-700/50'
        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40'"
    >
      <div>
        <h2
          class="text-sm font-semibold mb-1"
          :class="!recipientForm.recipient_to
            ? 'text-rose-900 dark:text-rose-200'
            : 'text-amber-900 dark:text-amber-200'"
        >
          Destinataires admin
          <span
            v-if="!recipientForm.recipient_to"
            class="ml-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 dark:bg-rose-800/60 dark:text-rose-100"
          >
            ⚠ Vide — email non envoyé
          </span>
        </h2>
        <p
          class="text-xs"
          :class="!recipientForm.recipient_to
            ? 'text-rose-800 dark:text-rose-300'
            : 'text-amber-800 dark:text-amber-300'"
        >
          Adresses séparées par virgule (ou point-virgule).
          <strong v-if="!recipientForm.recipient_to">
            Tant que ce champ reste vide, l'email ne sera jamais envoyé
            (fallback env <span class="font-mono">ADMIN_NOTIF_EMAIL</span> rarement défini en preprod).
          </strong>
          <span v-else>Cc/Bcc enregistrés mais non encore utilisés à l'envoi (à câbler côté queue).</span>
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">To</label>
          <input
            v-model="recipientForm.recipient_to"
            type="text"
            placeholder="aude@example-shop.com, alex@codemyshop.com"
            class="w-full px-3 py-2 border border-amber-200 dark:border-amber-700/40 rounded-lg text-sm focus:border-amber-600 focus:outline-none bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">Cc <span class="text-[10px] normal-case opacity-60">(non implémenté)</span></label>
          <input
            v-model="recipientForm.recipient_cc"
            type="text"
            class="w-full px-3 py-2 border border-amber-200 dark:border-amber-700/40 rounded-lg text-sm focus:border-amber-600 focus:outline-none bg-white dark:bg-slate-900 opacity-60"
          />
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">Bcc <span class="text-[10px] normal-case opacity-60">(non implémenté)</span></label>
          <input
            v-model="recipientForm.recipient_bcc"
            type="text"
            class="w-full px-3 py-2 border border-amber-200 dark:border-amber-700/40 rounded-lg text-sm focus:border-amber-600 focus:outline-none bg-white dark:bg-slate-900 opacity-60"
          />
        </div>
      </div>

      <button
        type="button"
        :disabled="recipientsSaving"
        class="text-sm px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors font-medium"
        @click="saveRecipients"
      >
        {{ recipientsSaving ? 'Enregistrement…' : 'Enregistrer les destinataires' }}
      </button>
    </section>

    <div v-if="formByLang[activeLang]" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <section class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 space-y-4">
        <div>
          <label class="block text-xs uppercase tracking-wide text-gray-500 mb-1">Sujet</label>
          <input
            v-model="formByLang[activeLang].subject"
            type="text"
            class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
          />
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wide text-gray-500 mb-1">Corps HTML</label>
          <textarea
            v-model="formByLang[activeLang].html_body"
            rows="20"
            class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
            spellcheck="false"
          ></textarea>
          <p class="text-[10px] text-gray-400 mt-1">
            Variables disponibles selon le contexte : <span class="font-mono">{customer_name}</span>, <span class="font-mono">{order_ref}</span>, <span class="font-mono">{shop_name}</span>, etc. Voir doc trigger.
          </p>
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wide text-gray-500 mb-1">Corps texte (fallback non-HTML, optionnel)</label>
          <textarea
            v-model="formByLang[activeLang].plain_body"
            rows="6"
            class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
            spellcheck="false"
          ></textarea>
        </div>
        <button
          type="button"
          :disabled="saving"
          class="w-full text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
          @click="save(activeLang)"
        >
          {{ saving ? 'Enregistrement…' : `Enregistrer ${LANG_LABELS[activeLang]}` }}
        </button>
      </section>

      
      <section class="rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs uppercase tracking-wide text-gray-500 mb-3">Prévisualisation</h2>
        <iframe
          :srcdoc="previewSrcDoc"
          sandbox="allow-same-origin"
          class="w-full h-[600px] rounded border border-gray-100 dark:border-slate-700 bg-white"
        ></iframe>
      </section>
    </div>

    
    <section class="mt-6 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="min-w-0 flex-1">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Envoyer un test</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400">
            Envoie le template <strong class="font-mono">{{ slug }}</strong> ({{ LANG_LABELS[activeLang] }}) à l'adresse de votre choix
            avec des valeurs d'exemple substituées (ex. <span class="font-mono">{firstname}</span> → "Marie",
            <span class="font-mono">{order_name}</span> → "#PAL2026-1234"…). Sujet préfixé <span class="font-mono">[TEST]</span>.
          </p>
        </div>
      </div>
      <div class="mt-4 flex items-end gap-2 flex-wrap">
        <div class="flex-1 min-w-[260px]">
          <label class="block text-xs uppercase tracking-wide text-gray-500 mb-1">Adresse destinataire</label>
          <input
            v-model="testTo"
            type="email"
            placeholder="vous@exemple.fr"
            class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-600 focus:outline-none bg-white dark:bg-slate-900"
            @keyup.enter="sendTest"
          />
        </div>
        <button
          type="button"
          :disabled="testing || !testTo"
          class="text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium whitespace-nowrap"
          @click="sendTest"
        >
          {{ testing ? 'Envoi…' : 'Envoyer le test' }}
        </button>
      </div>
      <p v-if="testMessage" class="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">{{ testMessage }}</p>
      <p v-if="testError" class="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{{ testError }}</p>
    </section>
  </div>
</template>
