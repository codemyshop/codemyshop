/**
 *
 * useAuth() — legacy auth composable from the header.
 *
 * Multi-tenant: if runtimeConfig.public.clientId ≠ 'ac-hub', route to
 * the endpoints `/api/catalogue/customer/*` (which resolve the tenant via
 * getTenantPsConfig on the server side). Otherwise we keep the endpoints `/api/auth/*`
 * historiques d'AC Hub (cookie hub_session, employees AC Hub).
 *
 * This indirection avoids touching UserMenu.vue while making it work
 * the header modal on all Nuxt tenants (Example Shop v2, etc.).
 */
export interface AuthUser {
  id: number
  email: string
  firstname: string
  lastname: string
  is_admin: boolean
  role: string
  user_type: 'employee' | 'customer'
  profileId?: number
}

export const useAuth = (opts?: { forceEmployee?: boolean }) => {
  const user    = useState<AuthUser | null>('auth_user', () => null)
  const loading = useState<boolean>('auth_loading', () => false)

  // forceEmployee est partagé via useState : une fois set par le layout
  // white-label, tous les useAuth() (y compris UserMenu) utilisent les
  // endpoints employee /api/auth/* au lieu de /api/catalogue/customer/*.
  const forceEmployeeState = useState<boolean>('auth_force_employee', () => false)
  if (opts?.forceEmployee) forceEmployeeState.value = true

  // Détection tenant côté client : public.clientId si exposé, sinon 'ac-hub'.
  const cfg = useRuntimeConfig()
  const tenantId = (cfg.public as any)?.clientId as string | undefined
  const isAcHub = !tenantId || tenantId === 'ac-hub'

  const useEmployeeEndpoints = isAcHub || forceEmployeeState.value

  const endpoints = useEmployeeEndpoints
    ? { login: '/api/auth/login', logout: '/api/auth/logout', me: '/api/auth/me' }
    : { login: '/api/catalogue/customer/login', logout: '/api/catalogue/customer/logout', me: '/api/catalogue/customer/me' }

  const fetchMe = async () => {
    try {
      const data = await $fetch<any>(endpoints.me)
      // /api/auth/me renvoie { logged: true, ... } ; /api/catalogue/customer/me renvoie { logged: true, customer: {...} }
      if (data?.logged) {
        const src = data.customer ?? data
        user.value = {
          id: src.customerId ?? src.id,
          email: src.email,
          firstname: src.firstname,
          lastname: src.lastname,
          is_admin: src.isAdmin ?? src.is_admin ?? false,
          role: src.role ?? 'employee',
          user_type: src.userType ?? src.user_type ?? 'customer',
          profileId: Number(src.profileId) || 0,
        }
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    loading.value = true
    try {
      const data = await $fetch<any>(endpoints.login, {
        method: 'POST',
        body: { email, password },
      }).catch((err: any) => {
        // /api/catalogue/customer/login throw 401 — on normalise en { success: false, error }
        if (err?.data?.message) return { success: false, error: err.data.message }
        return { success: false, error: 'Erreur de connexion au serveur' }
      })

      if (data?.success) {
        // AC Hub renvoie { employee: {...} } ; customer/login renvoie { customer: {...} }
        const src = data.employee ?? data.customer
        if (src) {
          user.value = {
            id: src.id ?? src.customerId,
            email: src.email,
            firstname: src.firstname,
            lastname: src.lastname,
            is_admin: src.is_admin ?? src.isAdmin ?? false,
            role: src.role ?? 'employee',
            user_type: src.user_type ?? src.userType ?? 'customer',
            profileId: Number(src.profileId) || 0,
          }
        }
        return { success: true }
      }
      return { success: false, error: data?.error ?? 'Identifiants incorrects' }
    } catch {
      return { success: false, error: 'Erreur de connexion au serveur' }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await $fetch(endpoints.logout, { method: 'POST' })
    } finally {
      user.value = null
    }
  }

  return { user, loading, login, logout, fetchMe }
}
