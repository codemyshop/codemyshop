/**
 *
 * POST /api/team/create
 * Creates an employee (ps_employee) directly in DB (doctrine "Zero webservice
 * PrestaShop » 2026-04-22). Refacto depuis connector.createEmployee.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'
import { getPsProfileId } from '~/server/utils/roles'
import { createHash, randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    firstname: string; lastname: string; email: string
    role: string; password?: string; clientId?: string
  }>(event)

  const firstname = (body.firstname ?? '').trim().slice(0, 100)
  const lastname  = (body.lastname ?? '').trim().slice(0, 100)
  const email     = (body.email ?? '').trim().toLowerCase().slice(0, 255)

  if (!firstname || !lastname || !email) {
    throw createError({ statusCode: 400, message: 'firstname, lastname et email requis' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Email invalide' })
  }

  const db = body.clientId ? useClientDbById(String(body.clientId)) : useClientDb(event)

  // Unicité email employé
  const existing = await db.get<{ id_employee: number }>(
    `SELECT id_employee FROM ps_employee WHERE email = ? LIMIT 1`,
    [email],
  )
  if (existing) {
    return {
      ok: false,
      psEmployeeId: null,
      psError: `Un employé existe déjà avec cet email (id=${existing.id_employee})`,
      message: 'Membre non créé — email déjà utilisé côté PS.',
    }
  }

  const profileId = getPsProfileId(body.role ?? 'other')
  const plainPassword = body.password?.trim() || randomBytes(12).toString('base64url').slice(0, 16)
  const generatedPassword = body.password ? undefined : plainPassword

  // Hash bcrypt $2y$10$ (format PS 8+ natif)
  const bcrypt = await import('bcryptjs')
  const hashed = (await bcrypt.hash(plainPassword, 10)).replace(/^\$2a\$/, '$2y$')

  try {
    const { insertId } = await db.run(
      `INSERT INTO ps_employee
          (id_profile, id_lang, lastname, firstname, email, passwd, last_passwd_gen,
           default_tab, active, optin, bo_theme, bo_css, bo_menu, bo_show_screencast,
           stats_date_from, stats_date_to, stats_compare_date_from, stats_compare_date_to,
           stats_compare_option)
       VALUES (?, 1, ?, ?, ?, ?, NOW(), 1, 1, 0, 'default', 'theme.css', 1, 0,
               '0000-00-00', '0000-00-00', '0000-00-00', '0000-00-00', 1)`,
      [profileId, lastname, firstname, email, hashed],
    )
    // Secure key cookie PS (md5 random, sert pour le reset password PS natif)
    const secureKey = createHash('md5').update(randomBytes(16)).digest('hex').toUpperCase()
    await db.run(
      `UPDATE ps_employee SET reset_password_validity = '0000-00-00 00:00:00' WHERE id_employee = ?`,
      [Number(insertId)],
    ).catch(() => { /* col absente sur certains schémas PS */ })

    return {
      ok: true,
      psEmployeeId: Number(insertId),
      generatedPassword,
      message: `Employé #${insertId} créé dans PrestaShop (profil ${profileId})`,
    }
  } catch (err: any) {
    return {
      ok: false,
      psEmployeeId: null,
      psError: err?.message || 'Erreur DB',
      message: 'Membre non créé côté PS — erreur DB',
    }
  }
})
