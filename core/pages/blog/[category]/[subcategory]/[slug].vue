<script setup lang="ts">
/**
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const { fetchTerms, annotateProse } = useDictionaryLinks()

const route       = useRoute()
const category    = route.params.category as string
const subcategory = route.params.subcategory as string
const slug        = route.params.slug as string

const {
  getPillar, getSubcatLabel, author: configAuthor, publisher, siteUrl,
  contactCta, contactEmail: cfgContactEmail, blogTitle,
} = useBlogConfig()

const pilier = getPillar(category)
const pilierLabel = pilier.label
const subcatLabel = getSubcatLabel(subcategory)

// Maillage tridirectionnel : Academy + Expertise liés à cet article
const { data: crosslinks } = await useFetch('/api/crosslinks', {
  params: { type: 'blog', slug, category },
})

// L'API attend le slug complet : "subcategory--article-slug" — lang-aware
const { activeLang } = useRouteLang()
const { data: article, error } = await useFetch(`/api/cms/${category}/${subcategory}--${slug}`, {
  query: { lang: activeLang },
  watch: [activeLang],
})

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

// Auteur résolu : 1) cs_employee_extra via author_employee_id (article.author),
// 2) fallback useBlogConfig().author (config_json.blog historique).
// Déclaré AVANT articleJsonLd qui lit author.value, sinon TDZ error
// (« Cannot access 'author' before initialization ») quand useHead évalue
// articleJsonLd.value au setup synchrone.
const author = computed(() => {
  const a = (article.value as any)?.author
  if (a && (a.name || a.image)) {
    return {
      name: a.name || '',
      title: a.title || '',
      bio: a.bio || '',
      image: a.image || '',
      url: a.url || configAuthor.value.url || '/',
    }
  }
  return {
    name: configAuthor.value.name || '',
    title: (configAuthor.value as any).title || '',
    bio: (configAuthor.value as any).bio || '',
    image: configAuthor.value.image || '',
    url: configAuthor.value.url || '/',
  }
})

// Image auteur — déclarée comme variable JS pour éviter que Vite tente
// de résoudre le chemin comme un import statique au build.
const authorImg = computed(() => author.value.image ?? '')

const faqJsonLd = computed(() => {
  const faq = article.value?.faq ?? []
  if (!faq.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
})

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Blog', item: `${siteUrl.value}/blog` },
    { '@type': 'ListItem', position: 2, name: pilierLabel, item: `${siteUrl.value}/blog/${category}` },
    { '@type': 'ListItem', position: 3, name: subcatLabel, item: `${siteUrl.value}/blog/${category}/${subcategory}` },
    { '@type': 'ListItem', position: 4, name: article.value?.title ?? slug },
  ],
}))

const articleJsonLd = computed(() => {
  if (!article.value) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.value.title,
    description: article.value.metaDescription ?? '',
    ...(article.value.coverImage ? { image: article.value.coverImage } : {}),
    datePublished: article.value.datePublished || undefined,
    dateModified: article.value.dateUpdated || article.value.datePublished || undefined,
    author: {
      '@type': 'Person',
      name: author.value.name,
      url: author.value.url,
    },
    publisher: {
      '@type': 'Organization',
      name: publisher.value.name,
      url: publisher.value.url,
      ...(publisher.value.logo ? { logo: { '@type': 'ImageObject', url: publisher.value.logo.startsWith('/') ? `${siteUrl.value}${publisher.value.logo}` : publisher.value.logo } } : {}),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl.value}/blog/${category}/${subcategory}/${slug}`,
    },
  }
})

useHead({
  title: article.value?.title ?? 'Article',
  meta: [
    { name: 'description',        content: article.value?.metaDescription ?? '' },
    { property: 'og:title',       content: article.value?.title ?? '' },
    { property: 'og:description', content: article.value?.metaDescription ?? '' },
    ...(article.value?.coverImage ? [
      { property: 'og:image',      content: article.value.coverImage.startsWith('/') ? `${siteUrl.value}${article.value.coverImage}` : article.value.coverImage },
      { name: 'twitter:image',     content: article.value.coverImage.startsWith('/') ? `${siteUrl.value}${article.value.coverImage}` : article.value.coverImage },
      { name: 'twitter:card',      content: 'summary_large_image' },
    ] : []),
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd.value) },
    ...(articleJsonLd.value ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(articleJsonLd.value) }] : []),
    ...(faqJsonLd.value ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(faqJsonLd.value) }] : []),
  ],
})

// Convention PS : <body id="cms-X" class="cms cms-id-X"> — article CMS natif
useListingBodyId('cms', () => article.value?.id ?? null)

// ── Date ────────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── FAQ accordion ────────────────────────────────────────────────────────────

const openFaqIndex = ref<number | null>(null)
function toggleFaq(i: number) {
  openFaqIndex.value = openFaqIndex.value === i ? null : i
}

// ── Contact form ─────────────────────────────────────────────────────────────
// (author + authorImg déclarés plus haut, avant articleJsonLd)

// URL de partage (résolution côté client uniquement)
const shareUrl = computed(() => {
  if (import.meta.client) {
    return window.location.href
  }
  return `${siteUrl.value}/blog/${category}/${subcategory}/${slug}`
})

const contactMsg = ref(
  `Bonjour ${author.value.name},\nJ'ai lu votre article "${article.value?.title ?? ''}".\n\nJe souhaite vous contacter pour…`,
)
const contactEmailInput = ref('')
const contactSent     = ref(false)
const contactError    = ref('')
const contactLoading  = ref(false)

async function submitContact() {
  if (!contactEmailInput.value) return
  contactLoading.value = true
  contactError.value = ''
  try {
    await $fetch('/api/blog/contact', {
      method: 'POST',
      body: {
        email: contactEmailInput.value,
        message: contactMsg.value,
        articleTitle: article.value?.title ?? '',
        articleUrl: `${siteUrl.value}/blog/${category}/${subcategory}/${slug}`,
      },
    })
    contactSent.value = true
  } catch {
    contactError.value = `Une erreur est survenue. Vous pouvez aussi écrire à ${cfgContactEmail.value}`
  } finally {
    contactLoading.value = false
  }
}

// ── TOC ──────────────────────────────────────────────────────────────────────

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
  const bar   = document.getElementById('toc-progress')
  if (!bar) return
  const total = document.body.scrollHeight - window.innerHeight
  bar.style.width = total > 0 ? `${Math.min(100, (window.scrollY / total) * 100)}%` : '0%'
}

onMounted(() => {
  const proseEl  = document.querySelector('.prose')
  if (!proseEl) return
  // Sommaire = H2 uniquement (pas H3) pour garder un sommaire compact
  const headings = proseEl.querySelectorAll('h2')
  const hasFaq   = !!(faqHeading.value && article.value?.faq?.length)
  if (headings.length < 2 && !hasFaq) return

  headings.forEach((h) => {
    const text = h.textContent?.trim() ?? ''
    const id   = slugifyHeading(text)
    h.id = id
    tocItems.value.push({ id, text, level: 'H2' })
  })
  activeId.value = tocItems.value[0]?.id ?? ''

  // Observer toutes les headings (H2+H3) pour le tracking de position
  const allHeadings = proseEl.querySelectorAll('h2, h3')
  observer = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          // Si c'est un H3, activer son H2 parent dans le sommaire
          const targetId = e.target.id
          const tocMatch = tocItems.value.find(t => t.id === targetId)
          if (tocMatch) {
            activeId.value = targetId
          } else {
            // H3 → trouver le H2 précédent
            const idx = Array.from(allHeadings).indexOf(e.target as HTMLElement)
            for (let i = idx; i >= 0; i--) {
              const prev = allHeadings[i]
              if (prev.tagName === 'H2' && tocItems.value.find(t => t.id === prev.id)) {
                activeId.value = prev.id
                break
              }
            }
          }
        }
      }
    },
    { rootMargin: '-72px 0px -60% 0px', threshold: 0 },
  )
  allHeadings.forEach(h => {
    if (!h.id) h.id = slugifyHeading(h.textContent?.trim() ?? '')
    observer!.observe(h)
  })

  // Ajoute la FAQ au sommaire si elle existe
  if (faqHeading.value && article.value?.faq?.length) {
    tocItems.value.push({ id: 'questions-frequentes', text: 'Questions fréquentes', level: 'H2' })
    observer.observe(faqHeading.value)
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  // ── Dictionary auto-links ──
  fetchTerms().then(() => {
    nextTick(() => {
      const prose = document.querySelector('.prose')
      if (prose) annotateProse(prose)
    })
  })
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="lg:flex lg:gap-12 lg:items-start">

      <!-- ── Article ──────────────────────────────────────────────────────── -->
      <article class="min-w-0 flex-1 max-w-3xl">

        <!-- Fil d'Ariane -->
        <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
          <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink to="/blog" class="hover:text-primary-600 transition-colors">Blog</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink
            :to="`/blog/${category}/`"
            class="hover:text-primary-600 transition-colors"
          >{{ pilierLabel }}</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink
            :to="`/blog/${category}/${subcategory}/`"
            class="hover:text-primary-600 transition-colors"
          >{{ subcatLabel }}</NuxtLink>
          <span aria-hidden="true">/</span>
          <span class="text-gray-500 dark:text-slate-500 truncate max-w-xs">{{ article?.title }}</span>
        </nav>

        <!-- Cover -->
        <figure v-if="article?.coverImage" class="mb-10 rounded-2xl overflow-hidden shadow-md">
          <img
            :src="article.coverImage"
            :srcset="article.thumbnailImage
              ? `${article.thumbnailImage} 600w, ${article.coverImage} 1200w`
              : undefined"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 720px"
            :alt="article.title"
            class="w-full h-auto object-cover"
            loading="eager"
            width="1200"
            height="630"
          >
        </figure>

        <!-- Header article -->
        <header class="mb-10">
          <!-- Badge catégorie (backlink) -->
          <NuxtLink
            v-if="article?.category"
            :to="`/blog/${article.category}/`"
            class="inline-block text-xs font-semibold text-primary-700 bg-primary-100 rounded-full px-3 py-1 mb-4 capitalize hover:bg-primary-200 transition-colors"
          >
            {{ article.category }}
          </NuxtLink>

          <h1 class="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {{ article?.title }}
          </h1>

          <p v-if="article?.metaDescription" class="text-lg text-gray-500 mb-5">
            {{ article.metaDescription }}
          </p>

          <!-- Meta : dates + lecture + auteur -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span v-if="article?.datePublished" class="flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Publié le {{ formatDate(article.datePublished) }}
            </span>
            <span v-if="article?.dateUpdated && article.dateUpdated !== article.datePublished" class="flex items-center gap-1.5 text-gray-400">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Mis à jour le {{ formatDate(article.dateUpdated) }}
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
              <a href="#auteur" class="hover:text-primary-500 transition-colors">{{ author.name }}</a>
            </span>
          </div>

          <!-- Boutons de partage -->
          <div class="flex items-center gap-3 mt-4">
            <span class="text-xs text-gray-400 font-medium uppercase tracking-wide">Partager</span>
            <a
              :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
              aria-label="Partager sur LinkedIn"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a
              :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
              aria-label="Partager sur Facebook"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
          </div>
        </header>

        <!-- ── Audio (en haut pour accessibilité) ─────────────────────────── -->
        <ArticleAudioPlayer
          v-if="article?.audioEnabled"
          :audio-url="article.audioUrl"
        />

        <hr class="border-gray-200 mb-10">

        <!-- Corps -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose prose-lg max-w-none" v-html="article?.content" />

        <!-- ── Éclairage du Mentor ───────────────────────────────────────── -->
        <MentorInsight
          v-if="article?.mentor"
          :name="article.mentor.name"
          :title="article.mentor.title"
          :quote="article.mentor.quote"
          :quote-source="article.mentor.quoteSource"
          :domain="article.mentor.domain"
          :academy-slug="article.mentor.academySlug"
        />

        <!-- ── FAQ ────────────────────────────────────────────────────────── -->
        <section v-if="article?.faq?.length" class="mt-14">
          <h2 id="questions-frequentes" ref="faqHeading" class="text-2xl font-bold text-gray-800 mb-2">Questions fréquentes</h2>
          <p class="text-sm text-gray-500 mb-6">Tout ce que vous devez savoir sur ce sujet.</p>
          <dl class="space-y-3">
            <div
              v-for="(item, i) in article.faq"
              :key="i"
              class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
            >
              <dt>
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  :aria-expanded="openFaqIndex === i"
                  @click="toggleFaq(i)"
                >
                  <span class="text-sm font-semibold text-gray-800">{{ item.q }}</span>
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
                class="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50"
              >
                <p class="pt-4">{{ item.a }}</p>
              </dd>
            </div>
          </dl>
        </section>

        <!-- ── Formulaire de contact pré-rempli ──────────────────────────── -->
        <div class="mt-14 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div class="flex flex-col sm:flex-row">

            <!-- Colonne gauche : CTA -->
            <div class="sm:w-56 shrink-0 bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                <svg class="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p class="font-bold text-lg leading-snug">{{ contactCta?.title ?? 'Une question ?' }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ contactCta?.subtitle ?? 'Contactez-nous directement.' }}</p>
              </div>
              <div v-if="contactCta?.stat" class="mt-2 pt-3 border-t border-white/10 w-full text-center">
                <div class="text-warning-400 tracking-widest text-sm">{{ contactCta.statLabel ?? '' }}</div>
                <p class="text-xs text-gray-300 mt-0.5">{{ contactCta.stat }}</p>
              </div>
            </div>

            <!-- Colonne droite : formulaire -->
            <div class="flex-1 p-8 bg-white">
              <div v-if="contactSent" class="text-success-600 font-medium text-sm bg-success-50 rounded-xl p-6 text-center">
                <p class="text-lg font-semibold mb-1">Message envoy&eacute;</p>
                <p>{{ author.name }} vous r&eacute;pond sous 24h. V&eacute;rifiez vos spams.</p>
              </div>
              <form v-else @submit.prevent="submitContact" class="space-y-4">
                <div v-if="contactError" class="text-red-600 text-sm bg-red-50 rounded-xl p-3">
                  {{ contactError }}
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="contact-email">
                    Votre adresse e-mail
                  </label>
                  <input
                    id="contact-email"
                    v-model="contactEmailInput"
                    type="email"
                    required
                    placeholder="vous@exemple.com"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="contact-msg">
                    Votre message
                  </label>
                  <textarea
                    id="contact-msg"
                    v-model="contactMsg"
                    rows="4"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  :disabled="contactLoading"
                  class="w-full rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3 text-sm transition-colors"
                >
                  {{ contactLoading ? 'Envoi en cours...' : 'Envoyer mon message' }}
                </button>
                <p class="text-center text-xs text-gray-500">
                  Gratuit &amp; sans engagement — r&eacute;ponse sous 24h
                </p>
              </form>
            </div>
          </div>
        </div>

        <!-- ── Maillage tridirectionnel — Academy + Expertise ─────────────── -->
        <div v-if="crosslinks?.academy?.length || crosslinks?.expertise?.length" class="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800">
          <!-- Academy modules liés -->
          <div v-if="crosslinks.academy?.length" class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
              <h3 class="text-sm font-bold text-gray-800 dark:text-white">Apprendre la théorie</h3>
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
          <!-- Guides expertise liés -->
          <div v-if="crosslinks.expertise?.length">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
              </svg>
              <h3 class="text-sm font-bold text-gray-800 dark:text-white">Guides pratiques</h3>
            </div>
            <div class="grid gap-2">
              <NuxtLink
                v-for="link in crosslinks.expertise"
                :key="link.url"
                :to="link.url"
                class="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-accent-200 dark:hover:border-accent-500/20 transition-all"
              >
                <span class="text-sm text-gray-700 dark:text-slate-300 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors truncate">{{ link.title }}</span>
                <svg class="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- ── Bloc auteur ─────────────────────────────────────────────────── -->
        <div id="auteur" class="mt-12 pt-8 border-t border-gray-200">
          <div class="flex items-start gap-6">
            <img
              v-if="authorImg"
              :src="authorImg"
              :alt="author.name"
              class="w-20 h-20 rounded-full object-cover shrink-0 shadow-sm"
              loading="lazy"
              onerror="this.style.display='none'"
            >
            <div>
              <p class="font-bold text-gray-900 text-lg">{{ author.name }}</p>
              <p v-if="author.title" class="text-sm text-primary-700 font-medium mb-2">{{ author.title }}</p>
              <p v-if="author.bio" class="text-sm text-gray-500 leading-relaxed">
                {{ author.bio }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a
                  v-if="cfgContactEmail"
                  :href="`mailto:${cfgContactEmail}`"
                  class="inline-flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 rounded-full px-3 py-1.5 hover:bg-primary-100 transition-colors font-medium"
                >
                  {{ cfgContactEmail }}
                </a>
                <NuxtLink
                  to="/blog"
                  class="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 rounded-full px-3 py-1.5 hover:bg-gray-200 transition-colors"
                >
                  ← Tous les articles
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Commentaires ────────────────────────────────────────────────── -->
        <BlogComments
          v-if="article?.id"
          :article-id="article.id"
          :article-title="article.title ?? ''"
        />

        <!-- ── Articles liés ───────────────────────────────────────────────── -->
        <div class="mt-12 -mx-4 sm:-mx-6">
          <RelatedBlogArticles
            :category-slug="article?.category ?? category"
            :category-label="(article?.category ?? category).charAt(0).toUpperCase() + (article?.category ?? category).slice(1)"
            :exclude-id="article?.id"
            :limit="3"
            section-class="py-10 bg-gray-50 rounded-2xl"
            container-class="max-w-none px-6"
          />
        </div>

      </article>

      <!-- ── Sommaire (TOC) ─────────────────────────────────────────────── -->
      <aside v-if="tocItems.length" class="hidden xl:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)]">
        <nav class="flex flex-col h-full">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 shrink-0">
            Sommaire
          </p>
          <ul class="space-y-0.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
            <li v-for="item in tocItems" :key="item.id">
              <a
                :href="`#${item.id}`"
                :class="[
                  'group flex items-start gap-2 py-1 text-[13px] leading-snug transition-colors duration-150',
                  activeId === item.id ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700',
                ]"
                @click.prevent="scrollToHeading(item.id)"
              >
                <span
                  :class="[
                    'mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full transition-colors',
                    activeId === item.id ? 'bg-primary-500' : 'bg-gray-300 group-hover:bg-gray-400',
                  ]"
                />
                <span class="line-clamp-2">{{ item.text }}</span>
              </a>
            </li>
          </ul>
          <div class="mt-3 h-0.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
            <div id="toc-progress" class="h-full bg-primary-400 rounded-full transition-all duration-150" style="width:0%" />
          </div>
        </nav>
      </aside>

    </div>
  </div>
</template>

<style>
/* ── Prose — Light + Dark ────────────────────────────────────────────────── */
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
.prose dt { @apply text-gray-800 dark:text-white font-semibold mt-4 mb-1; }
.prose dd { @apply text-gray-600 dark:text-slate-300 mb-4 ml-0; }

/* ── Tables — override inline styles + dark mode + accessibility ───── */
.prose .article-table,
.prose table {
  @apply w-full border-collapse rounded-xl overflow-hidden text-sm my-8;
  box-shadow: 0 1px 3px rgba(0,0,0,.07);
}
html.dark .prose .article-table,
html.dark .prose table {
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
.prose .article-table thead tr,
.prose table thead tr {
  background: var(--color-primary-600, #4F46E5) !important;
  color: #fff !important;
}
.prose .article-table thead th,
.prose table thead th {
  @apply px-4 py-3 text-left font-semibold;
  background: inherit !important;
  color: #fff !important;
  border-bottom: none !important;
}
.prose .article-table tbody tr,
.prose table tbody tr {
  @apply border-b border-gray-100 dark:border-slate-700;
  background: transparent !important;
}
.prose .article-table tbody tr:nth-child(even),
.prose table tbody tr:nth-child(even) {
  @apply bg-gray-50 dark:bg-slate-800;
}
.prose .article-table tbody td,
.prose table tbody td {
  @apply px-4 py-3 text-gray-700 dark:text-slate-300 align-top;
  background: inherit !important;
  color: inherit !important;
  border-bottom: 1px solid rgb(241 245 249) !important;
}
html.dark .prose .article-table tbody td,
html.dark .prose table tbody td {
  border-bottom-color: rgb(51 65 85) !important;
}
/* TOTAL row with green background */
.prose .article-table tbody td[style*="f0fdf4"],
.prose table tbody td[style*="f0fdf4"] {
  background: transparent;
}
/* Visible focus for keyboard navigation */
.prose .article-table :focus-visible,
.prose table :focus-visible {
  @apply outline-2 outline-offset-2 outline-primary-500;
}
/* Caption for accessibility */
.prose .article-table caption,
.prose table caption {
  @apply text-sm text-gray-500 dark:text-slate-400 mb-2 text-left;
  caption-side: top;
}

/* ── Authority source box ─────────────────────────────────────────── */
.prose .expert-quote {
  @apply relative my-8 rounded-2xl bg-primary-50 dark:bg-primary-900 border border-primary-100 dark:border-primary-800 px-8 py-6;
}
.prose .expert-quote::before {
  content: '\201C';
  @apply absolute top-3 left-4 text-6xl text-primary-200 dark:text-primary-700 font-serif leading-none;
}
.prose .expert-quote p { @apply text-gray-700 dark:text-slate-300 italic mb-2 leading-relaxed; }
.prose .expert-quote footer { @apply text-sm text-gray-500 dark:text-slate-400 not-italic; }
.prose .expert-quote footer a { @apply text-primary-600 dark:text-primary-400 font-medium hover:underline; }

/* ── Bloc sources ────────────────────────────────────────────────────────── */
.prose .article-sources {
  @apply mt-10 pt-6 border-t border-gray-100 dark:border-slate-700;
}
.prose .article-sources h3 { @apply text-base font-semibold text-gray-500 dark:text-slate-400 mb-3; }
.prose .article-sources ul { @apply list-none pl-0 space-y-1; }
.prose .article-sources li { @apply text-sm; }
.prose .article-sources a { @apply text-primary-700 dark:text-primary-400 underline hover:text-primary-900 dark:hover:text-primary-300; }

/* ── Colored callouts (inline style) — dark mode override ─────────── */
html.dark .prose div[style*="f0fdf4"] { background: rgba(6, 78, 59, 0.2) !important; border-color: #065f46 !important; }
html.dark .prose div[style*="f8fafc"] { background: rgba(30, 41, 59, 0.5) !important; }

/* ── Dictionary auto-links ─────────────────────────────────────────────── */
.prose a.dict-term {
  @apply text-primary-600 dark:text-primary-400 no-underline;
  border-bottom: 1px dotted currentColor;
  transition: border-color 0.15s, color 0.15s;
}
.prose a.dict-term:hover {
  @apply text-accent-500 dark:text-accent-400;
  border-bottom-style: solid;
}
/* ── Subtle scrollbar for the table of contents ─────────────────────────────────── */
.scrollbar-thin::-webkit-scrollbar { width: 3px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
</style>
