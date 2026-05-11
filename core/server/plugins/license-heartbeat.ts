

import { performHeartbeat } from '~/server/licensing/heartbeat'

export default defineNitroPlugin((nitro) => {
  
  setTimeout(async () => {
    const status = await performHeartbeat()
    console.log(`[license] Heartbeat boot — status: ${status}`)
  }, 5000) 

  
  setInterval(async () => {
    const status = await performHeartbeat()
    console.log(`[license] Heartbeat renewal — status: ${status}`)
  }, 24 * 60 * 60 * 1000)
})
