/**
 *
 * GET /api/hub/fleet-status
 * Scan the entire fleet and return aggregated metrics.
 * Reserved for the Super-Admin (central system).
 */

export default defineEventHandler(async () => {
  return await scanFleet()
})
