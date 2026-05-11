

export type UserRole = 'ROOT' | 'FOUNDER' | 'MARKET' | 'SALES' | 'SUPPORT' | 'LOGISTIC' | 'CATALOG' | 'EMPLOYEE'

const ALL_ROLES: UserRole[] = ['ROOT', 'FOUNDER', 'MARKET', 'SALES', 'SUPPORT', 'LOGISTIC', 'CATALOG', 'EMPLOYEE']

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

const ROLE_TO_PROFILE: Record<UserRole, number> = {
  ROOT: 1, FOUNDER: 3, MARKET: 4, SALES: 5,
  SUPPORT: 6, LOGISTIC: 7, CATALOG: 8, EMPLOYEE: 9,
}

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

  
  const actualRole = computed<UserRole>(() => {
    const sessionRole = user?.value?.role?.toUpperCase()
    if (sessionRole && ALL_ROLES.includes(sessionRole as UserRole)) {
      return sessionRole as UserRole
    }
    if (user?.value?.is_admin) return 'ROOT'
    return 'EMPLOYEE'
  })
  const actualIsOwner = computed(() => actualRole.value === 'ROOT' || actualRole.value === 'FOUNDER')
  
  const actualIsRoot = computed(() => actualRole.value === 'ROOT')

  

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

  
  const role = computed<UserRole>(() => {
    if (actualIsRoot.value && viewAsRole.value && ALL_ROLES.includes(viewAsRole.value)) {
      return viewAsRole.value
    }

    
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

  
  const isOwner     = computed(() => role.value === 'ROOT' || role.value === 'FOUNDER')
  const isMarketing = computed(() => role.value === 'MARKET')
  const isLogistics = computed(() => role.value === 'LOGISTIC')

  const roleColor = computed(() => ROLE_COLORS[role.value] ?? 'text-gray-400')
  const roleLabel = computed(() => ROLE_LABELS[role.value] ?? role.value)

  
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
      
      dynamicMap.value = {}
    } finally {
      dynamicLoading.value = false
    }
  }

  
  if (import.meta.client) {
    ensureDynamicMap()
  }

  

  function canAccess(section: string): boolean {
    
    
    
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

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = ALL_ROLES.map(r => ({
  value: r,
  label: ROLE_LABELS[r],
}))
