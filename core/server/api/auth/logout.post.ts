

export default defineEventHandler((event) => {
  deleteCookie(event, 'hub_session', { path: '/' })
  return { success: true }
})
