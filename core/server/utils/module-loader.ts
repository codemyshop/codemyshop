

import type { ModuleManifest, Tier, ModuleEdition } from '~/types/module-manifest'

import { AcAttachmentapiManifest as __m_community_attachment_api } from '~/modules/attachment-api/manifest'
import { AcAvailabilityManifest as __m_community_availability } from '~/modules/availability/manifest'
import { AcAvatarsManifest as __m_community_avatars } from '~/modules/avatars/manifest'
import { AcBaseManifest as __m_community_base } from '~/modules/base/manifest'
import { acCmsCategoryExtraManifest as __m_community_category_cms } from '~/modules/category-cms/manifest'
import { acCategoryExtraManifest as __m_community_category_extra } from '~/modules/category-extra/manifest'
import { AcCmsextraManifest as __m_community_cms_extra } from '~/modules/cms-extra/manifest'
import { acCustomerExtraManifest as __m_community_customer_extra } from '~/modules/customer-extra/manifest'
import { acEventsManifest as __m_community_events } from '~/modules/events/manifest'
import __m_community_faq from '~/modules/faq/manifest'
import { AcFooterManifest as __m_community_footer } from '~/modules/footer/manifest'
import { acFreightRuleManifest as __m_community_freight_rule } from '~/modules/freight-rule/manifest'
import { AcHeaderManifest as __m_community_header } from '~/modules/header/manifest'
import { AcHeadlesscontactManifest as __m_community_headlesscontact } from '~/modules/headlesscontact/manifest'
import { AcHomepageblockManifest as __m_community_homepage_block } from '~/modules/homepage-block/manifest'
import { AcHomepagesectionManifest as __m_community_homepage_section } from '~/modules/homepage-section/manifest'
import { acHookManifest as __m_community_hook } from '~/modules/hook/manifest'
import { AcInstagramManifest as __m_community_instagram } from '~/modules/instagram/manifest'
import { AcMarketplaceManifest as __m_community_marketplace } from '~/modules/marketplace/manifest'
import { acMegamenuManifest as __m_community_megamenu } from '~/modules/megamenu/manifest'
import { acModuleregistryManifest as __m_community_module_registry_runtime } from '~/modules/module-registry-runtime/manifest'
import { AcModuleslistManifest as __m_community_moduleslist } from '~/modules/moduleslist/manifest'
import { AcPaymentManifest as __m_community_payment } from '~/modules/payment/manifest'
import { AcPlaybookManifest as __m_community_playbook } from '~/modules/playbook/manifest'
import { AcPrefootersectionManifest as __m_community_prefooter_section } from '~/modules/prefooter-section/manifest'
import { AcProductextraManifest as __m_community_product_extra } from '~/modules/product-extra/manifest'
import { acProfileSectionManifest as __m_community_profile_section } from '~/modules/profile-section/manifest'
import { AcQuickorderManifest as __m_community_quickorder } from '~/modules/quickorder/manifest'
import { AcQuoterequestManifest as __m_community_quote_request } from '~/modules/quote-request/manifest'
import { acQuoteManifest as __m_community_quote } from '~/modules/quote/manifest'
import { acRedirectManifest as __m_community_redirect } from '~/modules/redirect/manifest'
import { AcRoutingManifest as __m_community_routing } from '~/modules/routing/manifest'
import { AcSavapiManifest as __m_community_sav_api } from '~/modules/sav-api/manifest'
import { acSubscriptionManifest as __m_community_subscription } from '~/modules/subscription/manifest'
import { acThemeManifest as __m_community_theme } from '~/modules/theme/manifest'
import { acToolsManifest as __m_community_tools } from '~/modules/tools/manifest'
import { AcWishlistextraManifest as __m_community_wishlist_extra } from '~/modules/wishlist-extra/manifest'

import { acAiQueueManifest as __m_enterprise_ai_ai_queue } from '~/enterprise/ai/ai-queue/manifest'
import { AcBranddnaManifest as __m_enterprise_ai_branddna } from '~/enterprise/ai/branddna/manifest'
import { AcCategorycovergenManifest as __m_enterprise_ai_category_covergen } from '~/enterprise/ai/category-covergen/manifest'
import { AcCategoryqueueManifest as __m_enterprise_ai_category_queue } from '~/enterprise/ai/category-queue/manifest'
import { AcCmsqueueManifest as __m_enterprise_ai_cms_queue } from '~/enterprise/ai/cms-queue/manifest'
import { AcContentqueueManifest as __m_enterprise_ai_content_queue } from '~/enterprise/ai/content-queue/manifest'
import { AcCovergenManifest as __m_enterprise_ai_covergen } from '~/enterprise/ai/covergen/manifest'
import { AcProductcovergenManifest as __m_enterprise_ai_product_covergen } from '~/enterprise/ai/product-covergen/manifest'
import { AcProductqueueManifest as __m_enterprise_ai_product_queue } from '~/enterprise/ai/product-queue/manifest'
import { AcBankManifest as __m_enterprise_banking_bank } from '~/enterprise/banking/bank/manifest'
import { AcUrssafManifest as __m_enterprise_banking_urssaf } from '~/enterprise/banking/urssaf/manifest'
import { AcAppointmentManifest as __m_enterprise_base_appointment } from '~/enterprise/base/appointment/manifest'
import { AcAutosocialpostManifest as __m_enterprise_base_autosocial_post } from '~/enterprise/base/autosocial-post/manifest'
import { acBlogCommentsManifest as __m_enterprise_base_blog_comments } from '~/enterprise/base/blog-comments/manifest'
import { AcBuilderManifest as __m_enterprise_base_builder } from '~/enterprise/base/builder/manifest'
import { acFounderReviewManifest as __m_enterprise_base_founder_review } from '~/enterprise/base/founder-review/manifest'
import { AcLeadqualManifest as __m_enterprise_base_leadqual } from '~/enterprise/base/leadqual/manifest'
import { AcMarketplaceManifest as __m_enterprise_base_marketplace } from '~/enterprise/base/marketplace/manifest'
import { acReferralsManifest as __m_enterprise_base_referral } from '~/enterprise/base/referral/manifest'
import { acReferralInviteManifest as __m_enterprise_base_referralinvite } from '~/enterprise/base/referralinvite/manifest'
import { AcSmartordersManifest as __m_enterprise_base_smart_orders } from '~/enterprise/base/smart-orders/manifest'
import { AcSmartleadManifest as __m_enterprise_base_smartlead } from '~/enterprise/base/smartlead/manifest'
import { AcSmartprojectManifest as __m_enterprise_base_smartproject } from '~/enterprise/base/smartproject/manifest'
import { AcWhatsappapiManifest as __m_enterprise_base_whatsapp_api } from '~/enterprise/base/whatsapp-api/manifest'
import { AcDepgraphManifest as __m_enterprise_data_depgraph } from '~/enterprise/data/depgraph/manifest'
import { acTelemetryManifest as __m_enterprise_data_telemetry } from '~/enterprise/data/telemetry/manifest'
import { AcVeilleManifest as __m_enterprise_data_veille } from '~/enterprise/data/veille/manifest'
import { AcAbTestingManifest as __m_enterprise_misc_ab_testing } from '~/enterprise/misc/ab-testing/manifest'
import { AcPricingManifest as __m_enterprise_misc_pricing } from '~/enterprise/misc/pricing/manifest'
import { acTranslateManifest as __m_enterprise_misc_translate } from '~/enterprise/misc/translate/manifest'
import { AcSeoconsoleManifest as __m_enterprise_seo_seo_console } from '~/enterprise/seo/seo-console/manifest'
import { AcCatchweightManifest as __m_enterprise_vertical_food_catchweight } from '~/enterprise/vertical-food/catchweight/manifest'
import { AcExpiryManifest as __m_enterprise_vertical_food_expiry } from '~/enterprise/vertical-food/expiry/manifest'
import { AcLotManifest as __m_enterprise_vertical_food_lot } from '~/enterprise/vertical-food/lot/manifest'
import { AcProductfoodManifest as __m_enterprise_vertical_food_product_food } from '~/enterprise/vertical-food/product-food/manifest'
import { AcRoutingManifest as __m_enterprise_vertical_food_routing } from '~/enterprise/vertical-food/routing/manifest'
import { AcShelfManifest as __m_enterprise_vertical_food_shelf } from '~/enterprise/vertical-food/shelf/manifest'

import { AcAcademyManifest as __m_internal_academy } from '~/internal/academy/manifest'
import { AcAetrackerManifest as __m_internal_aetracker } from '~/internal/aetracker/manifest'
import { AcAgentsManifest as __m_internal_agents } from '~/internal/agents/manifest'
import { AcAutoblogarticleManifest as __m_internal_autoblog_article } from '~/internal/autoblog-article/manifest'
import { AcAutomatesManifest as __m_internal_automates } from '~/internal/automates/manifest'
import { AcBacklogManifest as __m_internal_backlog } from '~/internal/backlog/manifest'
import { AcChantierManifest as __m_internal_chantier } from '~/internal/chantier/manifest'
import { AcCicatricesManifest as __m_internal_cicatrices } from '~/internal/incidents/manifest'
import { AcClientconfigManifest as __m_internal_clientconfig } from '~/internal/clientconfig/manifest'
import { AcConduiteManifest as __m_internal_conduite } from '~/internal/conduite/manifest'
import { AcCorbieManifest as __m_internal_corbie } from '~/internal/corbie/manifest'
import { AcDailymeetManifest as __m_internal_daily_meet } from '~/internal/daily-meet/manifest'
import { acDictionaryManifest as __m_internal_dictionary } from '~/internal/dictionary/manifest'
import { DrillManifest as __m_internal_drill } from '~/internal/training/manifest'
import { AcEmployeeextraManifest as __m_internal_employeeextra } from '~/internal/employeeextra/manifest'
import { AcExpertiseManifest as __m_internal_expertise } from '~/internal/expertise/manifest'
import { acFeedbackManifest as __m_internal_feedback } from '~/internal/feedback/manifest'
import { AcFleetManifest as __m_internal_fleet } from '~/internal/fleet/manifest'
import { AcHubManifest as __m_internal_hub } from '~/internal/hub/manifest'
import { AcIncidentsManifest as __m_internal_incidents } from '~/internal/incidents/manifest'
import { AcInvoiceManifest as __m_internal_invoicing } from '~/internal/invoicing/manifest'
import { AcReunionsManifest as __m_internal_reunions } from '~/internal/reunions/manifest'
import { AcToolsManifest as __m_internal_tools } from '~/internal/tools/manifest'

const communityManifests: ModuleManifest[] = [
  __m_community_attachment_api,
  __m_community_availability,
  __m_community_avatars,
  __m_community_base,
  __m_community_category_cms,
  __m_community_category_extra,
  __m_community_cms_extra,
  __m_community_customer_extra,
  __m_community_events,
  __m_community_faq,
  __m_community_footer,
  __m_community_freight_rule,
  __m_community_header,
  __m_community_headlesscontact,
  __m_community_homepage_block,
  __m_community_homepage_section,
  __m_community_hook,
  __m_community_instagram,
  __m_community_marketplace,
  __m_community_megamenu,
  __m_community_module_registry_runtime,
  __m_community_moduleslist,
  __m_community_payment,
  __m_community_playbook,
  __m_community_prefooter_section,
  __m_community_product_extra,
  __m_community_profile_section,
  __m_community_quickorder,
  __m_community_quote_request,
  __m_community_quote,
  __m_community_redirect,
  __m_community_routing,
  __m_community_sav_api,
  __m_community_subscription,
  __m_community_theme,
  __m_community_tools,
  __m_community_wishlist_extra,
]
const enterpriseManifests: ModuleManifest[] = [
  __m_enterprise_ai_ai_queue,
  __m_enterprise_ai_branddna,
  __m_enterprise_ai_category_covergen,
  __m_enterprise_ai_category_queue,
  __m_enterprise_ai_cms_queue,
  __m_enterprise_ai_content_queue,
  __m_enterprise_ai_covergen,
  __m_enterprise_ai_product_covergen,
  __m_enterprise_ai_product_queue,
  __m_enterprise_banking_bank,
  __m_enterprise_banking_urssaf,
  __m_enterprise_base_appointment,
  __m_enterprise_base_autosocial_post,
  __m_enterprise_base_blog_comments,
  __m_enterprise_base_builder,
  __m_enterprise_base_founder_review,
  __m_enterprise_base_leadqual,
  __m_enterprise_base_marketplace,
  __m_enterprise_base_referral,
  __m_enterprise_base_referralinvite,
  __m_enterprise_base_smart_orders,
  __m_enterprise_base_smartlead,
  __m_enterprise_base_smartproject,
  __m_enterprise_base_whatsapp_api,
  __m_enterprise_data_depgraph,
  __m_enterprise_data_telemetry,
  __m_enterprise_data_veille,
  __m_enterprise_misc_ab_testing,
  __m_enterprise_misc_pricing,
  __m_enterprise_misc_translate,
  __m_enterprise_seo_seo_console,
  __m_enterprise_vertical_food_catchweight,
  __m_enterprise_vertical_food_expiry,
  __m_enterprise_vertical_food_lot,
  __m_enterprise_vertical_food_product_food,
  __m_enterprise_vertical_food_routing,
  __m_enterprise_vertical_food_shelf,
]
const internalManifests: ModuleManifest[] = [
  __m_internal_academy,
  __m_internal_aetracker,
  __m_internal_agents,
  __m_internal_autoblog_article,
  __m_internal_automates,
  __m_internal_backlog,
  __m_internal_chantier,
  __m_internal_cicatrices,
  __m_internal_clientconfig,
  __m_internal_conduite,
  __m_internal_corbie,
  __m_internal_daily_meet,
  __m_internal_dictionary,
  __m_internal_drill,
  __m_internal_employeeextra,
  __m_internal_expertise,
  __m_internal_feedback,
  __m_internal_fleet,
  __m_internal_hub,
  __m_internal_incidents,
  __m_internal_invoicing,
  __m_internal_reunions,
  __m_internal_tools,
]

const ALL_MANIFESTS: ModuleManifest[] = [
  ...communityManifests,
  ...enterpriseManifests,
  ...internalManifests,
].filter((m): m is ModuleManifest => Boolean(m && m.id))

const TIER_ORDER: Record<Tier, number> = {
  community: 0,
  starter:   1,
  growth:    2,
  pro:       3,
  custom:    4,
}

export interface TenantContext {
  tenantId: string
  tier: Tier
  
  marketplaceAddons?: string[]
  
  isInternalTenant?: boolean
}

export function isModuleActive(m: ModuleManifest, ctx: TenantContext): boolean {
  if (m.edition === 'community') return true
  if (m.edition === 'internal')  return Boolean(ctx.isInternalTenant)
  if (m.edition === 'custom')    return ctx.tier === 'custom' || (ctx.marketplaceAddons?.includes(m.id) ?? false)
  
  const includedTiers = m.pricing?.included_in_tiers ?? []
  if (includedTiers.includes(ctx.tier)) return true
  if (ctx.marketplaceAddons?.includes(m.id)) return true
  return false
}

export function loadModulesForTenant(ctx: TenantContext): ModuleManifest[] {
  const active = ALL_MANIFESTS.filter((m) => isModuleActive(m, ctx))
  const activeIds = new Set(active.map((m) => m.id))

  
  const resolved = active.filter((m) => {
    if (!m.requires || m.requires.length === 0) return true
    const missing = m.requires.filter((req) => !activeIds.has(req))
    if (missing.length > 0) {
      console.warn(`[module-loader] '${m.id}' requires missing modules: ${missing.join(', ')} — skipped`)
      return false
    }
    return true
  })

  return resolved
}

export function listAllManifests(): ModuleManifest[] {
  return ALL_MANIFESTS.slice()
}

export function manifestsByEdition(): Record<ModuleEdition, ModuleManifest[]> {
  const out: Record<ModuleEdition, ModuleManifest[]> = {
    community: [], enterprise: [], custom: [], internal: [],
  }
  for (const m of ALL_MANIFESTS) out[m.edition].push(m)
  return out
}
