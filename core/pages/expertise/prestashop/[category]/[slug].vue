<script setup lang="ts">
/**
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const route    = useRoute()
const category = route.params.category as string
const slug     = route.params.slug as string

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  developpement: { label: 'Développement', icon: '💻' },
  configuration: { label: 'Configuration', icon: '⚙️' },
  performance:   { label: 'Performance', icon: '⚡' },
  seo:           { label: 'SEO', icon: '🔍' },
  design:        { label: 'Design & Thèmes', icon: '🎨' },
  catalogue:     { label: 'Catalogue', icon: '📦' },
  commandes:     { label: 'Commandes', icon: '🛒' },
  securite:      { label: 'Sécurité', icon: '🔒' },
  migration:     { label: 'Migration', icon: '🔄' },
  debug:         { label: 'Debug', icon: '🐛' },
  livraison:     { label: 'Livraison', icon: '🚚' },
  paiement:      { label: 'Paiement', icon: '💳' },
  email:         { label: 'E-mails', icon: '📧' },
  api:           { label: 'API & Webservice', icon: '🔌' },
  multiboutique: { label: 'Multi-boutique', icon: '🏪' },
  general:       { label: 'Général', icon: '📄' },
}

const DIFFICULTY_LABELS: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
}

const catMeta = CATEGORY_META[category] || { label: category, icon: '📄' }

const { data: article, error } = await useFetch(`/api/expertise/${slug}`)

// Maillage tridirectionnel : Academy + Blog liés à cette expertise
const { data: crosslinks } = await useFetch('/api/crosslinks', {
  params: { type: 'expertise', slug, category },
})

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

// ── JSON-LD ────────────────────────────────────────────────────────────────

const faqJsonLd = computed(() => {
  const faq = article.value?.faq ?? []
  if (!faq.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }: { q: string; a: string }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
})

const articleJsonLd = computed(() => {
  if (!article.value) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.value.title,
    description: article.value.metaDescription ?? '',
    datePublished: article.value.publishDate || article.value.generatedAt || undefined,
    dateModified: article.value.publishDate || article.value.generatedAt || undefined,
    proficiencyLevel: article.value.difficulty === 'debutant' ? 'Beginner' : article.value.difficulty === 'avance' ? 'Expert' : 'Intermediate',
    author: {
      '@type': 'Person',
      name: 'CodeMyShop',
      url: 'https://codemyshop.com',
      jobTitle: 'Expert PrestaShop & Architecture E-commerce',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CodeMyShop',
      url: 'https://codemyshop.com',
      logo: { '@type': 'ImageObject', url: 'https://codemyshop.com/logo-ac.svg' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://codemyshop.com/expertise/prestashop/${category}/${slug}`,
    },
  }
})

useHead({
  title: article.value?.title ?? 'Expertise PrestaShop',
  meta: [
    { name: 'description',        content: article.value?.metaDescription ?? '' },
    { property: 'og:title',       content: article.value?.title ?? '' },
    { property: 'og:description', content: article.value?.metaDescription ?? '' },
    { name: 'twitter:card',       content: 'summary_large_image' },
  ],
  script: [
    ...(articleJsonLd.value ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(articleJsonLd.value) }] : []),
    ...(faqJsonLd.value    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(faqJsonLd.value) }]    : []),
  ],
})

// ── Date ────────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── FAQ accordion ─────────────────────────────────────────────────────────

const openFaqIndex = ref<number | null>(null)
function toggleFaq(i: number) {
  openFaqIndex.value = openFaqIndex.value === i ? null : i
}

// ── Contact ───────────────────────────────────────────────────────────────

const authorImg = '/alexandre-carette-96.webp'

const shareUrl = computed(() => {
  if (import.meta.client) return window.location.href
  return `https://codemyshop.com/expertise/prestashop/${category}/${slug}`
})

const contactMsg = ref(
  `Bonjour Alexandre,\nJ'ai lu votre article "${article.value?.title ?? ''}".\n\nJe souhaite vous contacter pour…`,
)
const contactEmail  = ref('')
const contactSent   = ref(false)

function submitContact() {
  if (!contactEmail.value) return
  const subject = encodeURIComponent(`[Expertise] ${article.value?.title ?? 'Contact'}`)
  const body    = encodeURIComponent(contactMsg.value)
  window.location.href = `mailto:contact@codemyshop.com?subject=${subject}&body=${body}`
  contactSent.value = true
}

// ── TOC ──────────────────────────────────────────────────────────────────

interface TocItem { id: string; text: string; level: string }

const tocItems    = ref<TocItem[]>([])
const activeId    = ref('')
const faqHeading  = ref<HTMLElement | null>(null)
let   observer: IntersectionObserver | null = null

function slugifyHeading(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
}

function onScroll() {
  const bar = document.getElementById('toc-progress')
  if (!bar) return
  const total = document.body.scrollHeight - window.innerHeight
  bar.style.width = total > 0 ? `${Math.min(100, (window.scrollY / total) * 100)}%` : '0%'
}

onMounted(() => {
  const proseEl  = document.querySelector('.prose')
  if (!proseEl) return
  const headings = proseEl.querySelectorAll('h2, h3')
  const hasFaq   = !!(faqHeading.value && article.value?.faq?.length)
  if (headings.length < 2 && !hasFaq) return

  headings.forEach((h) => {
    const text = h.textContent?.trim() ?? ''
    const id   = slugifyHeading(text)
    h.id = id
    tocItems.value.push({ id, text, level: h.tagName })
  })
  activeId.value = tocItems.value[0]?.id ?? ''

  observer = new IntersectionObserver(
    entries => { for (const e of entries) { if (e.isIntersecting) activeId.value = e.target.id } },
    { rootMargin: '-72px 0px -60% 0px', threshold: 0 },
  )
  headings.forEach(h => observer!.observe(h))

  if (faqHeading.value && article.value?.faq?.length) {
    tocItems.value.push({ id: 'questions-frequentes', text: 'Questions fréquentes', level: 'H2' })
    observer.observe(faqHeading.value)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="lg:flex lg:gap-12 lg:items-start">

      <!-- Article -->
      <article class="min-w-0 flex-1 max-w-3xl">

        <!-- Fil d'Ariane -->
        <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
          <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink to="/expertise" class="hover:text-primary-600 transition-colors">Expertise</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink to="/expertise" class="hover:text-primary-600 transition-colors">PrestaShop</NuxtLink>
          <span aria-hidden="true">/</span>
          <span class="text-gray-500 dark:text-slate-500 truncate max-w-xs">{{ article?.title }}</span>
        </nav>

        <!-- Header article -->
        <header class="mb-10">
          <!-- Badges -->
          <div class="flex items-center gap-2 mb-4 flex-wrap">
            <NuxtLink
              to="/expertise"
              class="inline-block text-xs font-semibold text-primary-700 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 rounded-full px-3 py-1 hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-colors"
            >
              {{ catMeta.icon }} {{ catMeta.label }}
            </NuxtLink>
            <span
              v-if="article?.difficulty"
              class="text-xs font-semibold px-3 py-1 rounded-full"
              :class="{
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400': article.difficulty === 'debutant',
                'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400': article.difficulty === 'intermediaire',
                'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400': article.difficulty === 'avance',
              }"
            >
              {{ DIFFICULTY_LABELS[article.difficulty] || article.difficulty }}
            </span>
            <span
              v-for="v in (article?.psVersions || [])"
              :key="v"
              class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
            >
              PS {{ v }}
            </span>
          </div>

          <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
            {{ article?.title }}
          </h1>

          <p v-if="article?.metaDescription" class="text-lg text-gray-500 dark:text-slate-400 mb-5">
            {{ article.metaDescription }}
          </p>

          <!-- TL;DR -->
          <div v-if="article?.tldr" class="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-4 mb-5">
            <p class="text-sm text-primary-800 dark:text-primary-300">
              <strong class="font-semibold">En bref :</strong> {{ article.tldr }}
            </p>
          </div>

          <!-- Meta -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
            <span v-if="article?.publishDate || article?.generatedAt" class="flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Publié le {{ formatDate(article.publishDate || article.generatedAt) }}
            </span>
            <span v-if="article?.readingTime" class="flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ article.readingTime }} min de lecture
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <a href="#auteur" class="hover:text-primary-500 transition-colors">CodeMyShop</a>
            </span>
          </div>

          <!-- Partage -->
          <div class="flex items-center gap-3 mt-4">
            <span class="text-xs text-gray-500 dark:text-slate-500 font-medium uppercase tracking-wide">Partager</span>
            <a
              :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`"
              target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
              aria-label="Partager sur LinkedIn"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a
              :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`"
              target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
              aria-label="Partager sur Facebook"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
          </div>
        </header>

        <hr class="border-gray-200 dark:border-slate-700 mb-10">

        <!-- Corps -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose prose-lg max-w-none" v-html="article?.content" />

        <!-- Tags -->
        <div v-if="article?.tags?.length" class="mt-10 flex flex-wrap gap-2">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- FAQ -->
        <section v-if="article?.faq?.length" class="mt-14">
          <h2 id="questions-frequentes" ref="faqHeading" class="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Questions fréquentes
          </h2>
          <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">Tout ce que vous devez savoir sur ce sujet.</p>
          <dl class="space-y-3">
            <div
              v-for="(item, i) in article.faq"
              :key="i"
              class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
            >
              <dt>
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  :aria-expanded="openFaqIndex === i"
                  @click="toggleFaq(i)"
                >
                  <span class="text-sm font-semibold text-gray-800 dark:text-white">{{ item.q }}</span>
                  <svg
                    class="w-5 h-5 text-primary-500 shrink-0 transition-transform duration-300"
                    :class="openFaqIndex === i ? 'rotate-180' : ''"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </dt>
              <dd
                v-show="openFaqIndex === i"
                class="px-6 pb-5 text-sm text-gray-600 dark:text-slate-300 leading-relaxed border-t border-gray-50 dark:border-slate-800"
              >
                <p class="pt-4">{{ item.a }}</p>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Contact -->
        <div class="mt-14 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col sm:flex-row">
            <div class="sm:w-56 shrink-0 bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                <svg class="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p class="font-bold text-lg leading-snug">Un projet PrestaShop ?</p>
                <p class="text-sm text-gray-400 mt-1">Discutons-en directement.</p>
              </div>
              <div class="mt-2 pt-3 border-t border-white/10 w-full text-center">
                <div class="text-warning-400 tracking-widest text-sm">★★★★★</div>
                <p class="text-xs text-gray-300 mt-0.5">193 projets livrés</p>
              </div>
            </div>
            <div class="flex-1 p-8 bg-white dark:bg-slate-900">
              <div v-if="contactSent" class="text-success-600 font-medium text-sm bg-success-50 dark:bg-success-500/10 rounded-xl p-4">
                Votre client mail s'est ouvert avec le message pré-rempli. À tout de suite !
              </div>
              <form v-else class="space-y-4" @submit.prevent="submitContact">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1" for="contact-email">Votre adresse e-mail</label>
                  <input id="contact-email" v-model="contactEmail" type="email" required placeholder="vous@exemple.com" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1" for="contact-msg">Votre message</label>
                  <textarea id="contact-msg" v-model="contactMsg" rows="4" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                </div>
                <button type="submit" class="w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 text-sm transition-colors">
                  Démarrer mon projet
                </button>
                <p class="text-center text-xs text-gray-500 dark:text-slate-400">Gratuit & sans engagement — réponse sous 24h</p>
              </form>
            </div>
          </div>
        </div>

        <!-- Maillage tridirectionnel — Academy + Blog + CodeMyShop -->
        <div class="mt-10 space-y-4">
          <!-- Academy modules liés (dynamique) -->
          <div v-if="crosslinks?.academy?.length" class="mb-4">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
              <h3 class="text-sm font-bold text-gray-800 dark:text-white">Comprendre la théorie</h3>
            </div>
            <div class="grid gap-2">
              <NuxtLink
                v-for="link in crosslinks.academy"
                :key="link.url"
                :to="link.url"
                class="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 transition-all"
              >
                <span class="text-lg">{{ link.icon }}</span>
                <span class="text-sm text-gray-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{{ link.title }}</span>
                <svg class="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </NuxtLink>
            </div>
          </div>

          <!-- Blog articles liés (dynamique) -->
          <div v-if="crosslinks?.blog?.length" class="mb-4">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <h3 class="text-sm font-bold text-gray-800 dark:text-white">Lire sur le blog</h3>
            </div>
            <div class="grid gap-2">
              <NuxtLink
                v-for="link in crosslinks.blog"
                :key="link.url"
                :to="link.url"
                class="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 transition-all"
              >
                <span class="text-sm text-gray-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{{ link.title }}</span>
                <svg class="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </NuxtLink>
            </div>
          </div>

          <!-- Liens statiques : blog + CodeMyShop (fallback si pas de crosslinks) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NuxtLink
              to="/blog"
              class="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all group"
            >
              <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Blog technique</p>
                <p class="text-xs text-gray-500 dark:text-slate-400">Articles approfondis sur l'e-commerce headless</p>
              </div>
            </NuxtLink>
            <a
              href="https://codemyshop.com"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-accent-200 dark:hover:border-accent-500/20 hover:shadow-md transition-all group"
            >
              <div class="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" /></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">CodeMyShop</p>
                <p class="text-xs text-gray-500 dark:text-slate-400">Votre boutique PrestaShop clé en main</p>
              </div>
            </a>
          </div>
        </div>

        <!-- Articles connexes -->
        <div v-if="article?.relatedArticles?.length" class="mt-12">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Articles connexes</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NuxtLink
              v-for="rel in article.relatedArticles"
              :key="rel.slug"
              :to="`/expertise/prestashop/${rel.category}/${rel.slug}`"
              class="group p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-500/20 hover:shadow-md transition-all"
            >
              <p class="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-1">
                {{ rel.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-500 capitalize">{{ rel.category }}</p>
            </NuxtLink>
          </div>
        </div>

        <!-- Auteur -->
        <div id="auteur" class="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
          <div class="flex items-start gap-6">
            <img
              :src="authorImg"
              alt="CodeMyShop"
              class="w-20 h-20 rounded-full object-cover shrink-0 shadow-sm"
              loading="lazy"
              onerror="this.style.display='none'"
            >
            <div>
              <p class="font-bold text-gray-900 dark:text-white text-lg">CodeMyShop</p>
              <p class="text-sm text-primary-700 dark:text-primary-400 font-medium mb-2">Expert PrestaShop & Architecture E-commerce</p>
              <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Développeur PrestaShop depuis 2014, 193 projets livrés. Je conçois des architectures headless
                Nuxt + PrestaShop et des outils d'automatisation IA pour les e-commerçants.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a href="mailto:contact@codemyshop.com" class="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-full px-3 py-1.5 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors font-medium">
                  contact@codemyshop.com
                </a>
                <NuxtLink to="/expertise" class="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-full px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                  ← Tous les articles
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

      </article>

      <!-- Sommaire (TOC) -->
      <aside v-if="tocItems.length" class="hidden xl:block w-56 shrink-0 sticky top-24 self-start">
        <nav>
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-4">Sommaire</p>
          <ul class="space-y-0.5">
            <li v-for="item in tocItems" :key="item.id">
              <a
                :href="`#${item.id}`"
                :class="[
                  'group flex items-start gap-2 py-1 text-sm leading-snug transition-colors duration-150',
                  item.level === 'H3' ? 'pl-3' : '',
                  activeId === item.id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300',
                ]"
                @click.prevent="scrollToHeading(item.id)"
              >
                <span
                  :class="[
                    'mt-1.5 shrink-0 w-1 h-1 rounded-full transition-colors',
                    item.level === 'H3' ? 'hidden' : 'block',
                    activeId === item.id ? 'bg-primary-500' : 'bg-gray-300 dark:bg-slate-600 group-hover:bg-gray-400',
                  ]"
                />
                {{ item.text }}
              </a>
            </li>
          </ul>
          <div class="mt-6 h-0.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div id="toc-progress" class="h-full bg-primary-400 rounded-full transition-all duration-150" style="width:0%" />
          </div>
        </nav>
      </aside>

    </div>
  </div>
</template>

<style>
/* Réutilise les styles prose du blog */
.prose h2 { @apply text-2xl font-bold text-gray-800 dark:text-white mt-10 mb-4; }
.prose h3 { @apply text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3; }
.prose p  { @apply text-gray-600 dark:text-slate-300 leading-relaxed mb-5; }
.prose ul { @apply list-disc list-inside text-gray-600 dark:text-slate-300 mb-5 space-y-1; }
.prose ol { @apply list-decimal list-inside text-gray-600 dark:text-slate-300 mb-5 space-y-1; }
.prose li { @apply text-gray-600 dark:text-slate-300; }
.prose a  { @apply text-primary-700 dark:text-primary-400 underline hover:text-primary-900 dark:hover:text-primary-300; }
.prose pre { @apply bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm my-6; }
.prose code { @apply bg-gray-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded text-sm; }
.prose pre code { @apply bg-transparent text-gray-100 p-0; }
.prose strong { @apply font-semibold text-gray-800 dark:text-white; }
.prose blockquote { @apply border-l-4 border-primary-300 dark:border-primary-600 pl-5 italic text-gray-500 dark:text-slate-400 my-6; }
.prose table { @apply w-full border-collapse rounded-xl overflow-hidden text-sm my-8; box-shadow: 0 1px 3px rgba(0,0,0,.07); }
html.dark .prose table { box-shadow: 0 1px 3px rgba(0,0,0,.3); }
.prose table thead tr { background: var(--color-primary-600, #4F46E5) !important; color: #fff !important; }
.prose table thead th { @apply px-4 py-3 text-left font-semibold; background: inherit !important; color: #fff !important; }
.prose table tbody tr { @apply border-b border-gray-100 dark:border-slate-700; background: transparent !important; }
.prose table tbody tr:nth-child(even) { @apply bg-gray-50 dark:bg-slate-800; }
.prose table tbody td { @apply px-4 py-3 text-gray-700 dark:text-slate-300 align-top; background: inherit !important; color: inherit !important; }
</style>
