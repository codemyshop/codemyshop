/**
 * FAQ module server-side registrations.
 *
 * Auto-imported on Nitro boot via core/server/plugins/00-module-loader.ts.
 * Top-level calls (onAction/onFilter) execute once and register
 * handlers on the hooks-bus.
 *
 * Phase 1.4 driver — a demo onAction to validate end-to-end.
 */
import { onAction } from '~/server/utils/hooks-bus'

// Hook démo : log un événement quand une FAQ est consultée. Sert de pilote
// de validation. Les modules enterprise (ex `lead-capa`) pourront s'abonner
// à ce même hook pour scorer les leads selon les FAQ consultées.
onAction('actionFaqViewed', async (ctx: { faqId: number; question?: string }) => {
  console.log(`[faq] actionFaqViewed faqId=${ctx.faqId}${ctx.question ? ` "${ctx.question}"` : ''}`)
})
