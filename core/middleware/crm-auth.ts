export default defineNuxtRouteMiddleware(async () => {
  // Server-side: no session available, pass through (ssr:false handles the rest)
  if (import.meta.server) return

  const { user, fetchMe } = useAuth({ forceEmployee: true })

  // If user not yet loaded, attempt to retrieve from cookie
  if (!user.value) {
    await fetchMe()
  }

  if (!user.value || user.value.user_type !== 'employee') {
    return navigateTo('/')
  }
})
