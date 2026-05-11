

import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'
import {
  profileSectionTableAvailable,
  replaceProfileSections,
} from '~/modules/profile-section/server/utils/profile-section'

const ALLOWED_SECTIONS = new Set([
  'dashboard',
  'orders',
  'crm',
  'crm_sav',
  'catalogue',
  'intelligence',
  'automatisations',
  'logistique',
  'prm',
  'fin',
  'growth',
  'playbooks',
  'playbooks_edit',
  'admin',
  'system',
  'founder_admin',
])

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  if (!isSaas && !session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  const rawId = getRouterParam(event, 'id')
  const profileId = Number(rawId)
  if (!profileId || profileId < 1) {
    throw createError({ statusCode: 400, message: 'id_profile invalide' })
  }

  if (profileId === 1 && !isSaas) {
    throw createError({ statusCode: 403, message: 'Profil SuperAdmin verrouillé' })
  }

  const body = await readBody<{ sections?: string[] }>(event)
  const sections = Array.isArray(body.sections) ? body.sections : []

  const valid = [...new Set(
    sections.map(s => String(s).trim()).filter(s => ALLOWED_SECTIONS.has(s)),
  )]

  if (profileId === 1 && !valid.includes('dashboard')) {
    valid.push('dashboard')
  }

  const tableOk = await profileSectionTableAvailable({ event })
  if (!tableOk) {
    throw createError({
      statusCode: 503,
      message: 'Table cs_profile_section absente — module ac_profilesection non installé.',
    })
  }

  await replaceProfileSections(profileId, valid, { event })

  return { success: true, profileId, sections: valid }
})
