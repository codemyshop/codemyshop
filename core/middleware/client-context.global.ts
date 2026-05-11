

export default defineNuxtRouteMiddleware((to) => {
  const previewCookie = useCookie<string | null>('ac_preview', {
    maxAge:   86_400,   
    path:     '/',
    sameSite: 'lax',
  })

  const queryPreview = to.query.preview as string | undefined

  if (queryPreview !== undefined) {
    
    previewCookie.value = queryPreview || null
  }
  
})
