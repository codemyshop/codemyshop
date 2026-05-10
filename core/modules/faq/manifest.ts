/**
 * FAQ module manifest — Phase 1 hooks system driver
 * (chantier codemyshop-oss).
 *
 * FAQ is a community module: included in all tiers (community
 * free, starter, growth, pro, custom). No add-ons. Underlying tables
 * (cs_faq + cs_faq_lang) managed via Drizzle schema-pg.
 *
 * Hooks :
 * - exposes: 'displayCmsAfterContent' — slot where FaqSection can be
 * injected by default below CMS page content
 * - consumes: 'actionFaqViewed' — event emitted when a visitor
 * expands a question (to use for analytics, scoring,
 * lead capture on the enterprise side)
 */
import { defineModule } from '~/types/module-manifest'

export default defineModule({
  id: 'faq',
  edition: 'community',
  hooks: {
    exposes: ['displayCmsAfterContent'],
    consumes: ['actionFaqViewed'],
  },
  pricing: {
    included_in_tiers: ['community', 'starter', 'growth', 'pro', 'custom'],
  },
})
