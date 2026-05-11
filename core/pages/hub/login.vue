
<script setup lang="ts">
definePageMeta({ layout: false, ssr: false })

const router = useRouter()
const route = useRoute()
const _cfg = useRuntimeConfig()
const isDemo = Boolean((_cfg.public as any)?.isDemo)

const { login, user } = useAuth({ forceEmployee: true })
const error = ref('')
const loading = ref(false)
const form = reactive({
  email: isDemo ? 'demo@codemyshop.com' : '',
  password: isDemo ? 'demo' : '',
})

function resolveRedirect(): string {
  const raw = route.query.redirect
  const target = Array.isArray(raw) ? raw[0] : raw
  if (typeof target !== 'string' || !target.startsWith('/hub/')) return '/hub/dashboard'
  if (target.startsWith('//')) return '/hub/dashboard'
  return target
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res = await login(form.email, form.password)
    if (res.success && user.value?.user_type === 'employee') {
      router.push(resolveRedirect())
      return
    }
    error.value = res.error || 'Identifiants incorrects ou compte non employé.'
  } catch (err: any) {
    error.value = 'Erreur de connexion au serveur.'
  } finally {
    loading.value = false
  }
}

useHead({ title: 'Accès employé — Hub' })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-900 dark:text-slate-100">Accès employé</h1>
          <p class="text-xs text-gray-400">Tableau de bord</p>
        </div>
      </div>

      <div v-if="isDemo" class="mb-5 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
        <p class="font-semibold mb-0.5">Démo CodeMyShop</p>
        <p>Identifiants pré-remplis (<code class="font-mono">demo</code> / <code class="font-mono">demo</code>). Données réinitialisées chaque nuit.</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Email</label>
          <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:border-primary-500 focus:outline-none" placeholder="nom@entreprise.com" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Mot de passe</label>
          <input v-model="form.password" type="password" required class="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:border-primary-500 focus:outline-none" />
        </div>

        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

        <button type="submit" :disabled="loading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>
