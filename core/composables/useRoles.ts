/**
 *
 * User role system for the Hub.
 * 8 business profiles, each with a customized hub.
 *
 * The role is resolved from the session (role field, mapped from id_profile)
 * or simulated via the query param ?role=SALES for dev/demo.
 */

export type UserRole = 'ROOT' | 'FOUNDER' | 'MARKET' | 'SALES' | 'SUPPORT' | 'LOGISTIC' | 'CATALOG' | 'EMPLOYEE'

const ALL_ROLES: UserRole[] = ['ROOT', 'FOUNDER', 'MARKET', 'SALES', 'SUPPORT', 'LOGISTIC', 'CATALOG', 'EMPLOYEE']

/**
 * Permissions par section — fallback statique.
 *
 * Runtime source of truth = cs_profile_section (DB), fetched by
 * useProfileSections() at Hub startup. This map serves only as a
 * fallback if the DB is unreachable / the table is missing.
 */
const SECTION_ACCESS: Record<string, UserRole[]> = {
  dashboard:      ALL_ROLES,
  orders:         ['ROOT', 'FOUNDER', 'SALES', 'SUPPORT'],
  crm:            ['ROOT', 'FOUNDER', 'SALES', 'SUPPORT'],
  crm_sav:        ['ROOT', 'FOUNDER', 'SUPPORT'],
  catalogue:      ['ROOT', 'FOUNDER', 'CATALOG', 'MARKET'],
  intelligence:   ['ROOT', 'FOUNDER', 'MARKET'],
  automatisations: ['ROOT', 'FOUNDER', 'MARKET'],
  logistique:     ['ROOT', 'FOUNDER', 'LOGISTIC'],
  prm:            ['ROOT', 'FOUNDER', 'LOGISTIC'],
  fin:            ['ROOT', 'FOUNDER'],
  growth:         ['ROOT', 'FOUNDER', 'MARKET'],
  playbooks:      ALL_ROLES,
  playbooks_edit: ['ROOT', 'FOUNDER'],
  admin:          ['ROOT'],
  system:         ['ROOT'],
  founder_admin:  ['ROOT', 'FOUNDER'],
}

/** Mapping role front → id_profile PS (cf. core/server/utils/roles.ts) */
const ROLE_TO_PROFILE: Record<UserRole, number> = {
  ROOT: 1, FOUNDER: 3, MARKET: 4, SALES: 5,
  SUPPORT: 6, LOGISTIC: 7, CATALOG: 8, EMPLOYEE: 9,
}

/** Color associated with the role (for sidebar badge) */
const ROLE_COLORS: Record<UserRole, string> = {
  ROOT:     'text-red-500',
  FOUNDER:  'text-primary-500',
  MARKET:   'text-violet-500',
  SALES:    'text-emerald-500',
  SUPPORT:  'text-sky-500',
  LOGISTIC: 'text-amber-500',
  CATALOG:  'text-teal-500',
  EMPLOYEE: 'text-gray-400',
}

/** Human-readable label for the role */
const ROLE_LABELS: Record<UserRole, string> = {
  ROOT:     'Super Admin',
  FOUNDER:  'Fondateur',
  MARKET:   'Marketing',
  SALES:    'Commercial',
  SUPPORT:  'Support',
  LOGISTIC: 'Logistique',
  CATALOG:  'Catalogue',
  EMPLOYEE: 'Employé',
}

export const useRoles = () => {
  const auth = useAuth()
  const user = (auth as any).user as Ref<{ is_admin?: boolean; role?: string } | null> | undefined
  const route = useRoute()

  /** Actual role from the session, without any override (used to decide who can switch). */
  const actualRole = computed<UserRole>(() => {
    const sessionRole = user?.value?.role?.toUpperCase()
    if (sessionRole && ALL_ROLES.includes(sessionRole as UserRole)) {
      return sessionRole as UserRole
    }
    if (user?.value?.is_admin) return 'ROOT'
    return 'EMPLOYEE'
  })
  const actualIsOwner = computed(() => actualRole.value === 'ROOT' || actualRole.value === 'FOUNDER')
  /** True only for the actual SuperAdmin — gates the "View as" simulation. */
  const actualIsRoot = computed(() => actualRole.value === 'ROOT')

  /**
   * Override "View as" persisted locally, accessible only to
   * super-admin / founders. Allows previewing the hub of another
   * profile without changing sessions.
   */
  const viewAsRole = useState<UserRole | null>('view_as_role', () => {
    if (!import.meta.client) return null
    try {
      const v = localStorage.getItem('hub_view_as_role')
      return v && ALL_ROLES.includes(v as UserRole) ? (v as UserRole) : null
    } catch { return null }
  })
  function setViewAsRole(r: UserRole | null) {
    viewAsRole.value = r
    if (!import.meta.client) return
    try {
      if (r) localStorage.setItem('hub_view_as_role', r)
      else localStorage.removeItem('hub_view_as_role')
    } catch {}
  }

  /** Rôle effectif — viewAs (si autorisé) > query > session */
  const role = computed<UserRole>(() => {
    if (actualIsRoot.value && viewAsRole.value && ALL_ROLES.includes(viewAsRole.value)) {
      return viewAsRole.value
    }

    // Dev/demo override: ?role=SALES
    const override = (route.query.role as string | undefined)?.toUpperCase()
    if (override && ALL_ROLES.includes(override as UserRole)) {
      return override as UserRole
    }

    return actualRole.value
  })

  const isRoot     = computed(() => role.value === 'ROOT')
  const isFounder  = computed(() => role.value === 'FOUNDER')
  const isMarket   = computed(() => role.value === 'MARKET')
  const isSales    = computed(() => role.value === 'SALES')
  const isSupport  = computed(() => role.value === 'SUPPORT')
  const isLogistic = computed(() => role.value === 'LOGISTIC')
  const isCatalog  = computed(() => role.value === 'CATALOG')
  const isEmployee = computed(() => role.value === 'EMPLOYEE')

  // Compat legacy
  const isOwner     = computed(() => role.value === 'ROOT' || role.value === 'FOUNDER')
  const isMarketing = computed(() => role.value === 'MARKET')
  const isLogistics = computed(() => role.value === 'LOGISTIC')

  const roleColor = computed(() => ROLE_COLORS[role.value] ?? 'text-gray-400')
  const roleLabel = computed(() => ROLE_LABELS[role.value] ?? role.value)

  // Global cache of the dynamic profile → sections mapping (fetched 1×)
  const dynamicMap = useState<Record<number, string[]> | null>(
    'profile_sections_map',
    () => null,
  )
  const dynamicLoading = useState<boolean>(
    'profile_sections_loading',
    () => false,
  )

  async function ensureDynamicMap() {
    if (dynamicMap.value || dynamicLoading.value) return
    if (!import.meta.client) return
    if (!user?.value || (user.value as any).user_type === 'customer') return
    dynamicLoading.value = true
    try {
      const data = await $fetch<any>('/api/bo/team/profile-sections')
      const m: Record<number, string[]> = {}
      for (const [k, v] of Object.entries(data?.map || {})) {
        m[Number(k)] = Array.isArray(v) ? v as string[] : []
      }
      dynamicMap.value = m
    } catch {
      // Silent: we stay on the static fallback.
      dynamicMap.value = {}
    } finally {
      dynamicLoading.value = false
    }
  }

  // Fire-and-forget: triggers the fetch on first client-side usage.
  if (import.meta.client) {
    ensureDynamicMap()
  }

  /**
   * Checks if the current role has access to a section.
   *
   * Priority: cs_profile_section (DB) if available for the profileId
   * of the user. Otherwise fallback to static SECTION_ACCESS.
   */
  function canAccess(section: string): boolean {
    // En mode "View as" (réservé SuperAdmin), on simule le profileId du
    // rôle cible — sinon le sidebar lirait toujours les sections du compte
    // réel et la simulation n'aurait aucun effet visible.
    const isSimulating = actualIsRoot.value && !!viewAsRole.value
    const profileId = isSimulating
      ? ROLE_TO_PROFILE[viewAsRole.value!] || 0
      : Number((user?.value as any)?.profileId) || ROLE_TO_PROFILE[role.value] || 0

    const dyn = dynamicMap.value
    if (dyn && profileId && dyn[profileId]?.length) {
      return dyn[profileId].includes(section)
    }

    const allowed = SECTION_ACCESS[section]
    if (!allowed) return true
    return allowed.includes(role.value)
  }

  return {
    role, roleColor, roleLabel,
    actualRole, actualIsOwner, actualIsRoot,
    viewAsRole, setViewAsRole,
    isRoot, isFounder, isMarket, isSales, isSupport, isLogistic, isCatalog, isEmployee,
    isOwner, isMarketing, isLogistics,
    canAccess,
    refreshSections: () => { dynamicMap.value = null; ensureDynamicMap() },
  }
}

/** Catalogue exposé pour le sélecteur "View as" du topbar. */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = ALL_ROLES.map(r => ({
  value: r,
  label: ROLE_LABELS[r],
}))
