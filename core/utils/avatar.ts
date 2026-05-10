/**
 * Constants and helpers related to visitor avatars.
 * Auto-imported by Nuxt — available on client and server side.
 */
import type { AvatarType, SectionVisibilityRule } from '~/types/avatar'

// ── Métadonnées affichage ──────────────────────────────────────────────────

export const AVATAR_META: Record<AvatarType, { label: string; icon: string; colorClass: string }> = {
  'prospect-ecommerce': { label: 'Prospect E-commerce', icon: '🛒', colorClass: 'bg-violet-100 text-violet-700' },
  'client-maintenance': { label: 'Client Maintenance',  icon: '🔧', colorClass: 'bg-blue-100 text-blue-700'   },
  'agence':             { label: 'Agence',              icon: '🏢', colorClass: 'bg-indigo-100 text-indigo-700' },
  'entrepreneur':       { label: 'Entrepreneur',        icon: '🚀', colorClass: 'bg-amber-100 text-amber-700'  },
  'acheteur-pro':       { label: 'Acheteur Pro',        icon: '💼', colorClass: 'bg-green-100 text-green-700'  },
  'particulier':        { label: 'Particulier',         icon: '👤', colorClass: 'bg-gray-100 text-gray-600'    },
  'revendeur':          { label: 'Revendeur',           icon: '🔄', colorClass: 'bg-orange-100 text-orange-700' },
  'unknown':            { label: 'Inconnu',             icon: '❓', colorClass: 'bg-gray-100 text-gray-400'    },
}

/** Liste ordonnée des avatars AC Hub pour la sidebar éditeur */
export const AC_HUB_AVATARS: AvatarType[] = [
  'prospect-ecommerce',
  'client-maintenance',
  'agence',
  'entrepreneur',
]

/** All available avatars */
export const ALL_AVATARS: AvatarType[] = [
  ...AC_HUB_AVATARS,
  'acheteur-pro',
  'particulier',
  'revendeur',
  'unknown',
]

// ── Visibility helpers ─────────────────────────────────────────────────

/**
 * Checks if an avatar should see the section according to the given rule.
 * If no rule or empty avatars → always visible.
 */
export function shouldShowForAvatar(
  avatarType: AvatarType,
  rule?: SectionVisibilityRule | null,
): boolean {
  if (!rule || rule.avatars.length === 0) return true
  const isListed = rule.avatars.includes(avatarType)
  return rule.mode === 'show' ? isListed : !isListed
}

/** Génère un label humain pour une règle de visibilité */
export function formatVisibilityLabel(rule: SectionVisibilityRule): string {
  if (!rule.avatars.length) return 'Tout le monde'
  const names = rule.avatars.map(a => AVATAR_META[a]?.label ?? a).join(', ')
  return rule.mode === 'show' ? `Visible : ${names}` : `Masqué : ${names}`
}

/** Default rule (no restriction) */
export const DEFAULT_VISIBILITY_RULE: SectionVisibilityRule = {
  avatars: [],
  mode:    'show',
}
