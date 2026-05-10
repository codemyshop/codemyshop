/**
 * Client-side registrations of the FAQ module.
 *
 * Auto-imported at Nuxt boot by core/plugins/00-module-loader.client.ts.
 * Top-level calls (provideSlot) execute once and register the
 * components in the slot registry.
 *
 * Phase 1.4 pilot — provideSlot for displayCmsAfterContent. Every page
 * that contains `<HookSlot name="displayCmsAfterContent" :context="page" />`
 * will automatically see FaqSection display if the FAQ module is active.
 */
import { useDisplaySlot } from '~/composables/useDisplaySlot'
import FaqSection from '~/components/FaqSection.vue'

const { provideSlot } = useDisplaySlot()

provideSlot('displayCmsAfterContent', {
  component: FaqSection,
  moduleId: 'faq',
  priority: 50,
})
