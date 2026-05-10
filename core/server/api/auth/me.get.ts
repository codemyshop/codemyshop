/**
 *
 * GET /api/auth/me
 * Read the hub_session cookie and return employee info.
 */
import { isProfileAdmin } from '~/server/utils/roles'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler((event) => {
  const data = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!data) return { logged: false }
  return {
    logged:    true,
    id:        data.employeeId,
    email:     data.email,
    firstname: data.firstname,
    lastname:  data.lastname,
    role:      data.role,
    profileId: Number(data.profileId) || 0,
    isAdmin:   data.isAdmin ?? isProfileAdmin(data.profileId ?? 0),
    is_admin:  data.isAdmin ?? isProfileAdmin(data.profileId ?? 0),
    user_type: data.userType || 'employee',
    userType:  data.userType || 'employee',
    clientId:  data.clientId,
    // Academy student fields
    studentId: data.studentId || null,
    pseudo:    data.pseudo || null,
  }
})
