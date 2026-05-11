<template>
  <header
    class="z-40 transition-[background-color,backdrop-filter,box-shadow] duration-300"
    :class="[
      isEditMode ? 'edit-section' : '',
      isHeaderDark ? 'header-inverse' : '',
      stickyMode
        ? scrolled
          ? 'fixed top-0 left-0 right-0 backdrop-blur-lg shadow-sm'
          : 'absolute top-0 left-0 right-0'
        : 'relative',
    ]"
    :style="stickyMode
      ? scrolled
        ? 'background-color: var(--color-header-bg, #ffffff)'
        : 'background-color: transparent'
      : 'background-color: var(--color-header-bg, #ffffff); color: var(--color-header-text, inherit)'"
    @click.self="isEditMode && openGlobalPanel('header')"
  >
    
    <div v-if="isEditMode" class="edit-section-label">🏷️ Header</div>

    
    <div
      v-if="effectiveConfig?.topBar?.message || effectiveConfig?.topBar?.showLanguages"
      class="text-xs"
      style="background-color: var(--color-topbar-bg); color: var(--color-topbar-text);"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-8 flex items-center gap-4">
        
        <div
          class="flex-1 flex items-center min-w-0"
          :class="topBarAlign === 'center' ? 'justify-center' : 'justify-start'"
        >
          <span v-if="effectiveConfig?.topBar?.message" class="truncate">
            {{ i18nt(effectiveConfig.topBar.message) }}
          </span>
        </div>

        
        <div v-if="effectiveConfig?.topBar?.showLanguages && effectiveConfig.topBar.languages?.length" class="flex items-center gap-3 shrink-0">
          <a
            v-for="lang in effectiveConfig.topBar.languages"
            :key="lang.code"
            :href="lang.href"
            class="hover:text-gray-300 transition-colors uppercase font-medium tracking-wide"
          >
            {{ lang.code }}
          </a>
        </div>
      </div>
    </div>

    
    <div class="border-b border-transparent">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-2 min-h-16 flex items-center justify-between gap-4">

        
        <component
          :is="effectiveConfig?.logo?.href ? NuxtLink : 'span'"
          :to="localePath(effectiveConfig?.logo?.href)"
          class="flex items-center gap-2 shrink-0 group"
          :aria-label="t('common.back_home')"
        >
          <AppLogo v-if="!effectiveConfig?.logo?.src" :size="40" />
          <NuxtImg
            v-else
            :src="effectiveConfig!.logo.src"
            :alt="i18nt(effectiveConfig!.logo.alt) || i18nt(effectiveConfig!.logo.text) || 'Logo'"
            :class="effectiveConfig?.logo?.class || 'h-10 sm:h-12 lg:h-14 w-auto max-w-[160px] sm:max-w-[200px] object-contain'"
            width="200"
            height="56"
            preset="logo"
            sizes="160px sm:200px lg:240px"
            loading="eager"
            fetchpriority="high"
            data-no-filter
          />
          <span
            v-if="effectiveConfig?.logo?.text"
            class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors tracking-tight"
          >
            {{ i18nt(effectiveConfig?.logo?.text) }}
          </span>
        </component>

        
        <nav
          v-if="isInlineLayout"
          class="hidden lg:flex flex-1 items-center justify-center relative"
          :aria-label="t('common.main_navigation')"
        >
          <ul class="flex items-center gap-1">
            <li
              v-for="item in navItems"
              :key="i18nt(item.label)"
              :class="[
                'group h-full flex items-center',
                item.isMegaMenu ? 'static' : 'relative',
                item.align === 'right' ? 'ml-auto' : '',
              ]"
            >
              
              <template v-if="!item.megaMenu && !item.children">
                <component
                  :is="isExternal(item) ? 'a' : NuxtLink"
                  :to="!isExternal(item) ? localePath(item.href) : undefined"
                  :href="isExternal(item) ? item.href : undefined"
                  :target="isExternal(item) ? '_blank' : undefined"
                  :rel="isExternal(item) ? 'noopener noreferrer' : undefined"
                  :class="[
                    'relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    item.highlight
                      ? 'border border-accent-500 text-accent-700 hover:bg-accent-500 hover:text-white dark:border-accent-400 dark:text-accent-300 dark:hover:bg-accent-500 dark:hover:text-white'
                      : 'text-gray-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-white/[0.05]',
                  ]"
                  :style="item.style || undefined"
                >
                  <span
                    v-if="item.badge"
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 px-1.5 leading-none py-[3px] rounded-md text-[9px] font-semibold whitespace-nowrap pointer-events-none shadow-sm border border-black/5"
                    :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
                  >{{ i18nt(item.badge) }}</span>
                  {{ i18nt(item.label) }}
                </component>
              </template>
              
              <template v-else-if="item.children">
                <button
                  type="button"
                  :class="[
                    'relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors select-none h-full',
                    item.style ? '' : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50',
                  ]"
                  :style="item.style || undefined"
                  aria-haspopup="true"
                >
                  <span
                    v-if="item.badge"
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 px-1.5 leading-none py-[3px] rounded-md text-[9px] font-semibold whitespace-nowrap pointer-events-none shadow-sm border border-black/5"
                    :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
                  >{{ i18nt(item.badge) }}</span>
                  {{ i18nt(item.label) }}
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="absolute top-full left-0 pt-2 z-50 min-w-[180px] invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out" role="menu">
                  <div class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg py-1 overflow-hidden">
                    <template v-for="sub in item.children" :key="sub.href">
                      <component
                        :is="NuxtLink" :to="localePath(sub.href)" role="menuitem"
                        class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary-600 transition-colors"
                      >{{ i18nt(sub.label) }}</component>
                      <template v-if="sub.psChildren?.length">
                        <component
                          v-for="pc in sub.psChildren" :key="pc.href"
                          :is="NuxtLink" :to="localePath(pc.href)" role="menuitem"
                          class="flex items-center pl-6 pr-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary-600 transition-colors"
                        >{{ i18nt(pc.label) }}</component>
                      </template>
                    </template>
                  </div>
                </div>
              </template>
              
              <template v-else-if="item.megaMenu && !item.isMegaMenu">
                <button
                  type="button"
                  :class="[
                    'relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors select-none h-full',
                    item.style ? '' : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50',
                  ]"
                  :style="item.style || undefined"
                  aria-haspopup="true"
                >
                  <span
                    v-if="item.badge"
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 px-1.5 leading-none py-[3px] rounded-md text-[9px] font-semibold whitespace-nowrap pointer-events-none shadow-sm border border-black/5"
                    :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
                  >{{ i18nt(item.badge) }}</span>
                  {{ i18nt(item.label) }}
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="absolute top-full left-0 pt-2 z-50 min-w-[180px] invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out" role="menu">
                  <div class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg py-1 overflow-hidden">
                    <template v-for="col in item.megaMenu" :key="i18nt(col.title) || col.links[0]?.href">
                      <div v-if="col.title" class="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">{{ i18nt(col.title) }}</div>
                      <template v-for="sub in col.links" :key="sub.href">
                        <component
                          :is="NuxtLink" :to="localePath(sub.href)" role="menuitem"
                          class="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary-600 transition-colors"
                        >
                          {{ i18nt(sub.label) }}
                        </component>
                        <template v-if="sub.psChildren?.length">
                          <component
                            v-for="pc in sub.psChildren" :key="pc.href"
                            :is="NuxtLink" :to="localePath(pc.href)" role="menuitem"
                            class="flex items-center pl-6 pr-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary-600 transition-colors"
                          >{{ i18nt(pc.label) }}</component>
                        </template>
                      </template>
                    </template>
                  </div>
                </div>
              </template>
              
              <template v-else-if="item.megaMenu && item.isMegaMenu">
                <button
                  type="button"
                  :class="[
                    'relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors select-none h-full',
                    item.style ? '' : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50',
                  ]"
                  :style="item.style || undefined"
                  aria-haspopup="true"
                >
                  <span
                    v-if="item.badge"
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 px-1.5 leading-none py-[3px] rounded-md text-[9px] font-semibold whitespace-nowrap pointer-events-none shadow-sm border border-black/5"
                    :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
                  >{{ i18nt(item.badge) }}</span>
                  {{ i18nt(item.label) }}
                  <svg class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="absolute top-full left-0 right-0 pt-2 z-50 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out flex justify-center" role="menu">
                  <div
                    class="relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl p-5 grid gap-5 mx-auto w-full"
                    :class="contentWidthClass"
                    :style="`grid-template-columns: repeat(${item.megaMenu.length}, minmax(0, 1fr));`"
                  >
                    <div v-for="(col, ci) in item.megaMenu" :key="ci" class="space-y-1">
                      
                      <template v-if="col.icon && String(col.icon).startsWith('/') && col.links?.length === 1">
                        <NuxtLink :to="localePath(col.links[0].href)" class="block group/img relative overflow-hidden rounded-xl">
                          <img :src="col.icon" :alt="i18nt(col.links[0].label)" class="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover/img:scale-105" loading="lazy" data-no-filter />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div class="absolute inset-x-0 bottom-0 p-3 text-white">
                            <div v-if="col.title" class="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">{{ i18nt(col.title) }}</div>
                            <div class="text-sm font-semibold">{{ i18nt(col.links[0].label) }}</div>
                            <div v-if="col.links[0].badge" class="text-xs opacity-90 mt-0.5">{{ i18nt(col.links[0].badge) }}</div>
                          </div>
                        </NuxtLink>
                      </template>
                      
                      <template v-else>
                        <div v-if="col.title" class="flex items-center gap-1.5 px-3 pb-1 mb-1 border-b border-gray-100">
                          <img v-if="col.icon && String(col.icon).startsWith('/')" :src="col.icon" :alt="''" class="w-6 h-6 object-contain" loading="lazy" data-no-filter />
                          <span v-else-if="col.icon" class="text-base leading-none" aria-hidden="true">{{ col.icon }}</span>
                          <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">{{ i18nt(col.title) }}</span>
                        </div>
                        <template v-for="sub in col.links" :key="sub.href">
                          <component
                            :is="NuxtLink" :to="localePath(sub.href)" role="menuitem"
                            class="flex flex-col px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors group/sub"
                          >
                            <span class="flex items-center gap-1.5 text-sm font-medium text-gray-800 group-hover/sub:text-primary-600 transition-colors">
                              {{ i18nt(sub.label) }}
                              <span v-if="sub.badge" class="ml-auto text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">{{ i18nt(sub.badge) }}</span>
                            </span>
                            <span v-if="sub.description" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ i18nt(sub.description) }}</span>
                          </component>
                          <template v-if="sub.psChildren?.length">
                            <component
                              v-for="pc in sub.psChildren" :key="pc.href"
                              :is="NuxtLink" :to="localePath(pc.href)" role="menuitem"
                              class="flex items-center pl-6 pr-3 py-1 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            >{{ i18nt(pc.label) }}</component>
                          </template>
                        </template>
                      </template>
                    </div>
                  </div>
                </div>
              </template>
            </li>
          </ul>
        </nav>

        
        <div
          v-else-if="effectiveConfig?.features?.showSearch"
          class="flex-1 hidden sm:flex items-center"
        >
          <div class="w-full max-w-xl mx-auto">
            <SearchAutocomplete :client-id="resolvedClientId" variant="desktop" />
          </div>
        </div>
        <div v-else-if="!isInlineLayout" class="flex-1 hidden sm:block" />

        
        <div class="flex items-center gap-1 shrink-0">

          
          <a
            v-if="effectiveConfig?.features?.showContact && effectiveConfig?.contactEmail"
            :href="`mailto:${effectiveConfig!.contactEmail}`"
            class="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            :aria-label="`Envoyer un email à ${effectiveConfig!.contactEmail}`"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <span class="hidden xl:inline text-xs">{{ effectiveConfig!.contactEmail }}</span>
          </a>

          
          <ClientOnly>
            
            <button
              v-if="isB2b && !showPrices"
              type="button"
              class="relative p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              :aria-label="t('common.open_quote')"
              @click="openQuote"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span
                v-if="quoteTotalItems > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ quoteTotalItems }}
              </span>
            </button>

            
            <button
              v-if="effectiveConfig?.features?.showCart && (!isB2b || showPrices)"
              type="button"
              class="relative p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              :aria-label="t('common.open_cart')"
              @click="openCart"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                
                <path v-if="isFoodVertical" stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span
                v-if="cartTotalItems > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ cartTotalItems }}
              </span>
            </button>
            <template #fallback>
              <div class="w-9 h-9" aria-hidden="true" />
            </template>
          </ClientOnly>

          
          <NuxtLink
            v-if="effectiveConfig?.features?.showWishlist"
            to="/favoris"
            class="relative p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            :aria-label="t('common.my_favorites')"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <ClientOnly>
              <span
                v-if="wishlistCount > 0"
                class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ wishlistCount }}
              </span>
            </ClientOnly>
          </NuxtLink>

          

          
          <div class="hidden lg:block">
            <EmployeeMenu />
          </div>

          
          <div v-if="effectiveConfig?.features?.showLogin" class="hidden lg:block">
            <slot name="actions">
              <UserMenu />
            </slot>
          </div>

          
          <button
            class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            :aria-expanded="mobileOpen"
            aria-controls="header-mobile-menu"
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

        </div>
      </div>
    </div>

    
    <nav
      v-if="!isInlineLayout"
      class="hidden lg:block relative"
      :class="isDarkNav ? '' : 'border-b border-gray-100'"
      :style="navBarStyle"
      :aria-label="t('common.main_navigation')"
    >
      <ul
        class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center"
        :class="isDarkNav ? 'h-14' : 'h-11 gap-1'"
      >
        <li
          v-for="item in navItems"
          :key="i18nt(item.label)"
          :class="[
            'group h-full flex items-center relative',
            item.rightAlign ? 'ml-auto' : '',
          ]"
        >

          
          <template v-if="!item.megaMenu">
            <component
              :is="item.external ? 'a' : NuxtLink"
              :to="!item.external ? localePath(item.href) : undefined"
              :href="item.external ? item.href : undefined"
              :target="item.external ? '_blank' : undefined"
              :rel="item.external ? 'noopener noreferrer' : undefined"
              :class="[
                'relative inline-flex items-center gap-1 text-sm font-medium transition-colors',
                item.bgColor
                  ? 'h-full px-6'
                  : item.highlight
                    ? 'px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                    : isDarkNav
                      ? 'h-full px-5 text-white/90 hover:bg-white/10 hover:text-white'
                      : 'px-3 py-1.5 rounded-lg text-gray-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-white/[0.05]',
              ]"
              :style="item.bgColor ? `background-color: ${item.bgColor}; color: ${item.textColor || '#fff'}` : undefined"
            >
              <span
                v-if="item.badge"
                class="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap pointer-events-none"
                :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
              >{{ i18nt(item.badge) }}</span>
              {{ i18nt(item.label) }}
            </component>
          </template>

          
          <template v-else-if="item.megaMenu && !item.isMegaMenu">
            <button
              type="button"
              :class="[
                'relative inline-flex items-center gap-1 text-sm font-medium transition-colors select-none h-full',
                item.bgColor
                  ? 'px-6'
                  : isDarkNav
                    ? 'px-5 text-white/90 hover:bg-white/10 hover:text-white'
                    : 'px-3 py-1.5 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50',
              ]"
              :style="item.bgColor ? `background-color: ${item.bgColor}; color: ${item.textColor || '#fff'}` : undefined"
              aria-haspopup="true"
            >
              <span
                v-if="item.badge"
                class="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap pointer-events-none"
                :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
              >{{ i18nt(item.badge) }}</span>
              {{ i18nt(item.label) }}
              <svg :class="['w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180', item.bgColor ? 'opacity-70' : 'text-gray-400']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              class="absolute top-full left-0 pt-2 z-50 min-w-[180px] invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out"
              role="menu"
            >
              <div class="bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                <template v-for="col in item.megaMenu" :key="i18nt(col.title) || col.links[0]?.href">
                  <div v-if="col.title" class="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {{ i18nt(col.title) }}
                  </div>
                  <template v-for="sub in col.links" :key="sub.href">
                    <component
                      :is="NuxtLink" :to="localePath(sub.href)" role="menuitem"
                      class="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                    >
                      {{ i18nt(sub.label) }}
                    </component>
                    <template v-if="sub.psChildren?.length">
                      <component
                        v-for="pc in sub.psChildren" :key="pc.href"
                        :is="NuxtLink" :to="localePath(pc.href)" role="menuitem"
                        class="flex items-center pl-6 pr-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-primary-600 transition-colors"
                      >{{ i18nt(pc.label) }}</component>
                    </template>
                  </template>
                </template>
              </div>
            </div>
          </template>

          
          <template v-else-if="item.megaMenu && item.isMegaMenu">
            <button
              type="button"
              :class="[
                'relative inline-flex items-center gap-1 text-sm font-medium transition-colors select-none h-full',
                item.bgColor
                  ? 'px-6'
                  : isDarkNav
                    ? 'px-5 text-white/90 hover:bg-white/10 hover:text-white'
                    : 'px-3 py-1.5 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50',
              ]"
              :style="item.bgColor ? `background-color: ${item.bgColor}; color: ${item.textColor || '#fff'}` : undefined"
              aria-haspopup="true"
            >
              <span
                v-if="item.badge"
                class="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap pointer-events-none"
                :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
              >{{ i18nt(item.badge) }}</span>
              {{ i18nt(item.label) }}
              <svg :class="['w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180', item.bgColor ? 'opacity-70' : 'text-gray-400']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              class="absolute top-full left-0 pt-2 z-50 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out"
              role="menu"
            >
              <div
                class="relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl p-5 grid gap-5"
                :style="`grid-template-columns: repeat(${item.megaMenu.length}, minmax(180px, 260px)); max-width: 95vw;`"
              >
                <div v-for="(col, ci) in item.megaMenu" :key="ci" class="space-y-1">
                  <div v-if="col.title" class="flex items-center gap-1.5 px-3 pb-1 mb-1 border-b border-gray-100">
                    <img v-if="col.icon && String(col.icon).startsWith('/')" :src="col.icon" :alt="''" class="w-6 h-6 object-contain" loading="lazy" data-no-filter />
                        <span v-else-if="col.icon" class="text-base leading-none" aria-hidden="true">{{ col.icon }}</span>
                    <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">{{ i18nt(col.title) }}</span>
                  </div>
                  <template v-for="sub in col.links" :key="sub.href">
                    <component
                      :is="NuxtLink" :to="localePath(sub.href)" role="menuitem"
                      class="flex flex-col px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors group/sub"
                    >
                      <span class="flex items-center gap-1.5 text-sm font-medium text-gray-800 group-hover/sub:text-primary-600 transition-colors">
                        {{ i18nt(sub.label) }}
                        <span v-if="sub.badge" class="ml-auto text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">{{ i18nt(sub.badge) }}</span>
                      </span>
                      <span v-if="sub.description" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ i18nt(sub.description) }}</span>
                    </component>
                    <template v-if="sub.psChildren?.length">
                      <component
                        v-for="pc in sub.psChildren" :key="pc.href"
                        :is="NuxtLink" :to="localePath(pc.href)" role="menuitem"
                        class="flex items-center pl-6 pr-3 py-1 rounded-lg text-xs text-gray-500 dark:text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      >{{ i18nt(pc.label) }}</component>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </template>

        </li>
      </ul>
    </nav>

    
    <div v-if="previewMode" class="bg-warning-400 text-warning-900 text-xs font-semibold text-center py-1 px-4">
      Mode preview — client : <strong>{{ previewClient }}</strong>
      · <a :href="currentPathWithoutPreview" class="underline hover:no-underline">Quitter le preview</a>
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
        id="header-mobile-menu"
        class="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg"
      >

        
        <div v-if="effectiveConfig?.features?.showSearch" class="mb-3">
          <SearchAutocomplete
            :client-id="resolvedClientId"
            variant="mobile"
            input-class="w-full pl-4 pr-10 py-2.5 rounded-input border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            @navigate="mobileOpen = false"
          />
        </div>

        
        <template v-for="item in navItems" :key="i18nt(item.label)">

          
          <template v-if="!item.megaMenu && !item.children">
            <component
              :is="item.external ? 'a' : NuxtLink"
              :to="!item.external ? localePath(item.href) : undefined"
              :href="item.external ? item.href : undefined"
              :target="item.external ? '_blank' : undefined"
              :class="[
                'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                item.highlight
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
              ]"
              @click="mobileOpen = false"
            >
              <span>{{ i18nt(item.label) }}</span>
              <span
                v-if="item.badge"
                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap pointer-events-none shrink-0"
                :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
              >{{ i18nt(item.badge) }}</span>
            </component>
          </template>

          
          <template v-else>
            <div>
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                @click="toggleMobileAccordion(i18nt(item.label))"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ i18nt(item.label) }}</span>
                  <span
                    v-if="item.badge"
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0"
                    :style="`background:${item.badgeBg || '#FFEB3B'};color:${item.badgeColor || '#000'}`"
                  >{{ i18nt(item.badge) }}</span>
                </span>
                <svg
                  class="w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0"
                  :class="mobileAccordion === i18nt(item.label) ? 'rotate-180' : ''"
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
                <div v-if="mobileAccordion === i18nt(item.label)" class="ml-3 mt-1 space-y-0.5 border-l-2 border-primary-100 pl-3">
                  
                  <template v-if="item.children">
                    <template v-for="sub in item.children" :key="sub.href">
                      
                      <template v-if="sub.psChildren?.length">
                        <component
                          :is="NuxtLink" :to="localePath(sub.href)"
                          class="flex items-center px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          @click="mobileOpen = false"
                        >{{ i18nt(sub.label) }}</component>
                        <component
                          v-for="pc in sub.psChildren" :key="pc.href"
                          :is="NuxtLink" :to="localePath(pc.href)"
                          class="flex items-center px-2 py-1.5 ml-3 rounded-lg text-xs text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          @click="mobileOpen = false"
                        >{{ i18nt(pc.label) }}</component>
                      </template>
                      
                      <component
                        v-else
                        :is="NuxtLink" :to="localePath(sub.href)"
                        class="flex items-center px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        @click="mobileOpen = false"
                      >{{ i18nt(sub.label) }}</component>
                    </template>
                  </template>
                  
                  <template v-else>
                    <template v-for="col in item.megaMenu" :key="i18nt(col.title) || col.links[0]?.href">
                      <p
                        v-if="col.title && item.isMegaMenu"
                        class="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 pt-2 pb-1"
                      >
                        <img v-if="col.icon && String(col.icon).startsWith('/')" :src="col.icon" :alt="''" class="w-6 h-6 object-contain" loading="lazy" data-no-filter />
                        <span v-else-if="col.icon">{{ col.icon }}</span>
                        <span>{{ i18nt(col.title) }}</span>
                      </p>
                      <template v-for="sub in col.links" :key="sub.href">
                        <template v-if="sub.psChildren?.length">
                          <component
                            :is="NuxtLink" :to="localePath(sub.href)"
                            class="flex items-center px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            @click="mobileOpen = false"
                          >{{ i18nt(sub.label) }}</component>
                          <component
                            v-for="pc in sub.psChildren" :key="pc.href"
                            :is="NuxtLink" :to="localePath(pc.href)"
                            class="flex items-center px-2 py-1.5 ml-3 rounded-lg text-xs text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            @click="mobileOpen = false"
                          >{{ i18nt(pc.label) }}</component>
                        </template>
                        <component
                          v-else
                          :is="NuxtLink" :to="localePath(sub.href)"
                          class="flex flex-col px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          @click="mobileOpen = false"
                        >
                          <span class="font-medium">{{ i18nt(sub.label) }}</span>
                          <span v-if="sub.description && item.isMegaMenu" class="text-xs text-gray-400 mt-0.5">
                            {{ i18nt(sub.description) }}
                          </span>
                        </component>
                      </template>
                    </template>
                  </template>
                </div>
              </Transition>
            </div>
          </template>

        </template>

        
        <div class="pt-3 mt-3 border-t border-gray-100 flex items-center gap-3">
          <slot name="actions-mobile">
            <EmployeeMenu />
            <UserMenu v-if="effectiveConfig?.features?.showLogin" />
          </slot>
          <NuxtLink
            v-if="effectiveConfig?.features?.showWishlist"
            to="/favoris"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            :aria-label="t('common.my_favorites')"
            @click="mobileOpen = false"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            Favoris
            <span v-if="wishlistCount > 0" class="ml-auto text-xs font-bold text-primary-600">{{ wishlistCount }}</span>
          </NuxtLink>
        </div>

      </div>
    </Transition>

  </header>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { deepMerge } from '~/utils/deepMerge'

const { config, previewMode, previewClient, currentPathWithoutPreview } = useClientDetection()
const { isEditMode }   = useEditMode()
const { openGlobalPanel } = useEditorState()
const { header: headerDb, builderHeader } = useHeaderDb()
const { theme: themeDb } = useThemeDb()
const { isDark } = useDarkMode()
const { t: i18nt } = useI18nField()
const { t } = useT()
const { localePath } = useLocalePath()
const route = useRoute()

const themeDbColorMode = computed(() =>
  (themeDb.value as any)?.defaultColorMode
  ?? (dbConfig.value as any)?.defaultColorMode
  ?? 'light'
)
const darkModeOnly = computed(() => themeDbColorMode.value === 'dark' || (route.meta as any)?.darkPage === true)
const fixedColorMode = computed(() => darkModeOnly.value || themeDbColorMode.value === 'light')

const { resolvedClientId } = useClientDetection()
const dbConfig = useState<Record<string, unknown> | null>('client_db_config', () => null)

const effectiveConfig = computed(() => {
  const base = dbConfig.value || {} as any
  const headerOverlay = isEditMode.value && builderHeader.value
    ? builderHeader.value
    : headerDb.value
  return deepMerge(base, headerOverlay)
})

const { menuItems: dbMenuItems } = useMegamenu()
const contentWidthClass = useContentWidth()

const _runtimeCfg = useRuntimeConfig()
const isFoodVertical = computed(() => String((_runtimeCfg.public as any)?.vertical || '') === 'food')

const BLOG_HREFS = new Set(['/blog', '/blog/'])
const CONTACT_HREFS = new Set(['/contact', '/contact/', '/nous-contacter', '/nous-contacter/'])
const GIFTCARD_HREFS = new Set(['/cartes-cadeaux', '/cartes-cadeaux/', '/gift-cards', '/gift-cards/'])
const STORES_HREFS = new Set(['/skateshop', '/skateshop/', '/magasins', '/magasins/', '/stores', '/stores/', '/boutiques', '/boutiques/'])
const BRAND_HREFS = new Set(['/marques', '/marques/', '/marque', '/marque/', '/brands', '/brands/'])
const BRAND_LABEL_RE = /\b(marques?|brands?|marken)\b/i

function findBrandIndex(items: Array<Record<string, any>>): number {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const href = String(it.href || '').toLowerCase()
    if (BRAND_HREFS.has(href)) return i
    const labelStr = typeof it.label === 'string'
      ? it.label
      : (it.label?.fr || it.label?.en || '')
    if (BRAND_LABEL_RE.test(String(labelStr))) return i
  }
  return -1
}

const navItems = computed(() => {
  const base = (dbMenuItems.value ?? []) as Array<Record<string, any>>
  const feats = (effectiveConfig.value as any)?.features || {}

  const filtered = base.filter((it) => {
    const href = String(it.href || '').toLowerCase()
    if (feats.showBlogLink && BLOG_HREFS.has(href)) return false
    if (feats.showContactLink && CONTACT_HREFS.has(href)) return false
    if (feats.showGiftcardLink && GIFTCARD_HREFS.has(href)) return false
    if (feats.showStoresLink && STORES_HREFS.has(href)) return false
    return true
  })

  
  const inlineItems = [...filtered]
  if (feats.showGiftcardLink) {
    const giftcardItem = {
      label: t('header.giftcard_link'),
      href: '/cartes-cadeaux',
      virtual: true,
    }
    const brandIdx = findBrandIndex(inlineItems)
    const insertAt = brandIdx >= 0 ? brandIdx + 1 : inlineItems.length
    inlineItems.splice(insertAt, 0, giftcardItem)
  }

  
  
  const extras: Array<Record<string, any>> = []
  let firstRight = true
  if (feats.showBlogLink) {
    extras.push({
      label: t('header.blog_link'),
      href: '/blog',
      align: firstRight ? 'right' : undefined,
      rightAlign: firstRight,
      virtual: true,
    })
    firstRight = false
  }
  if (feats.showStoresLink) {
    extras.push({
      label: t('header.stores_link'),
      href: '/skateshop',
      align: firstRight ? 'right' : undefined,
      rightAlign: firstRight,
      virtual: true,
    })
    firstRight = false
  }
  if (feats.showContactLink) {
    extras.push({
      label: t('header.contact_link'),
      href: '/contact',
      align: firstRight ? 'right' : undefined,
      rightAlign: firstRight,
      virtual: true,
    })
    firstRight = false
  }
  return [...inlineItems, ...extras]
})

const stickyMode = computed(() => !!effectiveConfig.value?.features?.stickyHeader)
const isInlineLayout = computed(() => effectiveConfig.value?.features?.headerLayout === 'inline')

function isDarkHex(hex?: string | null): boolean {
  if (!hex) return false
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return false
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 0.5
}
const isHeaderDark = computed(() => {
  const t = (effectiveConfig.value as any)?.theme
  if (t?.headerDark === true) return true
  return isDarkHex((themeDb.value as any)?.colors?.headerBg)
})

const topBarAlign = computed<'left' | 'center'>(() =>
  (effectiveConfig.value as any)?.topBar?.align === 'center' ? 'center' : 'left'
)

const isDarkNav = computed(() => !!(effectiveConfig.value as any)?.navBar?.backgroundColor)
const navBarStyle = computed(() => {
  const nb = (effectiveConfig.value as any)?.navBar
  if (!nb?.backgroundColor && !nb?.textColor) return undefined
  const parts: string[] = []
  if (nb.backgroundColor) parts.push(`background-color: ${nb.backgroundColor}`)
  if (nb.textColor) parts.push(`color: ${nb.textColor}`)
  return parts.join('; ')
})

const mobileOpen      = ref(false)
const mobileAccordion = ref<string | null>(null)

const { itemTotal: wishlistItemTotal, loadLists: loadWishlist } = useWishlist()
const wishlistCount = computed(() => wishlistItemTotal.value || 0)
const { loggedIn: customerLoggedIn } = useCustomerAuth()
if (import.meta.client) {
  onMounted(() => {
    
    if (effectiveConfig.value?.features?.showWishlist && customerLoggedIn.value) loadWishlist()
  })
}

const scrolled = ref(false)
if (import.meta.client) {
  const onScroll = () => { scrolled.value = window.scrollY > 20 }
  onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
}

const { open: openCart } = useCartDrawer()
const { totalItems: cartTotalItems } = useServerCart(resolvedClientId.value)

const { open: openQuote } = useQuoteDrawer()
const { totalItems: quoteTotalItems } = useQuoteCart()
const { showPrices, isB2b } = useB2bVisibility()

const isExternal = (item: { href?: string; external?: boolean }) =>
  item.external || item.href?.startsWith('http://') || item.href?.startsWith('https://')

const toggleMobileAccordion = (label: string) => {
  mobileAccordion.value = mobileAccordion.value === label ? null : label
}

watch(() => route.path, () => {
  mobileOpen.value = false
  mobileAccordion.value = null
})
</script>

<style>
.header-inverse,
.header-inverse nav,
.header-inverse ul,
.header-inverse li,
.header-inverse a,
.header-inverse button:not([class*="bg-primary"]):not([class*="bg-red"]):not([class*="bg-green"]) {
  color: var(--color-header-text, #ffffff);
}
.header-inverse [class*="text-gray-"],
.header-inverse [class*="text-slate-"] {
  color: var(--color-header-text, #ffffff) !important;
}
.header-inverse [class*="dark:text-"] {
  /* neutralise les surcouches dark mode (headerDark suffit) */
  color: var(--color-header-text, #ffffff);
}
/* Hover = inversion pure (fond blanc, texte noir). Annule les hover:text-primary-* et hover:bg-primary-*. */
.header-inverse a:hover,
.header-inverse button:hover,
.header-inverse [class*="hover:text-primary"]:hover,
.header-inverse [class*="hover:bg-primary"]:hover,
.header-inverse [class*="hover:bg-gray"]:hover {
  color: var(--color-header-bg, #000000) !important;
  background-color: var(--color-header-text, #ffffff) !important;
}
/* Chevrons / icônes SVG héritent de currentColor → suivent automatiquement. */
.header-inverse svg { color: inherit; }

/* ═════════════════════════════════════════════════════════════════════
   Override : les dropdowns/mega-menus du header ont leur propre fond
   blanc (bg-white). On doit RESTAURER les couleurs Tailwind natives
   à l'intérieur pour éviter le cas blanc-sur-blanc (texte invisible).
   ═════════════════════════════════════════════════════════════════════ */
.header-inverse .bg-white,
.header-inverse .bg-white * {
  color: rgb(55 65 81) !important; /* Tailwind text-gray-700 par défaut */
}
.header-inverse .bg-white [class*="text-gray-900"],
.header-inverse .bg-white [class*="text-slate-900"] {
  color: rgb(17 24 39) !important; /* gray-900 */
}
.header-inverse .bg-white [class*="text-gray-700"],
.header-inverse .bg-white [class*="text-slate-700"] {
  color: rgb(55 65 81) !important; /* gray-700 */
}
.header-inverse .bg-white [class*="text-gray-500"],
.header-inverse .bg-white [class*="text-slate-500"],
.header-inverse .bg-white [class*="text-gray-400"],
.header-inverse .bg-white [class*="text-slate-400"] {
  color: rgb(107 114 128) !important; /* gray-500 */
}
/* Hover dans les dropdowns : bg-gray-50 / text-gray-900 (Tailwind standard), pas l'inversion header. */
.header-inverse .bg-white a:hover,
.header-inverse .bg-white button:hover,
.header-inverse .bg-white [class*="hover:text-primary"]:hover,
.header-inverse .bg-white [class*="hover:bg-primary"]:hover,
.header-inverse .bg-white [class*="hover:bg-gray"]:hover {
  color: rgb(17 24 39) !important;
  background-color: rgb(249 250 251) !important; /* gray-50 */
}
/* Preserve les badges colorés (bg-primary-*, etc.) dans les dropdowns */
.header-inverse .bg-white [class*="bg-primary-"] {
  color: white !important;
}
</style>
