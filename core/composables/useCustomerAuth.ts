/**
 *
 * Auth client storefront B2B (PrestaShop customers).
 * Multi-tenant: no clientId to pass — the endpoints
 * resolve them server-side via resolveTenantClientId.
 *
 * Not to be confused with useAuth() which handles employee/admin auth
 * in the admin panel.
 */

export interface CustomerSession {
  customerId: number
  email: string
  firstname: string
  lastname: string
  company: string
  userType?: 'customer' | 'employee'
  isAdmin?: boolean
  isImpersonated?: boolean
  impersonationSessionId?: number
  impersonatorEmployeeId?: number
}

export function useCustomerAuth() {
  // Source de vérité unique : useState SSR-hydraté à partir de /api/catalogue/customer/me.
  // L'ancien cookie public `ac_logged_in` (lisible par JS, donc XSS-faussable) a
  // été retiré le 2026-05-05 — la layout white-label appelle checkSession() au
  // setup serveur, et le payload Nuxt sérialise customer.value pour le client.
  const customer = useState<CustomerSession | null>('customer-auth', () => null)
  const loggedIn = computed(() => !!customer.value)
  const loading = useState<boolean>('customer-auth-loading', () => false)

  async function checkSession() {
    try {
      // Forward cookies during SSR (sinon le cookie ac_session n'est pas envoyé)
      const headers: Record<string, string> = {}
      if (import.meta.server) {
        const reqHeaders = useRequestHeaders(['cookie'])
        if (reqHeaders.cookie) headers.cookie = reqHeaders.cookie
      }
      const data = await $fetch<{ loggedIn: boolean } & Partial<CustomerSession>>('/api/catalogue/customer/me', { headers })
      if (data.loggedIn) {
        customer.value = {
          customerId: data.customerId!,
          email: data.email!,
          firstname: data.firstname!,
          lastname: data.lastname!,
          company: data.company || '',
          userType: data.userType,
          isAdmin: data.isAdmin,
          isImpersonated: data.isImpersonated,
          impersonationSessionId: data.impersonationSessionId,
          impersonatorEmployeeId: data.impersonatorEmployeeId,
        }
      } else {
        customer.value = null
      }
    } catch {
      customer.value = null
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; customer: CustomerSession; isAdmin?: boolean }>(
        '/api/catalogue/customer/login',
        { method: 'POST', body: { email, password } },
      )
      if (res.success) customer.value = res.customer
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(data: {
    firstname: string
    lastname: string
    email: string
    password: string
    company: string
    siret?: string
  }) {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; customer: CustomerSession }>(
        '/api/catalogue/customer/register',
        { method: 'POST', body: data },
      )
      if (res.success) customer.value = res.customer
      return res
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/catalogue/customer/logout', { method: 'POST' })
    customer.value = null
  }

  return { customer, loggedIn, loading, checkSession, login, register, logout }
}
