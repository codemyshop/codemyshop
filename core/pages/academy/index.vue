
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const { data: academy } = await useFetch('/api/academy')

const DIFFICULTY_LABELS = computed<Record<string, { label: string; color: string }>>(() => ({
  debutant:      { label: t('academy.difficulty_beginner', 'Débutant'), color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  intermediaire: { label: t('academy.difficulty_intermediate', 'Intermédiaire'), color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  avance:        { label: t('academy.difficulty_advanced', 'Avancé'), color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}))

const MENTOR_ICONS: Record<string, string> = {
  aristote: '🏛️', 'sun-tzu': '⚔️', confucius: '🧘', 'de-gaulle': '🇫🇷',
  vinci: '🎨', machiavel: '🎭', descartes: '🧮', kant: '⚖️',
  hegel: '🔄', socrate: '💬', alexandre: '👑', 'mies-van-der-rohe': '🏗️', jung: '🌗',
}

const mentorsList = computed(() => {
  const raw = academy.value?.mentors ?? {}
  return Object.entries(raw).map(([key, m]: [string, any]) => ({
    key,
    name: m.name,
    title: m.title,
    domain: m.domain ?? m.title,
    philosophy: m.philosophy ?? '',
    quote: m.quote ?? '',
    era: m.era ?? '',
    icon: MENTOR_ICONS[key] ?? '🧠',
    modulesCount: academy.value?.modules?.filter((mod: any) => mod.mentor === key).length ?? 0,
  }))
})

const totalLessons = computed(() =>
  academy.value?.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0
)

const authMode = ref<'none' | 'register' | 'login'>('none')
const authLoading = ref(false)
const authDone = ref(false)
const authError = ref('')

const registerForm = reactive({ pseudo: '', email: '', password: '' })
const loginForm = reactive({ email: '', password: '' })

const isLoggedIn = ref(false)
const sessionPseudo = ref('')

onMounted(async () => {
  try {
    const session = await $fetch<{ loggedIn: boolean; pseudo?: string }>('/api/academy/me')
    if (session.loggedIn) {
      isLoggedIn.value = true
      sessionPseudo.value = session.pseudo ?? ''
    }
  } catch {  }
})

async function submitRegister() {
  if (!registerForm.pseudo || !registerForm.email || !registerForm.password) return
  authLoading.value = true
  authError.value = ''
  try {
    await $fetch('/api/academy/register', { method: 'POST', body: registerForm })
    authDone.value = true
    isLoggedIn.value = true
    sessionPseudo.value = registerForm.pseudo
  } catch (err: any) {
    authError.value = err.data?.message ?? t('academy.auth_error_retry', 'Erreur — réessaie.')
  } finally {
    authLoading.value = false
  }
}

async function submitLogin() {
  if (!loginForm.email || !loginForm.password) return
  authLoading.value = true
  authError.value = ''
  try {
    const res = await $fetch<{ success: boolean; pseudo?: string; message?: string }>('/api/academy/login', { method: 'POST', body: loginForm })
    if (res.success) {
      authDone.value = true
      isLoggedIn.value = true
      sessionPseudo.value = res.pseudo ?? loginForm.email
    } else {
      authError.value = res.message ?? t('academy.auth_error_credentials', 'Identifiants incorrects.')
    }
  } catch (err: any) {
    authError.value = err.data?.message ?? t('academy.auth_error_retry', 'Erreur — réessaie.')
  } finally {
    authLoading.value = false
  }
}

const modulesCount = computed(() => academy.value?.modules?.length || 0)

useHead({
  title: t('academy.meta_title', `Academy — ${brandName}`),
  meta: [
    { name: 'description', content: t('academy.meta_description', `${modulesCount.value} modules et ${totalLessons.value} leçons par ${brandName}.`) },
  ],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Academy ${brandName}`,
      description: academy.value?.subtitle,
      numberOfItems: academy.value?.modules?.length,
      itemListElement: academy.value?.modules?.map((m: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${psFrontUrl}/academy/${m.slug}`,
        name: m.title,
      })),
    }),
  }],
})
</script>

<template>
  <NuxtLayout name="white-label">

    
    <section class="relative pt-28 md:pt-36 pb-20 overflow-hidden bg-white dark:bg-[#0f172a]">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-500/8 dark:bg-primary-500/5 rounded-full blur-[140px]" />
        <div class="absolute -bottom-20 right-1/3 w-[400px] h-[400px] bg-accent-500/6 dark:bg-accent-500/4 rounded-full blur-[120px]" />
      </div>

      <div class="relative max-w-5xl mx-auto px-6 text-center">
        <span class="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-semibold uppercase tracking-[0.2em] px-5 py-2 rounded-full mb-8 border border-primary-200/50 dark:border-primary-500/20">
          {{ t('academy.hero_kicker', `Academy ${brandName}`) }}
        </span>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
          {{ t('academy.hero_h1_line1', 'Tout savoir sur') }}<br>
          <span class="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">{{ t('academy.hero_h1_line2', 'notre métier') }}</span>
        </h1>

        <p class="text-xl text-gray-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {{ t('academy.hero_subtitle', `L'expertise ${brandName} condensée en ${totalLessons} leçons pratiques.`) }}
        </p>

        <div class="flex items-center justify-center gap-8 mb-10">
          <div class="text-center">
            <p class="text-3xl font-extrabold text-primary-600 dark:text-primary-400">{{ modulesCount }}</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{{ t('academy.stat_modules', 'modules') }}</p>
          </div>
          <div class="w-px h-10 bg-gray-200 dark:bg-slate-700" />
          <div class="text-center">
            <p class="text-3xl font-extrabold text-gray-900 dark:text-white">{{ totalLessons }}</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{{ t('academy.stat_lessons', 'leçons') }}</p>
          </div>
          <div class="w-px h-10 bg-gray-200 dark:bg-slate-700" />
          <div class="text-center">
            <p class="text-3xl font-extrabold text-gray-900 dark:text-white">0 €</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{{ t('academy.stat_price', 'prix') }}</p>
          </div>
        </div>

        
        <div v-if="isLoggedIn && !authDone" class="flex items-center justify-center gap-4">
          <span class="text-sm text-gray-500 dark:text-slate-400">{{ t('academy.connected_as', 'Connecté en tant que') }} <strong class="text-gray-900 dark:text-white">{{ sessionPseudo }}</strong></span>
          <NuxtLink to="/academy/mon-parcours"
            class="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-colors">
            {{ t('academy.my_path', 'Mon parcours') }}
          </NuxtLink>
        </div>

        
        <div v-if="!isLoggedIn && authMode === 'none' && !authDone" class="flex items-center justify-center gap-3">
          <button class="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-colors" @click="authMode = 'register'">
            {{ t('academy.register_free', "S'inscrire gratuitement") }}
          </button>
          <button class="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-white font-semibold text-sm transition-colors" @click="authMode = 'login'">
            {{ t('academy.login', 'Se connecter') }}
          </button>
        </div>

        
        <form v-if="authMode === 'register' && !authDone" class="max-w-sm mx-auto space-y-3 mt-2" @submit.prevent="submitRegister">
          <input v-model="registerForm.pseudo" type="text" required minlength="3" :placeholder="t('academy.register_pseudo_placeholder', 'Pseudo')" class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 focus:outline-none" />
          <input v-model="registerForm.email" type="email" required placeholder="Email" class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 focus:outline-none" />
          <input v-model="registerForm.password" type="password" required minlength="8" :placeholder="t('academy.register_password_placeholder', 'Mot de passe (8+ caractères)')" class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 focus:outline-none" />
          <button type="submit" :disabled="authLoading" class="w-full px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-gray-400 text-white font-semibold text-sm transition-colors">{{ authLoading ? t('academy.registering', 'Inscription…') : t('academy.create_account', 'Créer mon compte') }}</button>
          <p class="text-[10px] text-gray-400 dark:text-gray-600 text-center">{{ t('academy.already_registered', 'Déjà inscrit ?') }} <button type="button" class="underline" @click="authMode = 'login'">{{ t('academy.login', 'Se connecter') }}</button></p>
          <p v-if="authError" class="text-red-500 text-xs text-center">{{ authError }}</p>
        </form>

        
        <form v-if="authMode === 'login' && !authDone" class="max-w-sm mx-auto space-y-3 mt-2" @submit.prevent="submitLogin">
          <input v-model="loginForm.email" type="email" required placeholder="Email" class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 focus:outline-none" />
          <input v-model="loginForm.password" type="password" required :placeholder="t('academy.password_placeholder', 'Mot de passe')" class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 focus:outline-none" />
          <button type="submit" :disabled="authLoading" class="w-full px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-gray-400 text-white font-semibold text-sm transition-colors">{{ authLoading ? t('academy.registering', 'Connexion…') : t('academy.login', 'Se connecter') }}</button>
          <p class="text-[10px] text-gray-400 dark:text-gray-600 text-center">{{ t('academy.not_registered', 'Pas encore inscrit ?') }} <button type="button" class="underline" @click="authMode = 'register'">{{ t('academy.create_account', 'Créer un compte') }}</button></p>
          <p v-if="authError" class="text-red-500 text-xs text-center">{{ authError }}</p>
        </form>

        
        <div v-if="authDone" class="mt-2">
          <p class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ t('academy.welcome_title', 'Bienvenue !') }}</p>
          <p class="text-gray-400 text-sm mt-1">{{ t('academy.welcome_subtitle', 'Ton accès Academy est activé.') }}</p>
          <NuxtLink :to="t('academy.welcome_start_url', '/academy/')" class="inline-flex items-center justify-center px-6 py-3 mt-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-colors">
            {{ t('academy.welcome_start', 'Commencer') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    
    <section id="modules" class="py-16 bg-gray-50 dark:bg-[#111827]">
      <div class="max-w-5xl mx-auto px-6">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <NuxtLink
            v-for="mod in academy?.modules"
            :key="mod.id"
            :to="`/academy/${mod.slug}`"
            class="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 hover:border-primary-300 dark:hover:border-primary-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="bg-primary-50 dark:bg-primary-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-all">
                {{ mod.icon }}
              </div>
              <span class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">{{ t('academy.module_label', 'Module') }} {{ mod.id }}</span>
            </div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {{ mod.title }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
              {{ mod.description }}
            </p>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="DIFFICULTY_LABELS[mod.difficulty]?.color || 'bg-gray-100 text-gray-500'">
                {{ DIFFICULTY_LABELS[mod.difficulty]?.label }}
              </span>
              <span class="text-[10px] text-gray-400 dark:text-slate-400">{{ mod.duration }}</span>
              <span class="text-[10px] text-gray-400 dark:text-slate-400">{{ mod.lessons?.length }} {{ t('academy.stat_lessons', 'leçons') }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    
    <section v-if="mentorsList.length" class="py-20 bg-white dark:bg-[#0f172a]">
      <div class="max-w-5xl mx-auto px-6">

        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-accent-500 dark:text-accent-400 mb-4">{{ t('academy.mentors_kicker', 'Les Mentors') }}</p>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
            {{ mentorsList.length }} {{ t('academy.mentors_title_suffix', 'esprits historiques guident chaque leçon') }}
          </h2>
          <p class="text-base text-gray-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {{ t('academy.mentors_subtitle', "Une academy technique sans âme est un tutoriel. Chaque module est guidé par un mentor historique choisi pour sa résonance avec le parcours du fondateur.") }}
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          <NuxtLink
            v-for="m in mentorsList"
            :key="m.key"
            :to="`/academy/mentor/${m.key}`"
            class="group bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 hover:border-primary-300 dark:hover:border-primary-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-3">
              <p class="text-2xl">{{ m.icon }}</p>
              <span v-if="m.modulesCount" class="text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-full">
                {{ m.modulesCount }} {{ t('academy.stat_modules', 'module') }}{{ m.modulesCount > 1 ? 's' : '' }}
              </span>
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ m.name }}</h3>
            <p class="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">{{ m.domain }}</p>
            <p class="text-xs text-gray-400 dark:text-slate-400 mb-3">{{ m.era }}</p>
            <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">{{ m.philosophy }}</p>
            <p class="text-xs text-gray-400 dark:text-slate-400 italic border-l-2 border-primary-500/30 pl-3 line-clamp-2">
              « {{ m.quote }} »
            </p>
          </NuxtLink>
        </div>

        
        <div v-if="t('academy.expertise_p1', '')" class="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 max-w-3xl mx-auto">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">{{ t('academy.expertise_heading', `L'expertise ${brandName} à votre service`) }}</h3>
          <div class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed space-y-3">
            <p v-if="t('academy.expertise_p1', '')">{{ t('academy.expertise_p1') }}</p>
            <p v-if="t('academy.expertise_p2', '')" v-html="t('academy.expertise_p2')" />
            <p v-if="t('academy.expertise_p3', '')">{{ t('academy.expertise_p3') }}</p>
          </div>
          <p v-if="t('academy.expertise_signature', '')" class="text-xs text-gray-400 dark:text-slate-400 mt-4 italic">— {{ t('academy.expertise_signature') }}</p>
        </div>

      </div>
    </section>

    
    <section class="py-20 bg-gray-50 dark:bg-[#111827]">
      <div class="max-w-2xl mx-auto px-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-primary-500/20">🎓</div>
        <h2 class="text-2xl font-extrabold text-gray-900 dark:text-white mb-4">{{ t('academy.cta_title', 'Un mot manque ?') }}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-6">{{ t('academy.cta_subtitle', 'Toutes les définitions utilisées dans les leçons sont compilées dans le dictionnaire.') }}</p>
        <NuxtLink
          to="/dictionnaire"
          class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors mb-6"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
          {{ t('academy.discover_academy_cta', 'Consulter le dictionnaire') }}
        </NuxtLink>
        <p class="text-xs text-gray-400 dark:text-slate-400">© {{ new Date().getFullYear() }} {{ brandName }}</p>
      </div>
    </section>

  </NuxtLayout>
</template>
