export default defineNuxtRouteMiddleware(async (to) => {
  
  if (import.meta.server) return

  
  
  
  
  const { user, fetchMe } = useAuth({ forceEmployee: true })

  
  if (!user.value) {
    await fetchMe()
  }

  
  if (!user.value) {
    return navigateTo({ path: '/hub/login', query: { redirect: to.fullPath } })
  }
  
  
  if (user.value.user_type !== 'employee') {
    return navigateTo('/')
  }
})
