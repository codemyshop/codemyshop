

import { loadEmailConfig } from '~/server/utils/email-config'

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
