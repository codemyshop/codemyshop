/**
 * White-label system — Types of universal menu
 * Each tenant has its own config/clients/<id>.ts file
 */

// ── Sous-lien dans une colonne de Mega Menu ────────────────────────────────
export interface MegaMenuSubLink {
  label:        string
  href:         string
  /**
   * PrestaShop category ID (for API calls /api/categories/:psId/products).
   * Not used client-side navigation but stored in config for the Nuxt proxy.
   */
  psId?:        number
  description?: string   // ligne descriptive sous le label (optionnel)
  badge?:       string   // ex: "Nouveau", "Pro"
}

// ── Colonne du Mega Menu ───────────────────────────────────────────────────
export interface MegaMenuColumn {
  title?: string             // titre de colonne (optionnel)
  icon?:  string             // emoji ou chemin SVG (optionnel)
  links:  MegaMenuSubLink[]
}

// ── Entrée de navigation (lien simple OU dropdown simple OU mega menu) ───────
export interface NavItem {
  label:      string
  href?:      string             // défini si lien simple
  megaMenu?:  MegaMenuColumn[]   // défini si dropdown ou mega menu
  /**
   * false (default) → simple dropdown: minimal vertical list, without
   * columns nor icons. Suited for a clean showcase site (e.g. example-showcase).
   * true → full mega menu: multi-column grid with titles
   * and icons. Reserved for sites with large catalogs (e.g. example-shop).
   */
  isMegaMenu?: boolean
  highlight?:  boolean           // rendu en bouton CTA
  external?:   boolean           // ouvre dans un nouvel onglet
  bgColor?:    string            // couleur fond de l'onglet (ex: '#c23d2e')
  textColor?:  string            // couleur texte de l'onglet (ex: '#ffffff')
  rightAlign?: boolean           // pousse l'item à droite (ml-auto)
}

// ── Configuration du logo ──────────────────────────────────────────────────
export interface LogoConfig {
  src?:   string   // chemin image (PNG/SVG dans /public)
  text?:  string   // texte de remplacement si pas d'image
  href:   string   // destination du clic logo (ex: '/')
  alt?:   string   // attribut alt de l'image
  class?: string   // classes Tailwind supplémentaires (ex: 'h-14 max-w-[200px]')
}

// ── Configuration complète d'un client ────────────────────────────────────
export interface MenuConfig {
  /** Identifiant unique du client, correspond au nom de fichier */
  clientId: string

  /**
   * Domain(s) on which this tenant is automatically detected.
   * Can be a string or an array for multi-domain support.
   * ex: 'example-shop.com' ou ['example-shop.com', 'www.example-shop.com']
   */
  domain?: string | string[]

  logo:  LogoConfig
  items: NavItem[]

  /** Lien optionnel "Connexion / Espace client" en bout de nav */
  authLink?: {
    label: string
    href:  string
  }

  /** Brand colors for arbitrary inline Tailwind overrides */
  brand?: {
    primary?:    string   // ex: '#e03a2f'
    background?: string   // fond de la navbar
  }
}
