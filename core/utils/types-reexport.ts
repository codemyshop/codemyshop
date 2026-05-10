/**
 * Re-export of types from core/types/ for Nuxt Layers auto-import.
 * Nuxt auto-imports utils/ but not types/ — this file bridges the gap.
 */
export type { EventRecord, EventRegistration } from '~/types/event'
export type { AvatarType, SectionVisibilityRule } from '~/types/avatar'
export type { MenuItem, MegaMenuColumn } from '~/types/menu'
