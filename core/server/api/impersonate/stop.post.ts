

import {
  getActiveSession,
  stopSession,
  type CloseReason,
} from '~/internal/impersonation/server/utils/impersonation'
import { clearImpersonationCookie } from '~/internal/impersonation/server/utils/cookie'
import { requireEmployeeSession } from '~/server/utils/session'

interface Body { closeReason?: CloseReason }

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)

  const body = await readBody<Body>(event).catch(() => ({} as Body))
  const closeReason: CloseReason = body?.closeReason === 'logout' ? 'logout' : 'manual'

  const active = await getActiveSession(session.employeeId, { event })
  if (!active) {
    clearImpersonationCookie(event)
    return { ok: true, closed: false }
  }

  const closed = await stopSession(active.idSession, closeReason, { event })
  clearImpersonationCookie(event)
  return { ok: true, closed: true, session: closed }
})
