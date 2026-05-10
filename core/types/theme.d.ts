/**
 * White-label system — Types of universal Header, Footer & Theme
 */

import type { NavItem, LogoConfig } from '~/types/menu'

// ════════════════════════════════════════════════════════════════════════════
// THÈME GRAPHIQUE
// ════════════════════════════════════════════════════════════════════════════

/** Niveaux de rayon pour les boutons, inputs et cartes */
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

/** Maximum width of the central column */
export type ContentWidth = '6xl' | '7xl' | '8xl' | 'full'

export interface ThemeColors {
  /**
   * Primary color — treated as shade 600.
   * Automatically generates the 50→900 palette via CSS variables.
   */
  primary: string

  /**
   * Secondary color — treated as shade 600.
   * Automatically generates the 50→900 palette via CSS variables.
   */
  secondary?: string

  /** Fond général de la page. ex: '#FFFFFF' ou '#F9FAFB' */
  background?: string

  /** Couleur de texte principal. ex: '#111827' */
  foreground?: string

  /** Secondary text / disabled / placeholder color. e.g.: '#6B7280' */
  muted?: string

  /** Header background (logo section + nav). e.g.: '#FFFFFF' */
  headerBg?: string

  /** Footer background. e.g.: '#1A1A1A' */
  footerBg?: string

  /** Top bar background. e.g.: '#1A1A1A' */
  topBarBg?: string

  /** Top bar text. e.g.: '#FFFFFF' */
  topBarText?: string
}

export interface ThemeTypography {
  /** Full CSS font. e.g.: 'Montserrat, sans-serif' or 'Inter, system-ui, sans-serif' */
  fontFamily?: string

  /** Base text size. e.g.: '16px' */
  baseFontSize?: string

  /**
   * Google Fonts URL (or other CDN) to inject in the <head> for this tenant.
   * ex: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap'
   */
  fontUrl?: string
}

export interface ThemeUI {
  /**
   * Corner radius of buttons, inputs and cards.
   * 'none' = square · 'sm' = slightly rounded · 'md' = standard ·
   * 'lg' = pronounced · 'full' = pill (very rounded search bars)
   */
  borderRadius?: BorderRadius

  /**
   * Enables or disables drop shadows site-wide.
   * false = flat interface (clean B2B style)
   */
  shadow?: boolean

  /**
   * Maximum width of the central column (header, content, footer).
   * '6xl' = 72rem (1152px, default) · '7xl' = 80rem (1280px) ·
   * '8xl' = 90rem (1440px) · 'full' = 100%
   */
  contentWidth?: ContentWidth
}

export interface ThemeConfig {
  colors:      ThemeColors
  typography?: ThemeTypography
  ui?:         ThemeUI
}

// ════════════════════════════════════════════════════════════════════════════
// BLOG (Marque Blanche)
// ════════════════════════════════════════════════════════════════════════════

export interface BlogPillar {
  label: string
  icon:  string
  color: string
  tagBg: string
  accent?: string
  desc:  string
}

export interface BlogAuthor {
  name:   string
  url:    string
  image?: string
  bio?:   string
  title?: string
}

export interface BlogPublisher {
  name:  string
  url:   string
  logo?: string
}

export interface BlogContactCta {
  title:     string
  subtitle:  string
  stat?:     string
  statLabel?: string
}

export interface BlogConfig {
  /** Titre de la page /blog */
  title:       string
  /** Meta description of the /blog page */
  description: string
  /** Author of articles (JSON-LD, author block) */
  author:      BlogAuthor
  /** Publisher for JSON-LD */
  publisher:   BlogPublisher
  /** Pillars / categories of the semantic silos */
  pillars:     Record<string, BlogPillar>
  /** Human labels of subcategories */
  subcatLabels?: Record<string, string>
  /** CTA of the contact form at the bottom of articles */
  contactCta?: BlogContactCta
  /** Number of articles on the homepage */
  limit?:      number
}

// ════════════════════════════════════════════════════════════════════════════
// HOMEPAGE (Marque Blanche)
// ════════════════════════════════════════════════════════════════════════════

export interface HomepageHero {
  title:     string
  subtitle?: string
  /** Absolute or relative image URL (background for 'banner', portrait for 'portfolio') */
  image?:    string
  cta?:      { label: string; href: string }
  /** Optional second CTA */
  cta2?:     { label: string; href: string }
  /** Layout: 'banner' (fullscreen background image) | 'portfolio' (text+photo side by side) */
  layout?:   'banner' | 'portfolio'
  /** Status badge above the title (e.g.: "Available for new projects") */
  badge?:    string
  /** Tags / skills displayed below the subtitle */
  tags?:     string[]
}

export interface HomepageCategory {
  label: string
  image: string
  href:  string
}

export type HomepageFeatureIcon =
  | 'truck' | 'shield' | 'store' | 'credit' | 'star' | 'clock' | 'check' | 'leaf'

export interface HomepageFeature {
  icon:         HomepageFeatureIcon
  label:        string
  description?: string
}

export interface HomepageTestimonial {
  author:  string
  role?:   string
  text:    string
  avatar?: string
  rating?: number
}

export interface HomepageAbout {
  title:       string
  subtitle?:   string
  paragraphs:  string[]
  image?:      string
  cta?:        { label: string; href: string }
  mapEmbed?:   string
}

export interface HomepageBlog {
  title?:     string
  subtitle?:  string
  /** Number of articles to display (default 3) */
  limit?:     number
}

export interface HomepageFaq {
  title?:    string
  subtitle?: string
}

export interface HomepageMalt {
  show: boolean
}

export interface HomepagePersonaItem {
  emoji:     string
  name:      string
  role:      string
  situation: string
  benefits:  string[]
  tags:      string[]
  color:     string
}

export interface HomepagePersonas {
  title?:    string
  subtitle?: string
  items:     HomepagePersonaItem[]
}

export interface HomepageConfig {
  hero?:         HomepageHero
  categories?:   HomepageCategory[]
  features?:     HomepageFeature[]
  testimonials?: HomepageTestimonial[]
  about?:        HomepageAbout
  blog?:         HomepageBlog
  faq?:          HomepageFaq
  malt?:         HomepageMalt
  personas?:     HomepagePersonas
}

// ════════════════════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════════════════════

export type FooterSocialPlatform =
  | 'linkedin' | 'twitter' | 'x' | 'facebook'
  | 'instagram' | 'youtube' | 'github' | 'tiktok'

export interface FooterSocialLink {
  platform: FooterSocialPlatform
  href:     string
  label?:   string
}

export interface FooterColumn {
  title: string
  links: Array<{
    label:     string
    href:      string
    external?: boolean
    badge?:    string
  }>
}

/** Trust badge displayed in the top band of the premium footer */
export interface FooterTrustBadge {
  icon:         HomepageFeatureIcon
  label:        string
  description?: string
}

export interface FooterConfig {
  logo?:        LogoConfig
  description?: string
  hours?:       string
  columns?:     FooterColumn[]
  contact?: {
    address?: string
    email?:   string
    phone?:   string
    cta?:     { label: string; href: string }
  }
  social?:   FooterSocialLink[]
  newsletter?: {
    show:         boolean
    title?:       string
    description?: string
    placeholder?: string
  }
  bottomBar?: {
    copyright?: string
    links?: Array<{ label: string; href: string }>
  }
  /** Controls text rendering: 'dark' = light text on dark background */
  theme?: 'dark' | 'light'

  /**
   * Footer template variant.
   * - 'default' (or omitted): historical layout, compatible with all tenants
   * - 'premium': editorial layout, generous spacing, trust band,
   * intended for premium e-commerce sites (Example Shop v2, etc.)
   */
  variant?: 'default' | 'premium'

  /**
   * Trust badges displayed in the top band of the premium variant.
   * Ignored if variant !== 'premium'.
   */
  trustBadges?: FooterTrustBadge[]
}

// ════════════════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════════════════

export interface TopBarConfig {
  message?:       string
  showLanguages?: boolean
  languages?: Array<{ code: string; label: string; href: string }>
}

export interface HeaderFeatures {
  showSearch?:   boolean
  showWishlist?: boolean
  showLogin?:    boolean
  showContact?:  boolean
  /** Active l'icône panier dans le header + le drawer slide-in (CartDrawer.vue) */
  showCart?:     boolean
  /** Enables the Events section on the white-label homepage */
  showEvents?:   boolean
  /** Sticky header (fixed at top on scroll) — disabled by default */
  stickyHeader?: boolean
  /** Header layout: 'stacked' (2 lines, default) or 'inline' (centered menu on 1 line) */
  headerLayout?: 'stacked' | 'inline'
}

export interface HeaderConfig {
  clientId: string
  domain?:  string | string[]
  topBar?:  TopBarConfig
  logo:     LogoConfig
  contactEmail?: string
  features?: HeaderFeatures
  menu: { items: NavItem[] }

  /** Complete brand charter: colors, typography, UI */
  theme?: ThemeConfig

  /** Default color mode: 'light' forces light, 'dark' forces dark, 'system' follows browser (default) */
  defaultColorMode?: 'light' | 'dark' | 'system'

  footer?: FooterConfig

  /** Blog configuration (white-label) */
  blog?: BlogConfig

  /** Homepage content (white-label) */
  homepage?: HomepageConfig
}
