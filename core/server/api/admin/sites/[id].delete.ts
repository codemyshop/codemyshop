

import { unlinkSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const clientId = getRouterParam(event, 'id')
  if (!clientId) throw createError({ statusCode: 400, message: 'Client ID requis' })

  
  if (clientId === 'ac-hub') {
    throw createError({ statusCode: 403, message: 'Impossible de supprimer le Hub principal' })
  }

  const steps: string[] = []
  const repoRoot = resolve(process.cwd(), '..')

  
  const containerName = `${clientId}_nuxt`.replace(/-/g, '_')
  try {
    execSync(`docker stop -t 1 ${containerName} 2>/dev/null`, { timeout: 10000 })
    execSync(`docker rm -f ${containerName} 2>/dev/null`, { timeout: 10000 })
    steps.push(`Container ${containerName} arrêté et supprimé`)
  } catch {
    steps.push(`Container ${containerName} non trouvé (déjà supprimé ?)`)
  }

  
  const nginxConf = resolve(repoRoot, `nginx/conf.d/${clientId}.conf`)
  if (existsSync(nginxConf)) {
    try {
      unlinkSync(nginxConf)
      steps.push(`Vhost Nginx supprimé : ${clientId}.conf`)
    } catch (err: any) {
      steps.push(`Erreur suppression vhost : ${err.message}`)
    }
  } else {
    steps.push(`Vhost ${clientId}.conf non trouvé`)
  }

  
  try {
    execSync('docker exec ac_nginx nginx -s reload 2>&1', { timeout: 5000 })
    steps.push('Nginx rechargé')
  } catch {
    steps.push('Nginx reload échoué (vérifier manuellement)')
  }

  
  const { deactivateClientVps } = await import('~/internal/hub/server/utils/hub')
  const affected = await deactivateClientVps(clientId)
  if (affected > 0) {
    steps.push(`Client '${clientId}' désactivé en DB`)
  } else {
    steps.push(`Client '${clientId}' non trouvé en DB`)
  }

  console.log(`[admin] Client '${clientId}' supprimé —`, steps.join(' | '))

  return { success: true, clientId, steps }
})
