

export interface RoleMapping {
  frontRole:   string
  label:       string
  psProfileId: number
  psProfileName: string
  isAdmin:     boolean
}

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

const PROFILE_TO_ROLE: Record<number, string> = Object.fromEntries(
  Object.values(ROLE_MAP).map(r => [r.psProfileId, r.frontRole]),
)

export function getPsProfileId(frontRole: string): number {
  return ROLE_MAP[frontRole]?.psProfileId ?? 9
}

export function getFrontRole(psProfileId: number): string {
  return PROFILE_TO_ROLE[psProfileId] ?? 'employee'
}

export function getRoleLabel(frontRole: string): string {
  return ROLE_MAP[frontRole]?.label ?? frontRole
}

export function isProfileAdmin(psProfileId: number): boolean {
  const role = getFrontRole(psProfileId)
  return ROLE_MAP[role]?.isAdmin ?? false
}
