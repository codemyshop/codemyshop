/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { loadEmailConfig } from '~/server/utils/email-config'

/**
 * GET /api/bo/email-config/smtp — read the SMTP/Resend config.
 *
 * Source: cs_email_config (singleton) if present, otherwise fallback
 * process.env (SMTP_HOST/PORT/USER/FROM, EMAIL_FROM, RESEND_DEFAULT_FROM).
 * The `source` field indicates where the displayed values come from (UI
 * distinction « DB » vs « .env »).
 *
 * No password reading — never exposed client-side. The password
 * SMTP remains managed via .env (SMTP_PASS / IMAP_PASSWORD).
 */
export default defineEventHandler(async () => {
  const cfg = await loadEmailConfig()
  return {
    config: {
      host:       cfg.smtp_host,
      port:       cfg.smtp_port,
      user:       cfg.smtp_user,
      from:       cfg.smtp_from,
      secure:     cfg.smtp_secure,
      from_email: cfg.from_email,
      reply_to:   cfg.reply_to,
    },
    source: cfg.source,
  }
})
