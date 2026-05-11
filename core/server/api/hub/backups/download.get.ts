

import { presignS3GetUrl } from '~/server/utils/s3-sign'
import { resolveClientId } from '~/server/utils/db'

const CLIENT_TO_BACKUP_TENANT: Record<string, string> = {
  'ac-hub':           'vaisseau-mere-ac',  
  'codemyshop':       'codemyshop',
  'example-shop':       'example-shop',
  'example-vape': 'example-vape',
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  if (!cfg.scwAccessKey || !cfg.scwSecretKey) {
    throw createError({ statusCode: 503, message: 'Backups Scaleway non configurés' })
  }

  const q = getQuery(event)
  const date = String(q.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: 'date doit être au format YYYY-MM-DD' })
  }

  const clientId = resolveClientId(event)
  const tenant = CLIENT_TO_BACKUP_TENANT[clientId]
  if (!tenant) {
    throw createError({ statusCode: 404, message: `Pas de backup pour '${clientId}'` })
  }

  const path = `${tenant}/${date}.sql.gz`
  const url = presignS3GetUrl({
    accessKey: cfg.scwAccessKey as string,
    secretKey: cfg.scwSecretKey as string,
    region:    cfg.scwRegion as string,
    endpoint:  cfg.scwEndpoint as string,
    bucket:    cfg.scwBucket as string,
  }, path, 300)

  
  
  await sendRedirect(event, url, 302)
})
