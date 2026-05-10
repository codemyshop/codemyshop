/**
 * AI Personalization System — Visitor Avatars
 * Shared front/server types (auto-imported via ~/types/).
 */

// ── Types d'avatars ────────────────────────────────────────────────────────

/** Avatars pour AC Hub (mon site perso) */
export type AcHubAvatarType =
  | 'prospect-ecommerce'  // Intéressé par des services PS/Nuxt/SEO
  | 'client-maintenance'  // Client existant en contrat maintenance
  | 'agence'              // Agence web cherchant un sous-traitant
  | 'entrepreneur'        // Créateur de boutique, projet de démarrage

/** Generic avatars — reusable across instances */
export type GenericAvatarType =
  | 'acheteur-pro'        // B2B, achète en volume
  | 'particulier'         // B2C classique
  | 'revendeur'           // Distributeur / grossiste
  | 'unknown'             // Non classifié

export type AvatarType = AcHubAvatarType | GenericAvatarType

// ── Profil visiteur ────────────────────────────────────────────────────────

export interface VisitorAvatar {
  type:        AvatarType
  label:       string        // "Prospect E-commerce"
  confidence:  number        // 0-1
  signals:     string[]      // ["Page /blog/prestashop visitée", "Formulaire soumis"]
  computedAt:  string        // ISO date
  clientId:    string        // "ac-hub" | "example-shop" | ...
  visitorId:   string        // UUID anonyme (jamais lié à l'email)
}

// ── Visibility rules ───────────────────────────────────────────────────

export interface SectionVisibilityRule {
  /** List of avatars affected by the rule. Empty = no restriction. */
  avatars: AvatarType[]
  /**
   * 'show' = displays only to listed avatars.
   * 'hide' = hidden from listed avatars, visible to others.
   */
  mode:    'show' | 'hide'
  /** Description lisible par l'éditeur */
  label?:  string
}

// ── Signaux de classification ──────────────────────────────────────────────

export interface VisitorSignals {
  pagesViewed?:   string[]   // ex: ['/blog/prestashop/...', '/contact']
  utmSource?:     string     // 'malt' | 'google' | 'linkedin'
  formSubject?:   string     // Sujet du formulaire de contact
  formMessageHash?: string   // SHA-256 du corps du message (privacy-safe)
}
