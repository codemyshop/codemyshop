<!--
  Academy — Page module (cluster page SEO) tenant-neutre.
  Liste les leçons avec liens vers /academy/[slug]/[lesson].
  Contenu : /api/academy/:slug (tenant-aware côté serveur).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const route = useRoute()
const slug = route.params.slug as string

const { data: mod, error } = await useFetch(`/api/academy/${slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

const mentor = computed(() => mod.value?.mentorData || null)

// PDF Download
const generatingPdf = ref(false)

async function downloadPdf() {
  if (!mod.value || generatingPdf.value) return
  generatingPdf.value = true

  try {
    const m = mod.value
    const mentorData = mentor.value
    const lessons = m.lessons || []
    const difficultyLabel =
      m.difficulty === 'debutant' ? t('academy.difficulty_beginner', 'Débutant')
      : m.difficulty === 'avance' ? t('academy.difficulty_advanced', 'Avancé')
      : t('academy.difficulty_intermediate', 'Intermédiaire')

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; color: #1a1a2e; line-height: 1.7; padding: 0; }
          .cover { page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #ec4899 100%); color: white; padding: 3cm; }
          .cover h1 { font-size: 2.4em; font-weight: 800; margin-bottom: 0.3em; line-height: 1.2; }
          .cover .subtitle { font-size: 1.1em; opacity: 0.9; margin-bottom: 2em; max-width: 500px; }
          .cover .author { font-size: 0.9em; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 1em; margin-top: auto; }
          .cover .mentor-badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 1em 1.5em; margin-top: 2em; font-style: italic; font-size: 0.95em; }
          .cover .mentor-name { font-weight: 700; font-style: normal; font-size: 0.85em; margin-top: 0.5em; opacity: 0.8; }
          .content { padding: 2cm 2.5cm; }
          .toc { page-break-after: always; }
          .toc h2 { font-size: 1.5em; color: #4F46E5; margin-bottom: 1em; }
          .toc-item { display: flex; justify-content: space-between; padding: 0.5em 0; border-bottom: 1px dotted #ddd; font-size: 0.95em; }
          .toc-num { color: #4F46E5; font-weight: 700; margin-right: 0.5em; }
          .lesson { page-break-before: always; }
          .lesson:first-of-type { page-break-before: auto; }
          .lesson-header { display: flex; align-items: center; gap: 0.7em; margin-bottom: 1.5em; }
          .lesson-num { width: 2.2em; height: 2.2em; border-radius: 50%; background: #4F46E5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1em; flex-shrink: 0; }
          .lesson h2 { font-size: 1.4em; color: #1a1a2e; font-weight: 700; }
          .lesson p { margin-bottom: 1em; text-align: justify; }
          .takeaway { background: #f0f0ff; border-left: 4px solid #4F46E5; padding: 1em 1.2em; border-radius: 0 8px 8px 0; margin: 1.5em 0; }
          .takeaway strong { color: #4F46E5; }
          .footer-page { text-align: center; font-size: 0.75em; color: #999; margin-top: 3em; padding-top: 1em; border-top: 1px solid #eee; }
          .footer-page a { color: #4F46E5; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="cover">
          <div style="font-size: 0.8em; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.7; margin-bottom: 1em;">Academy — Module ${m.id}</div>
          <h1>${m.title}</h1>
          <p class="subtitle">${m.description}</p>
          ${mentorData ? `
            <div class="mentor-badge">
              « ${mentorData.quote} »
              <div class="mentor-name">${mentorData.name} — ${mentorData.title}</div>
            </div>
          ` : ''}
          <div class="author">
            ${brandName} — ${psFrontUrl.replace(/^https?:\/\//, '')}<br>
            ${difficultyLabel} · ${m.duration}
          </div>
        </div>

        <div class="content">
          <div class="toc">
            <h2>${t('academy.toc_title', 'Sommaire')}</h2>
            ${lessons.map((l: any, i: number) => `
              <div class="toc-item">
                <span><span class="toc-num">${i + 1}</span> ${l.title}</span>
              </div>
            `).join('')}
          </div>

          ${lessons.map((l: any, i: number) => `
            <div class="lesson">
              <div class="lesson-header">
                <div class="lesson-num">${i + 1}</div>
                <h2>${l.title}</h2>
              </div>
              <p>${l.content}</p>
              <div class="takeaway">
                <strong>${t('academy.takeaway', 'À retenir')} :</strong> ${l.takeaway}
              </div>
            </div>
          `).join('')}

          <div class="footer-page">
            Academy ${brandName} — <a href="${psFrontUrl}/academy">${psFrontUrl.replace(/^https?:\/\//, '')}/academy</a><br>
            © ${new Date().getFullYear()} ${brandName}
          </div>
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => { win.print() }, 500)
    }
  } finally {
    generatingPdf.value = false
  }
}

const DIFFICULTY_LABELS = computed<Record<string, { label: string; color: string }>>(() => ({
  debutant:      { label: t('academy.difficulty_beginner', 'Débutant'), color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  intermediaire: { label: t('academy.difficulty_intermediate', 'Intermédiaire'), color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  avance:        { label: t('academy.difficulty_advanced', 'Avancé'), color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}))

useHead({
  title: `${mod.value?.title} — Academy | ${brandName}`,
  meta: [
    { name: 'description', content: mod.value?.description || '' },
    { property: 'og:title', content: `${mod.value?.title} — Academy` },
    { property: 'og:description', content: mod.value?.description || '' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Course',
        '@id': `${psFrontUrl}/academy/${slug}`,
        name: mod.value?.title,
        description: mod.value?.description,
        url: `${psFrontUrl}/academy/${slug}`,
        provider: {
          '@type': 'Organization',
          name: `${brandName} — Academy`,
          url: `${psFrontUrl}/academy`,
        },
        isAccessibleForFree: true,
        inLanguage: 'fr',
        courseCode: `${brandName.slice(0, 3).toUpperCase()}-${String(mod.value?.id).padStart(3, '0')}`,
        educationalLevel: mod.value?.difficulty === 'debutant' ? 'Beginner' : mod.value?.difficulty === 'avance' ? 'Advanced' : 'Intermediate',
        teaches: mod.value?.description,
        numberOfLessons: mod.value?.lessons?.length || 0,
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: mod.value?.duration,
          instructor: { '@type': 'Person', name: mentor.value?.name || brandName },
        },
        educationalCredentialAwarded: {
          '@type': 'EducationalOccupationalCredential',
          name: `Certification Academy — ${mod.value?.title}`,
          credentialCategory: 'Certificate',
          educationalLevel: mod.value?.difficulty === 'debutant' ? 'Beginner' : mod.value?.difficulty === 'avance' ? 'Advanced' : 'Intermediate',
        },
        hasPart: mod.value?.lessons?.map((l: any, i: number) => ({
          '@type': 'LearningResource',
          '@id': `${psFrontUrl}/academy/${slug}/${l.slug}`,
          name: l.title,
          url: `${psFrontUrl}/academy/${slug}/${l.slug}`,
          position: i + 1,
          learningResourceType: 'lesson',
          isAccessibleForFree: true,
        })),
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
          { '@type': 'ListItem', position: 3, name: mod.value?.title, item: `${psFrontUrl}/academy/${slug}` },
        ],
      }),
    },
  ],
})
</script>

<template>
  <NuxtLayout name="white-label">

    <!-- HERO -->
    <section class="relative pt-28 md:pt-36 pb-16 overflow-hidden bg-white dark:bg-[#0f172a]">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-10 left-1/3 w-[500px] h-[500px] bg-primary-500/6 dark:bg-primary-500/4 rounded-full blur-[140px]" />
      </div>

      <div class="relative max-w-3xl mx-auto px-6">
        <!-- Breadcrumb -->
        <nav :aria-label="t('silo.breadcrumb_aria', 'Fil d\'Ariane')" class="text-sm text-gray-600 dark:text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
          <NuxtLink to="/" class="hover:text-primary-600 transition-colors">{{ t('silo.breadcrumb_home', 'Accueil') }}</NuxtLink>
          <span>/</span>
          <NuxtLink to="/academy" class="hover:text-primary-600 transition-colors">{{ t('academy.breadcrumb', 'Academy') }}</NuxtLink>
          <span>/</span>
          <span class="text-gray-400 dark:text-slate-500 truncate max-w-xs">{{ mod?.title }}</span>
        </nav>

        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <span class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">{{ t('academy.module_label', 'Module') }} {{ mod?.id }} / {{ mod?.totalModules }}</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="DIFFICULTY_LABELS[mod?.difficulty]?.color || 'bg-gray-100 text-gray-500'">
            {{ DIFFICULTY_LABELS[mod?.difficulty]?.label }}
          </span>
          <span class="text-[10px] text-gray-400 dark:text-slate-500">{{ mod?.duration }}</span>
        </div>

        <div class="flex items-start gap-5 mb-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-primary-500/20">
            {{ mod?.icon }}
          </div>
          <div>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">{{ mod?.title }}</h1>
            <p class="text-base text-gray-500 dark:text-slate-400 leading-relaxed" v-html="mod?.description"></p>
          </div>
        </div>

        <!-- Badge Mentor -->
        <div v-if="mentor" class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06]">
          <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center text-lg font-bold text-primary-700 dark:text-primary-400 shrink-0">
            {{ mentor.name?.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-gray-800 dark:text-slate-200">
              {{ t('academy.mentor_guided_by', 'Guidé par') }} {{ mentor.name }} <span class="font-normal text-gray-400 dark:text-slate-500">— {{ mentor.title }}</span>
            </p>
            <p class="text-[11px] text-gray-500 dark:text-slate-400 italic mt-0.5 truncate">« {{ mentor.quote }} »</p>
          </div>
          <span class="text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">{{ mentor.domain }}</span>
        </div>

        <!-- Download PDF button -->
        <button
          @click="downloadPdf"
          :disabled="generatingPdf"
          class="mt-6 w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500/30 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-all group"
        >
          <svg class="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span class="text-sm font-semibold text-gray-500 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {{ generatingPdf ? t('academy.module_generating_pdf', 'Génération PDF…') : t('academy.module_download_pdf', 'Télécharger le module en PDF') }}
          </span>
        </button>
      </div>
    </section>

    <!-- LESSONS LIST -->
    <section class="pb-20 bg-white dark:bg-[#0f172a]">
      <div class="max-w-3xl mx-auto px-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-widest">{{ mod?.lessons?.length }} {{ t('academy.stat_lessons', 'leçons') }}</h2>

        <div class="space-y-4">
          <NuxtLink
            v-for="(lesson, i) in mod?.lessons"
            :key="lesson.slug"
            :to="`/academy/${slug}/${lesson.slug}`"
            class="group flex items-start gap-4 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md shadow-primary-500/20">
              {{ i + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {{ lesson.title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">{{ lesson.content?.replace(/<[^>]+>/g, '').substring(0, 200) }}</p>
            </div>
            <svg class="w-5 h-5 text-gray-300 dark:text-slate-600 shrink-0 mt-1 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- MAILLAGE TRIDIRECTIONNEL -->
    <section v-if="mod?.relatedArticles?.length || mod?.relatedExpertise?.length" class="pb-16 bg-white dark:bg-[#0f172a]">
      <div class="max-w-3xl mx-auto px-6">

        <div v-if="mod?.relatedArticles?.length" class="mb-10">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 class="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">{{ t('academy.blog_section', 'Articles liés') }}</h3>
          </div>
          <div class="grid gap-3">
            <NuxtLink
              v-for="item in mod.relatedArticles"
              :key="typeof item === 'string' ? item : item.url"
              :to="typeof item === 'string' ? item : item.url"
              class="group flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-sm transition-all"
            >
              <div class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" />
                </svg>
              </div>
              <span class="text-sm text-gray-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                {{ typeof item === 'string' ? item.split('/').pop()?.replace(/-/g, ' ') : item.title }}
              </span>
              <svg class="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0 ml-auto group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </NuxtLink>
          </div>
        </div>

        <div v-if="mod?.relatedExpertise?.length">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
            <h3 class="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-widest">{{ t('academy.guides_section', 'Guides experts') }}</h3>
          </div>
          <div class="grid gap-3">
            <NuxtLink
              v-for="item in mod.relatedExpertise"
              :key="typeof item === 'string' ? item : item.url"
              :to="typeof item === 'string' ? item : item.url"
              class="group flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-accent-200 dark:hover:border-accent-500/20 hover:shadow-sm transition-all"
            >
              <div class="w-8 h-8 rounded-lg bg-accent-50 dark:bg-accent-500/10 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <span class="text-sm text-gray-700 dark:text-slate-300 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors truncate">
                {{ typeof item === 'string' ? item.split('/').pop()?.replace(/-/g, ' ') : item.title }}
              </span>
              <svg class="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0 ml-auto group-hover:text-accent-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </NuxtLink>
          </div>
        </div>

      </div>
    </section>

    <!-- NAV MODULES PREV/NEXT -->
    <section class="py-12 bg-gray-50 dark:bg-[#111827]">
      <div class="max-w-3xl mx-auto px-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NuxtLink
            v-if="mod?.prev"
            :to="`/academy/${mod.prev.slug}`"
            class="group flex items-center gap-3 p-5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all"
          >
            <svg class="w-5 h-5 text-gray-400 shrink-0 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-widest">{{ t('academy.module_prev', 'Précédent') }}</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ mod.prev.title }}</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="mod?.next"
            :to="`/academy/${mod.next.slug}`"
            class="group flex items-center gap-3 p-5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all sm:text-right sm:flex-row-reverse"
          >
            <svg class="w-5 h-5 text-gray-400 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-widest">{{ t('academy.module_next', 'Suivant') }}</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ mod.next.title }}</p>
            </div>
          </NuxtLink>
        </div>
        <div class="text-center mt-8">
          <NuxtLink to="/academy" class="text-sm text-gray-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {{ t('academy.module_back', '← Retour à la liste des modules') }}
          </NuxtLink>
        </div>
      </div>
    </section>

  </NuxtLayout>
</template>
