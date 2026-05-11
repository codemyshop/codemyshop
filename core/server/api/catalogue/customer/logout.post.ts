

export default defineEventHandler((event) => {
  deleteCookie(event, 'ac_session', { path: '/' })
  
  
  deleteCookie(event, 'ac_logged_in', { path: '/' })
  return { success: true }
})
