

import { bookSlot, getAppointmentById } from '~/enterprise/base/appointment/server/utils/appointment'
import { sendAppointmentConfirmation } from '~/enterprise/base/appointment/server/utils/appointment-email'
import { verifySiret } from '~/server/utils/siret-verify'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const idAvailability = Number(body?.idAvailability ?? 0)
  const prospectName = String(body?.prospectName ?? '').trim().slice(0, 200)
  const prospectEmail = String(body?.prospectEmail ?? '').trim().slice(0, 200)
  const prospectPhone = String(body?.prospectPhone ?? '').trim().slice(0, 50) || null
  const prospectMessage = String(body?.prospectMessage ?? '').trim().slice(0, 2000) || null
  const prospectSiretRaw = String(body?.prospectSiret ?? '').replace(/\D/g, '')
  const idAcSmartlead = body?.idAcSmartlead != null ? Number(body.idAcSmartlead) : null

  if (!idAvailability || idAvailability < 1) {
    throw createError({ statusCode: 422, statusMessage: 'Créneau invalide', data: { code: 'INVALID_SLOT' } })
  }
  if (!prospectName || !prospectEmail) {
    throw createError({ statusCode: 422, statusMessage: 'Champs requis manquants : nom, email', data: { code: 'MISSING_REQUIRED_FIELDS' } })
  }
  if (!EMAIL_RE.test(prospectEmail)) {
    throw createError({ statusCode: 422, statusMessage: 'Email invalide', data: { code: 'INVALID_EMAIL' } })
  }
  
  
  const appointmentMode = String((useRuntimeConfig().public as any)?.appointmentMode ?? 'both')
  if (appointmentMode === 'phone' && !prospectPhone) {
    throw createError({ statusCode: 422, statusMessage: 'Numéro de téléphone requis pour ce rendez-vous', data: { code: 'PHONE_REQUIRED' } })
  }

  
  
  const cfg = useRuntimeConfig()
  const b2bMode = !!(cfg.public as any)?.b2bMode
  let prospectSiret: string | null = null
  let prospectCompany: string | null = null
  let prospectCompanyCity: string | null = null
  let prospectLegalForm: string | null = null
  if (b2bMode) {
    if (!prospectSiretRaw) {
      throw createError({ statusCode: 422, statusMessage: 'SIRET requis pour ce rendez-vous B2B', data: { code: 'B2B_SIRET_REQUIRED' } })
    }
    if (prospectSiretRaw.length !== 14) {
      throw createError({ statusCode: 422, statusMessage: 'Le SIRET doit contenir 14 chiffres', data: { code: 'INVALID_SIRET' } })
    }
    const r = await verifySiret(prospectSiretRaw)
    if (!r.valid) {
      throw createError({ statusCode: 422, statusMessage: r.error || 'SIRET invalide', data: { code: 'SIRET_NOT_FOUND' } })
    }
    prospectSiret = r.siret ?? prospectSiretRaw
    prospectCompany = r.companyName ?? null
    prospectCompanyCity = r.city ?? null
    prospectLegalForm = r.legalForm ?? null
  }

  const ip = (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || ''
  ).slice(0, 45) || null
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 500) || null

  const result = await bookSlot(
    {
      idAvailability,
      prospectName,
      prospectEmail,
      prospectPhone,
      prospectMessage,
      prospectSiret,
      prospectCompany,
      prospectCompanyCity,
      prospectLegalForm,
      idAcSmartlead,
      ipAddress: ip,
      userAgent,
    },
    { event },
  )

  
  try {
    const apt = await getAppointmentById(result.idAppointment, { event })
    if (apt) await sendAppointmentConfirmation(apt)
  }
  catch (mailErr: unknown) {
    const msg = mailErr instanceof Error ? mailErr.message : 'unknown'
    console.error('[appointment/book] email confirm failed:', msg)
  }

  return { success: true, ...result }
})
