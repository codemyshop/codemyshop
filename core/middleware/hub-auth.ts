export default defineNuxtRouteMiddleware(async (to) => {
  // Server-side: no session available, pass through (ssr:false handles the rest)
  if (import.meta.server) return

  // forceEmployee: on the instances (example-shop-v2, example-vape-v2…)
  // useAuth() routes by default to /api/catalogue/customer/me (frontend client).
  // The hub is the employee back-office — force the /api/auth/me endpoints, otherwise
  // the employee session is never hydrated and middleware redirects in a loop.
  const { user, fetchMe } = useAuth({ forceEmployee: true })

  // If user not yet loaded, attempt to retrieve from cookie
  if (!user.value) {
    await fetchMe()
  }

  // No session → /hub/login while preserving the target in redirect param.
  if (!user.value) {
    return navigateTo({ path: '/hub/login', query: { redirect: to.fullPath } })
  }
  // Logged in but not an employee (customer) → public home (not /hub/login,
  // a customer has no reason to access the back-office).
  if (user.value.user_type !== 'employee') {
    return navigateTo('/')
  }
})
