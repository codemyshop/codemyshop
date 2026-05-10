/**
 *
 * GET /api/impersonate/active
 * Returns the active impersonation session of the connected user, or null.
 *
 * Used by the ImpersonationBanner component to display the permanent orange banner.
 * Auto-expires expired sessions before read.
 */
import { getActiveSession } from '~/internal/impersonation/server/utils/impersonation'
import { clearImpersonationCookie } from '~/internal/impersonation/server/utils/cookie'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const active = await getActiveSession(session.employeeId, { event })
  if (!active) {
    clearImpersonationCookie(event)
    return { active: null }
  }
  return { active }
})
