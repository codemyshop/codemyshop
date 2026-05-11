
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const route = useRoute()
const moduleSlug = route.params.slug as string
const lessonSlug = route.params.lesson as string

const { data: mod, error } = await useFetch(`/api/academy/${moduleSlug}`)
const { data: academyData } = await useFetch('/api/academy')

if (error.value || !mod.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

const mentorKey = mod.value.mentor as string | undefined
const mentor = computed(() => {
  if (!mentorKey || !academyData.value?.mentors) return null
  return academyData.value.mentors[mentorKey] || null
})

const mentorQuote = ref<{ quote: string; source: string } | null>(null)

const lessonIndex = mod.value.lessons?.findIndex((l: any) => l.slug === lessonSlug) ?? -1
const lessonData = lessonIndex >= 0 ? mod.value.lessons[lessonIndex] : null

if (!lessonData) {
  throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
}

async function loadMentorQuote() {
  try {
    const result = await $fetch<{ success: boolean; quote: string | null; source: string | null }>('/api/academy/mentor-quote', {
      params: { module_slug: moduleSlug, lesson_index: lessonIndex },
    })
    if (result.success && result.quote) {
      mentorQuote.value = { quote: result.quote, source: result.source || '' }
      return
    }
  } catch {  }

  if (lessonData?.mentorQuote) {
    mentorQuote.value = { quote: lessonData.mentorQuote, source: lessonData.mentorSource || '' }
  }
}

onMounted(() => { loadMentorQuote() })

const totalLessons = mod.value.lessons?.length || 0
const prevLesson = lessonIndex > 0 ? mod.value.lessons[lessonIndex - 1] : null
const nextLesson = lessonIndex < totalLessons - 1 ? mod.value.lessons[lessonIndex + 1] : null

useHead({
  title: `${lessonData.title} — ${mod.value.title} | Academy`,
  meta: [
    { name: 'description', content: lessonData.takeaway || lessonData.content?.slice(0, 160) || '' },
    { property: 'og:title', content: `${lessonData.title} — Academy` },
    { property: 'og:description', content: lessonData.takeaway || '' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        '@id': `${psFrontUrl}/academy/${moduleSlug}/${lessonSlug}`,
        name: lessonData.title,
        description: lessonData.takeaway,
        url: `${psFrontUrl}/academy/${moduleSlug}/${lessonSlug}`,
        learningResourceType: 'lesson',
        educationalLevel: mod.value.difficulty === 'debutant' ? 'Beginner' : mod.value.difficulty === 'avance' ? 'Advanced' : 'Intermediate',
        inLanguage: 'fr',
        timeRequired: `PT${Math.ceil((lessonData.content?.length || 500) / 250)}M`,
        teaches: lessonData.takeaway,
        isAccessibleForFree: true,
        position: lessonIndex + 1,
        isPartOf: {
          '@type': 'Course',
          '@id': `${psFrontUrl}/academy/${moduleSlug}`,
          name: mod.value.title,
          url: `${psFrontUrl}/academy/${moduleSlug}`,
          provider: {
            '@type': 'Organization',
            name: `${brandName} — Academy`,
            url: `${psFrontUrl}/academy`,
          },
          educationalCredentialAwarded: {
            '@type': 'EducationalOccupationalCredential',
            name: `Certification Academy — ${mod.value.title}`,
            credentialCategory: 'Certificate',
          },
        },
        author: { '@type': 'Organization', name: brandName, url: psFrontUrl },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('silo.breadcrumb_home', 'Accueil'), item: psFrontUrl },
          { '@type': 'ListItem', position: 2, name: t('academy.breadcrumb', 'Academy'), item: `${psFrontUrl}/academy` },
          { '@type': 'ListItem', position: 3, name: mod.value.title, item: `${psFrontUrl}/academy/${moduleSlug}` },
          { '@type': 'ListItem', position: 4, name: lessonData.title, item: `${psFrontUrl}/academy/${moduleSlug}/${lessonSlug}` },
        ],
      }),
    },
  ],
})

const suggestedQuestion = computed(() => {
  const tk = lessonData?.takeaway || ''
  if (tk.length > 20) return `Comment appliquer "${tk.slice(0, 80)}${tk.length > 80 ? '...' : ''}" dans mon cas ?`
  return ''
})

const learnerSession = ref<{ learnerId: number; pseudo: string } | null>(null)
const lessonCompleted = ref(false)
const completingLesson = ref(false)

onMounted(() => {
  try {
    const cookie = useCookie('hub_session')
    if (cookie.value) {
      const data = JSON.parse(atob(cookie.value as string))
      if (data.learnerId) {
        learnerSession.value = { learnerId: data.learnerId, pseudo: data.pseudo }
      }
    }
  } catch {  }
})

async function markCompleted() {
  if (!learnerSession.value) return
  completingLesson.value = true
  try {
    await $fetch('/api/academy/progress', {
      method: 'POST',
      body: {
        learner_id: learnerSession.value.learnerId,
        module_slug: moduleSlug,
        lesson_index: lessonIndex,
        status: 'completed',
        score: 80,
        time_spent: 120,
      },
    })
    lessonCompleted.value = true
  } catch {  }
  completingLesson.value = false
}
</script>

<template>
  <NuxtLayout name="white-label">

    
    <section class="relative pt-28 md:pt-36 pb-12 overflow-hidden bg-white dark:bg-[#0f172a]">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-10 left-1/3 w-[500px] h-[500px] bg-primary-500/6 dark:bg-primary-500/4 rounded-full blur-[140px]" />
      </div>

      <div class="relative max-w-3xl mx-auto px-6">
        <nav :aria-label="t('silo.breadcrumb_aria', 'Fil d\'Ariane')" class="text-sm text-gray-600 dark:text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
          <NuxtLink to="/" class="hover:text-primary-600 transition-colors">{{ t('silo.breadcrumb_home', 'Accueil') }}</NuxtLink>
          <span>/</span>
          <NuxtLink to="/academy" class="hover:text-primary-600 transition-colors">{{ t('academy.breadcrumb', 'Academy') }}</NuxtLink>
          <span>/</span>
          <NuxtLink :to="`/academy/${moduleSlug}`" class="hover:text-primary-600 transition-colors truncate max-w-[140px]">{{ mod?.title }}</NuxtLink>
          <span>/</span>
          <span class="text-gray-400 dark:text-slate-500 truncate max-w-[180px]">{{ lessonData?.title }}</span>
        </nav>

        <NuxtLink :to="`/academy/${moduleSlug}`" class="inline-flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:underline mb-4">
          <span class="text-lg">{{ mod?.icon }}</span>
          {{ t('academy.module_label', 'Module') }} {{ mod?.id }}
        </NuxtLink>

        <div class="flex items-start gap-5 mb-6">
          <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg shadow-primary-500/20">
            {{ lessonIndex + 1 }}
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {{ lessonData?.title }}
            </h1>
            <p class="text-xs text-gray-400 dark:text-slate-500 mt-2">{{ t('academy.lesson_label', 'Leçon') }} {{ lessonIndex + 1 }} / {{ totalLessons }} — {{ mod?.duration }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            v-for="(l, i) in mod?.lessons"
            :key="l.slug"
            :to="`/academy/${moduleSlug}/${l.slug}`"
            :title="l.title"
            class="h-2 flex-1 rounded-full transition-colors duration-300"
            :class="i <= lessonIndex ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-200 dark:bg-slate-700 hover:bg-primary-300 dark:hover:bg-primary-500/30'"
          />
        </div>
      </div>
    </section>

    
    <section class="pb-12 bg-white dark:bg-[#0f172a]">
      <div class="max-w-3xl mx-auto px-6">

        <blockquote v-if="mentor" class="mb-10 pl-5 border-l-4 border-primary-400/40 dark:border-primary-500/30">
          <p class="text-base italic text-gray-600 dark:text-slate-400 leading-relaxed mb-2">« {{ mentorQuote?.quote || mentor.quote }} »</p>
          <footer class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-400">
              {{ mentor.name?.charAt(0) }}
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-slate-200">{{ mentor.name }}</p>
              <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest">{{ mentor.title }} · {{ mentorQuote?.source || mentor.era }}</p>
            </div>
          </footer>
        </blockquote>

        <article>
          <div class="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-slate-300" v-html="lessonData?.content"></div>
        </article>

        <div class="mt-8 bg-gradient-to-r from-primary-50 to-accent-50/30 dark:from-primary-500/10 dark:to-accent-500/5 border border-primary-100 dark:border-primary-500/20 rounded-xl p-6">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
            </div>
            <p class="text-sm text-primary-800 dark:text-primary-300 leading-relaxed">
              <strong class="font-semibold">{{ t('academy.takeaway', 'À retenir') }} :</strong> {{ lessonData?.takeaway }}
            </p>
          </div>
        </div>

        <div v-if="lessonData?.dictionaryTerms?.length" class="mt-8">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 class="text-sm font-bold text-gray-800 dark:text-white">{{ t('academy.dictionary_terms', 'Termes du dictionnaire') }}</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="term in lessonData.dictionaryTerms"
              :key="term"
              :to="`/dictionnaire/${term}`"
              class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-200 dark:border-accent-500/20 hover:bg-accent-100 dark:hover:bg-accent-500/20 transition-colors"
            >
              {{ term }}
            </NuxtLink>
          </div>
        </div>

        <div v-if="mod?.relatedArticles?.length" class="mt-10">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" />
            </svg>
            <h3 class="text-sm font-bold text-gray-800 dark:text-white">{{ t('academy.blog_section', 'Articles liés') }}</h3>
          </div>
          <div class="grid gap-3">
            <NuxtLink
              v-for="article in mod.relatedArticles"
              :key="article.id"
              :to="article.url"
              class="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-sm transition-all"
            >
              <img
                v-if="article.coverImage"
                :src="article.coverImage"
                :alt="article.title"
                class="w-16 h-16 rounded-lg object-cover shrink-0"
                loading="lazy"
              >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                  {{ article.title }}
                </p>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {{ article.excerpt }}
                </p>
              </div>
            </NuxtLink>
          </div>
        </div>

        <AcademyQaSection
          :module-slug="moduleSlug"
          :lesson-index="lessonIndex"
          :suggested-question="suggestedQuestion"
        />
      </div>
    </section>

    
    <section v-if="learnerSession" class="py-6 bg-white dark:bg-[#0f172a]">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <button v-if="!lessonCompleted"
          :disabled="completingLesson"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-400 text-white font-semibold text-sm transition-colors"
          @click="markCompleted"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          {{ completingLesson ? t('academy.lesson_completing', 'Sauvegarde…') : t('academy.lesson_mark_completed', 'Marquer comme complétée') }}
        </button>
        <div v-else class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          {{ t('academy.lesson_completed', 'Leçon complétée') }}
        </div>
      </div>
    </section>

    
    <section class="py-12 bg-gray-50 dark:bg-[#111827]">
      <div class="max-w-3xl mx-auto px-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NuxtLink
            v-if="prevLesson"
            :to="`/academy/${moduleSlug}/${prevLesson.slug}`"
            class="group flex items-center gap-3 p-5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all"
          >
            <svg class="w-5 h-5 text-gray-400 shrink-0 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-widest">{{ t('academy.lesson_prev', 'Leçon précédente') }}</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ prevLesson.title }}</p>
            </div>
          </NuxtLink>
          <div v-else />

          <NuxtLink
            v-if="nextLesson"
            :to="`/academy/${moduleSlug}/${nextLesson.slug}`"
            class="group flex items-center gap-3 p-5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all sm:text-right sm:flex-row-reverse"
          >
            <svg class="w-5 h-5 text-gray-400 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-widest">{{ t('academy.lesson_next', 'Leçon suivante') }}</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ nextLesson.title }}</p>
            </div>
          </NuxtLink>

          <NuxtLink
            v-else-if="mod?.next"
            :to="`/academy/${mod.next.slug}`"
            class="group flex items-center gap-3 p-5 rounded-xl border border-primary-200 dark:border-primary-500/20 bg-primary-50 dark:bg-primary-500/10 hover:shadow-md transition-all sm:text-right sm:flex-row-reverse"
          >
            <svg class="w-5 h-5 text-primary-500 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            <div>
              <p class="text-[10px] text-primary-500 uppercase tracking-widest">{{ t('academy.module_next', 'Module suivant') }}</p>
              <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">{{ mod.next.title }}</p>
            </div>
          </NuxtLink>
        </div>

        <div class="text-center mt-8">
          <NuxtLink :to="`/academy/${moduleSlug}`" class="text-sm text-gray-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {{ t('academy.lesson_back_module', '← Retour au module') }}
          </NuxtLink>
        </div>
      </div>
    </section>

  </NuxtLayout>
</template>
