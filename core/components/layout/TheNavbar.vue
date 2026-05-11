<template>
  <header class="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">

    
    <nav
      class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6"
      :aria-label="`${t('common.main_navigation')} ${config?.clientId}`"
    >

      
      <component
        :is="config?.logo.href ? NuxtLink : 'span'"
        :to="config?.logo.href"
        class="flex items-center gap-2 shrink-0 group"
        :aria-label="t('common.back_home')"
      >
        <NuxtImg
          v-if="config?.logo.src"
          :src="config.logo.src"
          :alt="config.logo.alt ?? config.logo.text ?? 'Logo'"
          class="h-8 w-auto object-contain"
          width="128"
          height="32"
          preset="logo"
          sizes="128px sm:160px"
          loading="eager"
          fetchpriority="high"
        />
        <span
          v-else
          class="text-lg font-extrabold text-gray-900 group-hover:text-primary-600 transition-colors tracking-tight"
        >
          {{ config?.logo.text }}
        </span>
      </component>

      
      <ul class="hidden lg:flex items-center gap-1 flex-1">
        <li
          v-for="item in config?.items"
          :key="item.label"
          class="relative group"
        >

          
          <template v-if="!item.megaMenu">
            <component
              :is="item.external ? 'a' : NuxtLink"
              :to="!item.external ? item.href : undefined"
              :href="item.external ? item.href : undefined"
              :target="item.external ? '_blank' : undefined"
              :rel="item.external ? 'noopener noreferrer' : undefined"
              :class="[
                'inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                item.highlight
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                  : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50',
              ]"
            >
              {{ item.label }}
            </component>
          </template>

          
          
          <template v-else-if="item.megaMenu && !item.isMegaMenu">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors select-none"
              aria-haspopup="true"
            >
              {{ item.label }}
              <svg
                class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            
            <div
              class="
                absolute top-full left-0 pt-2 z-50 min-w-[180px]
                invisible opacity-0 translate-y-1
                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
                transition-all duration-200 ease-out
              "
              role="menu"
            >
              <div class="bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                <template v-for="col in item.megaMenu" :key="col.title ?? col.links[0]?.href">
                  
                  <div
                    v-if="col.title"
                    class="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest"
                  >
                    {{ col.title }}
                  </div>
                  <component
                    v-for="sub in col.links"
                    :key="sub.href"
                    :is="NuxtLink"
                    :to="sub.href"
                    role="menuitem"
                    class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                  >
                    {{ sub.label }}
                  </component>
                </template>
              </div>
            </div>
          </template>

          
          
          <template v-else-if="item.megaMenu && item.isMegaMenu">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors select-none"
              aria-haspopup="true"
            >
              {{ item.label }}
              <svg
                class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            
            <div
              class="
                absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50
                invisible opacity-0 translate-y-1
                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
                transition-all duration-200 ease-out
              "
              role="menu"
            >
              
              <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-l border-t border-gray-100 shadow-sm" />

              <div
                class="relative bg-white border border-gray-100 rounded-2xl shadow-xl p-5 min-w-max grid gap-5"
                :style="`grid-template-columns: repeat(${item.megaMenu.length}, minmax(180px, 240px))`"
              >
                <div
                  v-for="(col, ci) in item.megaMenu"
                  :key="ci"
                  class="space-y-1"
                >
                  
                  <div
                    v-if="col.title"
                    class="flex items-center gap-1.5 px-3 pb-1 mb-1 border-b border-gray-100"
                  >
                    <img v-if="col.icon && String(col.icon).startsWith('/')" :src="col.icon" :alt="''" class="w-6 h-6 object-contain" loading="lazy" data-no-filter />
                    <span v-else-if="col.icon" class="text-base leading-none" aria-hidden="true">{{ col.icon }}</span>
                    <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">{{ col.title }}</span>
                  </div>

                  
                  <component
                    v-for="sub in col.links"
                    :key="sub.href"
                    :is="NuxtLink"
                    :to="sub.href"
                    role="menuitem"
                    class="flex flex-col px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors group/sub"
                  >
                    <span class="flex items-center gap-1.5 text-sm font-medium text-gray-800 group-hover/sub:text-primary-600 transition-colors">
                      {{ sub.label }}
                      <span v-if="sub.badge" class="ml-auto text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">
                        {{ sub.badge }}
                      </span>
                    </span>
                    <span v-if="sub.description" class="text-xs text-gray-500 mt-0.5 leading-snug">
                      {{ sub.description }}
                    </span>
                  </component>
                </div>
              </div>
            </div>
          </template>

        </li>
      </ul>

      
      <div class="hidden lg:flex items-center gap-2 shrink-0">
        <slot name="actions">
          <EmployeeMenu />
          <UserMenu />
        </slot>
      </div>

      
      <button
        class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        :aria-expanded="mobileOpen"
        aria-controls="mobile-menu"
        :aria-label="t('common.open_menu')"
        @click="mobileOpen = !mobileOpen"
      >
        <svg v-if="!mobileOpen" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

    </nav>

    
    <div v-if="previewMode" class="bg-warning-400 text-warning-900 text-xs font-semibold text-center py-1 px-4">
      <span v-html="t('common.preview_mode_label', { client: `<strong>${previewClient}</strong>` })" />
      · <a :href="currentPathWithoutPreview" class="underline hover:no-underline">{{ t('common.preview_exit_link') }}</a>
    </div>

    
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        id="mobile-menu"
        class="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg"
      >
        <template v-for="item in config?.items" :key="item.label">

          
          <template v-if="!item.megaMenu">
            <component
              :is="item.external ? 'a' : NuxtLink"
              :to="!item.external ? item.href : undefined"
              :href="item.external ? item.href : undefined"
              :target="item.external ? '_blank' : undefined"
              :class="[
                'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                item.highlight
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
              ]"
              @click="mobileOpen = false"
            >
              {{ item.label }}
            </component>
          </template>

          
          <template v-else>
            <div>
              <button
                type="button"
                class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                @click="toggleMobileAccordion(item.label)"
              >
                {{ item.label }}
                <svg
                  class="w-4 h-4 text-gray-400 transition-transform duration-200"
                  :class="mobileAccordion === item.label ? 'rotate-180' : ''"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <Transition
                enter-active-class="transition-all duration-200 ease-out overflow-hidden"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-screen"
                leave-active-class="transition-all duration-150 ease-in overflow-hidden"
                leave-from-class="opacity-100 max-h-screen"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="mobileAccordion === item.label" class="ml-3 mt-1 space-y-0.5 border-l-2 border-primary-100 pl-3">
                  <template v-for="col in item.megaMenu" :key="col.title ?? col.links[0]?.href">
                    
                    <p
                      v-if="col.title && item.isMegaMenu"
                      class="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 pt-2 pb-1"
                    >
                      <img v-if="col.icon && String(col.icon).startsWith('/')" :src="col.icon" :alt="''" class="w-6 h-6 object-contain" loading="lazy" data-no-filter />
                      <span v-else-if="col.icon">{{ col.icon }}</span>
                      <span>{{ col.title }}</span>
                    </p>
                    <component
                      v-for="sub in col.links"
                      :key="sub.href"
                      :is="NuxtLink"
                      :to="sub.href"
                      class="flex flex-col px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      @click="mobileOpen = false"
                    >
                      <span class="font-medium">{{ sub.label }}</span>
                      
                      <span v-if="sub.description && item.isMegaMenu" class="text-xs text-gray-400 mt-0.5">
                        {{ sub.description }}
                      </span>
                    </component>
                  </template>
                </div>
              </Transition>
            </div>
          </template>

        </template>

        
        <div class="pt-3 mt-3 border-t border-gray-100 flex items-center gap-3">
          <slot name="actions-mobile">
            <EmployeeMenu />
            <UserMenu />
          </slot>
        </div>
      </div>
    </Transition>

  </header>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type { MenuConfig } from '~/types/menu'

const route = useRoute()
const { t } = useT()
const { resolvedClientId, previewClient, previewMode, config: clientConfig, currentPathWithoutPreview } = useClientDetection()
const config = computed<MenuConfig | null>(() => (clientConfig.value as unknown as MenuConfig) ?? null)

const mobileOpen      = ref(false)
const mobileAccordion = ref<string | null>(null)

const toggleMobileAccordion = (label: string) => {
  mobileAccordion.value = mobileAccordion.value === label ? null : label
}

watch(() => route.path, () => {
  mobileOpen.value = false
  mobileAccordion.value = null
})
</script>
