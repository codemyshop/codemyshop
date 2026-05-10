/**
 * Reactive store for Edit Mode (based on useState — SSR-safe, not Pinia).
 *
 * Cycle de vie :
 *   1. layouts/white-label.vue appelle initFromConfig(fullConfig) au montage
 * BuilderSidebar modifies slices directly → live preview
 *   3. saveConfig() → POST /api/save-config → server/data/client-overrides/[id].json
 */
import type {
  HeaderConfig, HomepageConfig, HomepageFeature, HomepageCategory,
  HomepageTestimonial, HomepageAbout, HomepageBlog, HomepageFaq,
  ThemeConfig, FooterConfig,
} from '~/types/theme'
import type { HomepageFeatureIcon } from '~/types/theme'
import type { SectionVisibilityRule } from '~/types/avatar'
import { DEFAULT_VISIBILITY_RULE } from '~/utils/avatar'

// ── Types publics ────────────────────────────────────────────────────────────

// Types AC Hub
export type AcHubSectionType = 'hero' | 'probleme' | 'solution' | 'why' | 'features' | 'categories' | 'events' | 'testimonials' | 'about' | 'blog' | 'faq' | 'malt' | 'personas' | 'workflow' | 'gsc-showcase' | 'ambassador' | 'investissement' | 'hub-showcase' | 'nav-pages' | 'cta-final'
// Types e-commerce (DB-driven depuis cs_homepage_section)
export type ExampleSectionType = 'hero-slider' | 'features' | 'categories' | 'promotions' | 'new-products' | 'narrative-blocks' | 'banners' | 'bestsellers' | 'instagram' | 'blog'
// Union — le builder accepte tous les types
export type SectionType = AcHubSectionType | ExampleSectionType

export interface SectionConfig {
  type:       SectionType
  visibility: SectionVisibilityRule
  wowEffect?: boolean
}

export type GlobalPanelId =
  | 'header'
  | 'footer'
  | 'theme'
  | 'homepage:hero'
  | 'homepage:features'
  | 'homepage:categories'
  | 'homepage:events'
  | 'homepage:testimonials'
  | 'homepage:about'
  | 'homepage:blog'
  | 'homepage:faq'
  | 'homepage:malt'
  | 'homepage:visibility'
  | 'section-library'
  | 'section-edit'
  | 'prefooter-library'
  | 'prefooter-edit'
  | 'silo:hero'
  | 'silo:sections'

// ── Constantes UI ────────────────────────────────────────────────────────────

export const SECTION_META: Record<string, { label: string; icon: string }> = {
  // ── AC Hub ──────────────────────────────────────────────────────────────────
  hero:         { label: 'Hero',          icon: '🦸' },
  why:            { label: 'Manifeste',      icon: '💡' },
  probleme:         { label: 'Problème',       icon: '⚠️' },
  solution:         { label: 'Solution',       icon: '🎯' },
  features:     { label: 'Atouts',        icon: '✨' },
  categories:   { label: 'Catégories',    icon: '🗂️' },
  events:       { label: 'Événements',    icon: '📅' },
  testimonials: { label: 'Témoignages',   icon: '⭐' },
  about:        { label: 'À propos',      icon: '👤' },
  blog:         { label: 'Blog',          icon: '📝' },
  faq:          { label: 'FAQ',           icon: '❓' },
  malt:         { label: 'Malt',          icon: '🟠' },
  personas:     { label: 'Personas',     icon: '👥' },
  workflow:      { label: 'Workflow',     icon: '🔄' },
  'gsc-showcase': { label: 'SEO Showcase', icon: '📈' },
  ambassador:     { label: 'Ambassadeur',  icon: '🤝' },
  investissement:   { label: 'Investissement',  icon: '💎' },
  'hub-showcase':   { label: 'Hub Showcase',    icon: '🖥️' },
  'nav-pages':      { label: 'Navigation',     icon: '🧭' },
  'cta-final':      { label: 'CTA Final',      icon: '🚀' },
  // ── Example Shop (DB-driven) ────────────────────────────────────────────────────
  'hero-slider':      { label: 'Hero Slider',       icon: '🎠' },
  'promotions':       { label: 'Promotions',         icon: '🏷️' },
  'new-products':     { label: 'Nouveaux produits',  icon: '🆕' },
  'narrative-blocks': { label: 'Blocs narratifs',    icon: '📖' },
  'banners':          { label: 'Bannières',          icon: '🖼️' },
  'bestsellers':      { label: 'Meilleures ventes',  icon: '🏆' },
  'instagram':        { label: 'Instagram',          icon: '📸' },
  // ── Pré-footer (DB-driven) ─────────────────────────────────────────────
  'customer-reviews':  { label: 'Avis vérifiés',      icon: '⭐' },
  'newsletter':        { label: 'Newsletter',          icon: '📬' },
  'trust-badges':      { label: 'Certifications',      icon: '🏅' },
}

export const FEATURE_ICONS: { value: HomepageFeatureIcon; label: string }[] = [
  { value: 'truck',  label: '🚚 Livraison' },
  { value: 'shield', label: '🛡️ Garantie' },
  { value: 'store',  label: '🏪 Drive & Collect' },
  { value: 'credit', label: '💳 Paiement' },
  { value: 'star',   label: '⭐ Qualité' },
  { value: 'clock',  label: '⏱️ Délai' },
  { value: 'leaf',   label: '🌿 Eco' },
  { value: 'check',  label: '✅ Certifié' },
]

// ── State partagé pour sections DB (Example Shop et futurs tenants DB-driven) ─────
// Le sidebar écrit dedans, la page index le lit en temps réel (live preview).
export interface DbHomepageSection {
  id: number
  position: number
  type: string
  title: string | Record<string, string> | null
  subtitle: string | Record<string, string> | null
  /** Config typée prefooter (customer-reviews). Remplace payload.limit */
  limitItems?: number
  /** Legacy homepage payload — to migrate later */
  payload?: any
  active: boolean
}

export const useDbHomepageSections = () => {
  const sections = useState<DbHomepageSection[]>('ed_db_homepage_sections', () => [])
  return sections
}

export const useDbPrefooterSections = () => {
  const sections = useState<DbHomepageSection[]>('ed_db_prefooter_sections', () => [])
  return sections
}

// ── Footer columns (DB-driven, cs_footer) ────────────────────────────────
export interface DbFooterLink {
  id: number
  label: string
  href: string
  badge?: string
  external: boolean
  column_position: number
  link_position: number
}

export interface DbFooterColumn {
  title: string
  column_position: number
  links: DbFooterLink[]
}

export const useDbFooterColumns = () => {
  return useState<DbFooterColumn[]>('ed_db_footer_columns', () => [])
}

// ── Silo editor state (Example Shop grossiste pages) ─────────────────────────────
export interface EditorSiloData {
  h1?: string | null
  intro_html?: string | null
  image_path?: string | null
  image_alt?: string | null
  meta_title?: string | null
  meta_description?: string | null
  id_category?: number | null
  slug?: string | null
}

export const useEditorSilo = () => {
  return useState<EditorSiloData>('ed_silo', () => ({}))
}

export const useEditorSiloSections = () => {
  return useState<Record<string, boolean> | null>('ed_silo_sections', () => null)
}

// ── Composable ───────────────────────────────────────────────────────────────

export const useEditorState = () => {
  // Slices de config
  const homepage          = useState<HomepageConfig>('ed_hp',    () => ({}))
  const sections          = useState<SectionConfig[]>('ed_sections', () => [
    { type: 'hero',       visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'features',   visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'categories', visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'events',       visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'testimonials', visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'about',        visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'blog',         visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'faq',          visibility: { ...DEFAULT_VISIBILITY_RULE } },
    { type: 'malt',         visibility: { ...DEFAULT_VISIBILITY_RULE } },
  ])
  const theme             = useState<ThemeConfig>('ed_theme',    () => ({ colors: { primary: '#2563eb' } }))
  const header            = useState<Partial<HeaderConfig>>('ed_header', () => ({}))
  const footer            = useState<FooterConfig>('ed_footer',  () => ({}))

  // Sidebar UI state
  const activePanel  = useState<GlobalPanelId | null>('ed_panel',  () => null)
  const isDirty      = useState('ed_dirty',  () => false)
  const isSaving     = useState('ed_saving', () => false)
  const initialized  = useState('ed_init',   () => false)
  const saveStatus   = useState<'idle' | 'ok' | 'error'>('ed_status', () => 'idle')

  const { resolvedClientId } = useClientDetection()

  // ── Init ───────────────────────────────────────────────────────────────────

  /**
   * Initializes the store from the tenant config document.
   *
   * Expected schema (NEW — client config module) : FLAT.
   *   { topBar, logo, menu, features, contactEmail, blog,
   *     theme, footer, homepage, sections, ... }
   *
   * Temporary compatibility shim: if the document uses the OLD DB-First schema
   *   { theme, footer, homepage, header: {topBar, logo, menu, ...}, ... }
   * we flatten `header.*` to the top-level before splitting. Will be removed later.
   */
  function initFromConfig(base: HeaderConfig, force = false) {
    if (initialized.value && !force) return
    const raw = JSON.parse(JSON.stringify(base)) as any

    // ── Compat shim : aplatir b.header.* au top-level si présent ─────────
    let b: any
    if (raw && typeof raw.header === 'object' && raw.header !== null && !Array.isArray(raw.header)) {
      const { header: nestedHeader, ...rest } = raw
      b = { ...rest, ...nestedHeader }
    } else {
      b = raw
    }

    homepage.value  = b.homepage ?? {}
    theme.value     = b.theme    ?? { colors: { primary: '#2563eb' } }
    footer.value    = b.footer   ?? {}

    // Restaurer les sections avec visibilité sauvegardée
    if (b.sections?.length) {
      // Rétro-compat : si les items sont des strings (ancien format SectionType[])
      sections.value = (b.sections as (SectionConfig | string)[]).map(s =>
        typeof s === 'string'
          ? { type: s as SectionType, visibility: { ...DEFAULT_VISIBILITY_RULE } }
          : s,
      )
    }

    // header slice = document FLAT sans les sous-objets homepage/theme/footer/sections
    const { homepage: _hp, theme: _t, footer: _f, sections: _s, ...headerSlice } = b
    header.value    = headerSlice
    initialized.value = true
  }

  // ── Dirty tracking ─────────────────────────────────────────────────────────

  function markDirty() {
    isDirty.value    = true
    saveStatus.value = 'idle'
  }

  // ── Navigation panels ──────────────────────────────────────────────────────

  function openGlobalPanel(id: GlobalPanelId) {
    activePanel.value = id
  }

  // ── Section ordering ───────────────────────────────────────────────────────

  function moveSection(from: number, to: number) {
    const arr = [...sections.value]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    sections.value = arr
    markDirty()
  }

  function updateSectionVisibility(type: SectionType, rule: SectionVisibilityRule) {
    sections.value = sections.value.map(s =>
      s.type === type ? { ...s, visibility: rule } : s,
    )
    markDirty()
  }

  // ── Homepage — Hero ────────────────────────────────────────────────────────

  function updateHero(patch: Partial<HomepageConfig['hero'] & object>) {
    homepage.value = {
      ...homepage.value,
      hero: { ...homepage.value.hero, ...patch } as HomepageConfig['hero'],
    }
    markDirty()
  }

  // ── Homepage — Features ────────────────────────────────────────────────────

  function addFeature() {
    homepage.value.features ??= []
    homepage.value.features.push({ icon: 'star', label: 'Nouvel atout', description: 'Description' })
    markDirty()
  }

  function removeFeature(i: number) {
    homepage.value.features?.splice(i, 1)
    markDirty()
  }

  function updateFeature(i: number, patch: Partial<HomepageFeature>) {
    if (!homepage.value.features?.[i]) return
    Object.assign(homepage.value.features[i], patch)
    markDirty()
  }

  // ── Homepage — Categories ──────────────────────────────────────────────────

  function addCategory() {
    homepage.value.categories ??= []
    homepage.value.categories.push({ label: 'Nouvelle catégorie', image: '', href: '/catalogue/nouvelle-categorie' })
    markDirty()
  }

  function removeCategory(i: number) {
    homepage.value.categories?.splice(i, 1)
    markDirty()
  }

  function updateCategory(i: number, patch: Partial<HomepageCategory>) {
    if (!homepage.value.categories?.[i]) return
    Object.assign(homepage.value.categories[i], patch)
    markDirty()
  }

  // ── Homepage — Testimonials ────────────────────────────────────────────────

  function addTestimonial() {
    homepage.value.testimonials ??= []
    homepage.value.testimonials.push({ author: 'Nom', text: 'Témoignage…', rating: 5 })
    markDirty()
  }

  function removeTestimonial(i: number) {
    homepage.value.testimonials?.splice(i, 1)
    markDirty()
  }

  function updateTestimonial(i: number, patch: Partial<HomepageTestimonial>) {
    if (!homepage.value.testimonials?.[i]) return
    Object.assign(homepage.value.testimonials[i], patch)
    markDirty()
  }

  // ── Homepage — About ─────────────────────────────────────────────────────

  function updateAbout(patch: Partial<HomepageAbout>) {
    homepage.value = {
      ...homepage.value,
      about: { ...homepage.value.about, ...patch } as HomepageAbout,
    }
    markDirty()
  }

  // ── Homepage — Blog ──────────────────────────────────────────────────────

  function updateBlog(patch: Partial<HomepageBlog>) {
    homepage.value = {
      ...homepage.value,
      blog: { ...homepage.value.blog, ...patch } as HomepageBlog,
    }
    markDirty()
  }

  // ── Homepage — FAQ ───────────────────────────────────────────────────────

  function updateFaq(patch: Partial<HomepageFaq>) {
    homepage.value = {
      ...homepage.value,
      faq: { ...homepage.value.faq, ...patch } as HomepageFaq,
    }
    markDirty()
  }

  // ── Theme mutations ────────────────────────────────────────────────────────

  function updateThemeColor(patch: Partial<ThemeConfig['colors']>) {
    theme.value = { ...theme.value, colors: { ...theme.value.colors, ...patch } }
    markDirty()
  }

  function updateThemeTypography(patch: Partial<NonNullable<ThemeConfig['typography']>>) {
    theme.value = { ...theme.value, typography: { ...theme.value.typography, ...patch } }
    markDirty()
  }

  function updateThemeUI(patch: Partial<NonNullable<ThemeConfig['ui']>>) {
    theme.value = { ...theme.value, ui: { ...theme.value.ui, ...patch } }
    markDirty()
  }

  // ── Header mutations ───────────────────────────────────────────────────────

  function updateHeader(patch: Partial<HeaderConfig>) {
    header.value = { ...header.value, ...patch }
    markDirty()
  }

  // ── Footer mutations ───────────────────────────────────────────────────────

  function updateFooter(patch: Partial<FooterConfig>) {
    footer.value = { ...footer.value, ...patch }
    markDirty()
  }

  function updateFooterContact(patch: Partial<NonNullable<FooterConfig['contact']>>) {
    footer.value = { ...footer.value, contact: { ...footer.value.contact, ...patch } }
    markDirty()
  }

  function updateFooterBottomBar(patch: Partial<NonNullable<FooterConfig['bottomBar']>>) {
    footer.value = { ...footer.value, bottomBar: { ...footer.value.bottomBar, ...patch } }
    markDirty()
  }

  function updateFooterSocial(social: NonNullable<FooterConfig['social']>) {
    footer.value = { ...footer.value, social }
    markDirty()
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function saveConfig() {
    isSaving.value   = true
    saveStatus.value = 'idle'
    try {
      // Document FLAT envoyé au module PS ac_clientconfig via /api/save-config.
      // header.value est lui-même flat (topBar, logo, menu, features, contactEmail,
      // blog, ...) — on le spread au top-level, jamais imbriqué sous une clé `header`.
      //
      // Le slice `theme` n'est PLUS écrit ici : la persistance passe par
      // useThemeDb() → /api/theme/sync → cs_theme (DB-First structuré).
      // Laisser theme.value ici écraserait cs_client_config avec un document
      // editor state potentiellement non seed (incidents 2026-04-11 example-shop-v2
      // theme primary forcé à #2563eb).
      const config: Record<string, unknown> = {
        ...header.value,
        footer:            footer.value,
        homepage:          homepage.value,
        sections:          sections.value,
      }

      await $fetch('/api/save-config', {
        method: 'POST',
        body: {
          clientId: resolvedClientId.value,
          config,
        },
      })

      // Mettre à jour la config DB partagée pour que les composants
      // hors edit mode (TheHeader, TheFooter) reflètent immédiatement les changements
      const dbConfig = useState<Record<string, unknown> | null>('client_db_config')
      dbConfig.value = config

      isDirty.value    = false
      saveStatus.value = 'ok'
      setTimeout(() => { saveStatus.value = 'idle' }, 2500)
    } catch {
      saveStatus.value = 'error'
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    homepage, sections, theme, header, footer,
    activePanel, isDirty, isSaving, saveStatus, initialized,
    // Actions
    initFromConfig, markDirty, openGlobalPanel,
    moveSection, updateSectionVisibility,
    updateHero,
    addFeature, removeFeature, updateFeature,
    addCategory, removeCategory, updateCategory,
    addTestimonial, removeTestimonial, updateTestimonial,
    updateAbout, updateBlog, updateFaq,
    updateThemeColor, updateThemeTypography, updateThemeUI,
    updateHeader,
    updateFooter, updateFooterContact, updateFooterBottomBar, updateFooterSocial,
    saveConfig,
  }
}
