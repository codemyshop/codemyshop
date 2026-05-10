/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * PUT /api/bo/smartproject/projects/:id
 * Remplace ac_smartproject/ajaxupdateproject (chantier #38 Phase B1.5).
 *
 * Body :
 *  - { project: { project_status?, project_type?, budget?, final_price?, needs?, ... },
 *      contact: { firstname?, lastname?, email?, phone_whatsapp? } }
 *  - OU shortcut historique flat (compat saveInfo legacy) :
 *      { project_status?, project_type?, budget?, final_price?, needs? }
 *  - OU kanban shortcut : { new_status: '...' }
 *
 * Bugfix vs PHP: strict partial update — only explicitly
 * present fields in the body are written. PHP wrapped Tools::getValue() which
 * returned '' for absent fields and silently overwrote
 * project_title, contact_status, source, etc. The new saveInfo() Nuxt
 * only sends 5 fields, so PHP wiped all other columns.
 */
import {
  updateProjectDetail,
  type UpdateProjectDetailInput,
} from '~/enterprise/base/smartproject/server/utils/smartproject'

const PROJECT_KEYS = new Set([
  'project_title',
  'project_status',
  'project_type',
  'project_intention',
  'budget',
  'final_price',
  'needs',
  'meeting_date',
  'reference_client',
  'avatar_type',
  'is_archived',
])

const CONTACT_KEYS = new Set(['firstname', 'lastname', 'email', 'phone_whatsapp'])

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idProject = Number(idStr)
  if (!idProject || idProject <= 0) {
    throw createError({ statusCode: 400, message: 'ID du projet invalide' })
  }
  const body = await readBody<any>(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Body manquant ou invalide' })
  }

  const input: UpdateProjectDetailInput = {}
  if (typeof body.new_status === 'string') {
    input.new_status = body.new_status
  } else if (body.project || body.contact) {
    if (body.project && typeof body.project === 'object') input.project = body.project
    if (body.contact && typeof body.contact === 'object') input.contact = body.contact
  } else {
    // Shortcut flat : split entre project + contact selon les clés connues
    const flatProject: Record<string, any> = {}
    const flatContact: Record<string, any> = {}
    for (const [k, v] of Object.entries(body)) {
      if (k === 'id_ac_smartproject' || k === 'id_project') continue
      if (PROJECT_KEYS.has(k)) flatProject[k] = v
      else if (CONTACT_KEYS.has(k)) flatContact[k] = v
    }
    if (Object.keys(flatProject).length) input.project = flatProject
    if (Object.keys(flatContact).length) input.contact = flatContact
  }

  const result = await updateProjectDetail(idProject, input, { event })
  if (!result.ok) {
    throw createError({ statusCode: 404, message: result.error || 'Projet introuvable' })
  }
  return {
    success: true,
    updated_project_fields: result.updated_project_fields,
    updated_contact_fields: result.updated_contact_fields,
  }
})
