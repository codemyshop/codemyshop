

import type { NavItem, LogoConfig } from '~/types/menu'

export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

export type ContentWidth = '6xl' | '7xl' | '8xl' | 'full'

export interface ThemeColors {
  

  primary: string

  

  secondary?: string

  
  background?: string

  
  foreground?: string

  
  muted?: string

  
  headerBg?: string

  
  footerBg?: string

  
  topBarBg?: string

  
  topBarText?: string
}

export interface ThemeTypography {
  
  fontFamily?: string

  
  baseFontSize?: string

  

  fontUrl?: string
}

export interface ThemeUI {
  

  borderRadius?: BorderRadius

  

  shadow?: boolean

  

  contentWidth?: ContentWidth
}

export interface ThemeConfig {
  colors:      ThemeColors
  typography?: ThemeTypography
  ui?:         ThemeUI
}

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
  
  title:       string
  
  description: string
  
  author:      BlogAuthor
  
  publisher:   BlogPublisher
  
  pillars:     Record<string, BlogPillar>
  
  subcatLabels?: Record<string, string>
  
  contactCta?: BlogContactCta
  
  limit?:      number
}

export interface HomepageHero {
  title:     string
  subtitle?: string
  
  image?:    string
  cta?:      { label: string; href: string }
  
  cta2?:     { label: string; href: string }
  
  layout?:   'banner' | 'portfolio'
  
  badge?:    string
  
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
  
  theme?: 'dark' | 'light'

  

  variant?: 'default' | 'premium'

  

  trustBadges?: FooterTrustBadge[]
}

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
  
  showCart?:     boolean
  
  showEvents?:   boolean
  
  stickyHeader?: boolean
  
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

  
  theme?: ThemeConfig

  
  defaultColorMode?: 'light' | 'dark' | 'system'

  footer?: FooterConfig

  
  blog?: BlogConfig

  
  homepage?: HomepageConfig
}
