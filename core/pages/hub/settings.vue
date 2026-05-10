<template>
  <div class="flex-1 overflow-auto">
    <header class="sticky top-0 z-10 px-8 py-5 border-b border-white/5 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">Configuration compte</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Préférences personnelles staff</p>
        </div>
      </div>
    </header>

    <div class="p-8 max-w-3xl mx-auto space-y-6">
      <section class="rounded-2xl border bg-white border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/50 p-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">Identité</h2>
        <p class="text-xs text-gray-500 dark:text-slate-500 mb-4">Données extraites de PrestaShop (ps_employee).</p>

        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">Prénom</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.firstname || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">Nom</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.lastname || '—' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">Email</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">Rôle</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.role || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">Admin</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.is_admin ? 'Oui' : 'Non' }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-2xl border bg-white border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/50 p-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">Session</h2>
        <p class="text-xs text-gray-500 dark:text-slate-500 mb-4">Déconnexion propre du back-office staff.</p>
        <button
          class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          @click="logoutAndGoHome"
        >
          Se déconnecter
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const auth = useAuth()
const router = useRouter()
const user = computed(() => auth.user.value)

async function logoutAndGoHome() {
  await auth.logout()
  router.push('/')
}
</script>
