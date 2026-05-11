export default defineNuxtRouteMiddleware(async () => {
  
  if (import.meta.server) return

  const { user, fetchMe } = useAuth({ forceEmployee: true })

  
  if (!user.value) {
    await fetchMe()
  }

  if (!user.value || user.value.user_type !== 'employee') {
    return navigateTo('/')
  }
})
