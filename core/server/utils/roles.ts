/**
 *
 * Mapping of Front-end roles ↔ PrestaShop id_profile.
 * PS 8.x uses the ps_profile table for employee profiles.
 */

export interface RoleMapping {
  frontRole:   string
  label:       string
  psProfileId: number
  psProfileName: string
  isAdmin:     boolean
}

/**
 * Bidirectional mapping: front-end role → PS id_profile.
 *
 * Profils PS (table ps_profile) :
 * 1 = SuperAdmin → root (full access, technical included)
 * 3 = Founder → founder (everything except admin/technical)
 *   4 = Marketing    → market (acquisition, contenu, SEO)
 *   5 = Sales        → sales (commandes, clients, devis)
 *   6 = Support      → support (SAV, tickets, clients)
 * 7 = Logistic → logistic (inventory, shipments)
 * 8 = Catalog → catalog (product sheets, categories)
 *   9 = Employee     → employee (lecture seule basique)
 *
 * id_profile 2 = admin.example-shop (legacy Exploseo, ignored)
 */
export const ROLE_MAP: Record<string, RoleMapping> = {
  root:     { frontRole: 'root',     label: 'Super Admin',    psProfileId: 1, psProfileName: 'SuperAdmin', isAdmin: true },
  founder:  { frontRole: 'founder',  label: 'Fondateur',      psProfileId: 3, psProfileName: 'Founder',    isAdmin: true },
  market:   { frontRole: 'market',   label: 'Marketing',      psProfileId: 4, psProfileName: 'Marketing',  isAdmin: false },
  sales:    { frontRole: 'sales',    label: 'Commercial',     psProfileId: 5, psProfileName: 'Sales',      isAdmin: false },
  support:  { frontRole: 'support',  label: 'Support',        psProfileId: 6, psProfileName: 'Support',    isAdmin: false },
  logistic: { frontRole: 'logistic', label: 'Logistique',     psProfileId: 7, psProfileName: 'Logistic',   isAdmin: false },
  catalog:  { frontRole: 'catalog',  label: 'Catalogue',      psProfileId: 8, psProfileName: 'Catalog',    isAdmin: false },
  employee: { frontRole: 'employee', label: 'Employé',        psProfileId: 9, psProfileName: 'Employee',   isAdmin: false },
}

/** Index inversé : id_profile → frontRole (construit une seule fois) */
const PROFILE_TO_ROLE: Record<number, string> = Object.fromEntries(
  Object.values(ROLE_MAP).map(r => [r.psProfileId, r.frontRole]),
)

/** Resolves the PS id_profile from a front-end role */
export function getPsProfileId(frontRole: string): number {
  return ROLE_MAP[frontRole]?.psProfileId ?? 9
}

/** Resolves the front-end role from a PS id_profile */
export function getFrontRole(psProfileId: number): string {
  return PROFILE_TO_ROLE[psProfileId] ?? 'employee'
}

/** Human-readable label from a front-end role */
export function getRoleLabel(frontRole: string): string {
  return ROLE_MAP[frontRole]?.label ?? frontRole
}

/** Determines whether the PS profile grants admin access */
export function isProfileAdmin(psProfileId: number): boolean {
  const role = getFrontRole(psProfileId)
  return ROLE_MAP[role]?.isAdmin ?? false
}
