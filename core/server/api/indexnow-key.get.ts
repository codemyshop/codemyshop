

export default defineEventHandler((event) => {
  const key = process.env.INDEXNOW_API_KEY || ''
  if (!key) {
    throw createError({ statusCode: 404, message: 'Not configured' })
  }
  setResponseHeader(event, 'content-type', 'text/plain')
  return key
})
