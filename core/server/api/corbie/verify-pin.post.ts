/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getCorbieAccountByPin } from '~/internal/corbie/server/utils/corbie'

/**
 * POST /api/corbie/verify-pin
 * Multi-account: each PIN corresponds to a different profile.
 * Source of truth: cs_corbie_accounts (DB)
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin: string }>(event)

  if (!body.pin || body.pin.length < 4) {
    throw createError({ statusCode: 401, message: 'PIN incorrect' })
  }

  const account = await getCorbieAccountByPin(body.pin)
  if (!account) {
    throw createError({ statusCode: 401, message: 'PIN incorrect' })
  }

  setCookie(event, 'corbie-session', account.profileId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return { success: true, name: account.name, profileId: account.profileId }
})
