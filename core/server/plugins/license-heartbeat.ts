/**
 *
 * Nitro plugin: license heartbeat at server startup.
 * Validates the license with the central server and renews every 24h.
 */
import { performHeartbeat } from '~/server/licensing/heartbeat'

export default defineNitroPlugin((nitro) => {
  // Heartbeat au boot (non bloquant)
  setTimeout(async () => {
    const status = await performHeartbeat()
    console.log(`[license] Heartbeat boot — status: ${status}`)
  }, 5000) // 5s après le démarrage pour laisser le serveur s'initialiser

  // Renouvellement automatique toutes les 24h
  setInterval(async () => {
    const status = await performHeartbeat()
    console.log(`[license] Heartbeat renewal — status: ${status}`)
  }, 24 * 60 * 60 * 1000)
})
