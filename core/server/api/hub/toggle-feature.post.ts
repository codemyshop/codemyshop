

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    clientId:  string
    featureId: string
    action:    'enable' | 'disable'
  }>(event)

  if (!body.clientId || !body.featureId) {
    throw createError({ statusCode: 400, message: 'clientId et featureId requis' })
  }

  if (body.action === 'enable') {
    await enableFeature(body.clientId, body.featureId)
  } else {
    await disableFeature(body.clientId, body.featureId)
  }

  return { ok: true, enabled: await isFeatureEnabled(body.clientId, body.featureId) }
})
