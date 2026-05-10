<template>
  <div class="min-h-screen flex transition-colors duration-200" :class="isDark ? 'bg-gray-900' : 'bg-gray-100 dark:bg-slate-800'">

    <!-- ─── Sidebar ───────────────────────────────────────────── -->
    <aside class="border-r shadow-sm flex flex-col shrink-0 transition-all duration-200"
      :class="[
        sidebarCollapsed ? 'w-14 is-collapsed' : 'w-56',
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800',
      ]">

      <!-- Logo + toggle collapse -->
      <div class="px-3 py-4 border-b flex items-center justify-between gap-2"
        :class="[
          isDark ? 'border-gray-700' : 'border-gray-100 dark:border-slate-800',
          sidebarCollapsed ? 'justify-center' : '',
        ]">
        <NuxtLink to="/" class="flex items-center gap-2 group min-w-0">
          <div class="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <div v-if="!sidebarCollapsed" class="min-w-0">
            <p class="text-sm font-bold leading-none group-hover:text-primary-600 transition-colors truncate" :class="isDark ? 'text-gray-100' : 'text-gray-800 dark:text-slate-100'">{{ hubTitle }}</p>
            <p class="text-[10px] text-gray-400 mt-0.5 truncate">{{ t('nav.subtitle') }}</p>
          </div>
        </NuxtLink>
        <button
          v-if="!sidebarCollapsed"
          @click="toggleSidebarCollapsed"
          class="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          :title="t('hub.hub_sidebar_collapse', 'Réduire la sidebar')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <!-- Deploy button in collapsed mode (rail) — full width under the logo -->
      <button
        v-if="sidebarCollapsed"
        @click="toggleSidebarCollapsed"
        class="mx-2 mt-2 mb-1 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        :title="t('hub.hub_sidebar_expand', 'Déployer la sidebar')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <!-- Navigation -->
      <nav ref="navRef" class="flex-1 overflow-y-auto px-3 py-4 space-y-5" @click="onNavClick">

        <!-- Dashboard -->
        <ul class="space-y-0.5">
          <li>
            <NuxtLink to="/hub/dashboard" class="nav-link" active-class="nav-link-active">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              {{ t('nav.dashboard') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub/informations" class="nav-link" active-class="nav-link-active">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              {{ t('nav.informations', 'Informations') }}
            </NuxtLink>
          </li>
          <li v-if="canAccess('intelligence')">
            <NuxtLink to="/hub/brand-os" class="nav-link" active-class="nav-link-active">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              Brand OS
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub/playbooks" class="nav-link" active-class="nav-link-active">
              <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              Playbooks
            </NuxtLink>
          </li>
        </ul>

        <!-- Catalogue (root, founder, catalog, market, logistic) -->
        <div v-if="canAccess('catalogue')">
          <p class="section-title">PIM</p>
          <p class="section-subtitle">Product Information Management</p>
          <ul class="space-y-0.5">
            <li>
              <NuxtLink to="/hub/products" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                {{ t('nav.products') }}
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('pim-cross-sell')">
              <NuxtLink to="/hub/products/cross-sell" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Cross-sell
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/categories" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
                {{ t('nav.categories') }}
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('pim-merchandising')">
              <NuxtLink to="/hub/products/merchandising" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Merchandising
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('pim-promotions')">
              <NuxtLink to="/hub/products/promotions" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                Promotions
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/features" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                Caractéristiques
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/variants" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Déclinaisons
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('pim-search-boost')">
              <NuxtLink to="/hub/products/search-boost" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Recherche & Tri
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('pim-ab-testing')">
              <NuxtLink to="/hub/products/ab-testing" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
                </svg>
                A/B Testing
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-traceability')">
              <NuxtLink to="/hub/pim/traceability" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Traçabilité & Lots
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-expiry')">
              <NuxtLink to="/hub/pim/expiry" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                DLC & Décotes
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-legal-labels')">
              <NuxtLink to="/hub/pim/legal-labels" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Origines & Calibres
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- CRM (root, founder, sales) -->
        <div v-if="canAccess('crm')">
          <p class="section-title">CRM</p>
          <p class="section-subtitle">Customer Relationship Management</p>
          <ul class="space-y-0.5">
            <li v-if="!isFeatureDisabled('avatars')">
              <NuxtLink to="/hub/ai/avatars" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                Avatars
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/leads" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                Leads
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/chatbot" class="nav-link relative" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                {{ t('nav.chatbot') }}
                <span v-if="chatbotUnread > 0"
                  class="ml-auto inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                  {{ chatbotUnread > 99 ? '99+' : chatbotUnread }}
                </span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/projects" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                {{ t('nav.pipeline') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/contacts" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {{ t('nav.clients') }}
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-impersonate')">
              <NuxtLink to="/hub/crm/impersonate" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Mode Commercial
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/rdv" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Rendez-vous
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/crm/email" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                E-mail
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Commandes (root, founder, sales, support, logistic) -->
        <div v-if="canAccess('orders')">
          <p class="section-title">OMS</p>
          <p class="section-subtitle">Order Management System</p>
          <ul class="space-y-0.5">
            <li>
              <NuxtLink to="/hub/carts" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                {{ t('nav.carts') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/carts/abandoned" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Relance paniers
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/payments" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                {{ t('nav.payments', 'Paiements') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/orders" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                {{ t('nav.orders') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/quotes" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
                {{ t('nav.quotes') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/invoices" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {{ t('nav.invoices') }}
              </NuxtLink>
            </li>
            <li v-if="isOwner">
              <NuxtLink to="/hub/outstanding" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
                Encours B2B
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-b2b-pricing')">
              <NuxtLink to="/hub/crm/pricing" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.5h19.5m-19.5 4.5h19.5M2.25 16.5h19.5M12 3.75v16.5" />
                </svg>
                Grilles Tarifaires B2B
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-quick-order')">
              <NuxtLink to="/hub/crm/quick-order" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                Commande Rapide
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Logistique (root, founder, logistic) -->
        <div v-if="canAccess('logistique')">
          <p class="section-title">WMS</p>
          <p class="section-subtitle">Warehouse Management System</p>
          <ul class="space-y-0.5">
            <li>
              <NuxtLink to="/hub/logistique/preparation" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
                Préparation
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/logistique/expeditions" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                Expéditions
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/logistique/transporteurs" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Transporteurs
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/stock" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                {{ t('nav.stock') }}
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('wms-warehouses')">
              <NuxtLink to="/hub/logistique/warehouses" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
                Entrepôts
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('wms-store-locator')">
              <NuxtLink to="/hub/logistique/stores" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21M3 3h18M3 21h18M12 3v3m-3 0h6m-6 0v15m6-15v15m-9-9h12" />
                </svg>
                Boutiques
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-freight-free')">
              <NuxtLink to="/hub/crm/freight" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-4.5" />
                </svg>
                Franco de Port
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-catch-weight')">
              <NuxtLink to="/hub/logistique/catch-weight" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
                Poids Variable
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('food-routing')">
              <NuxtLink to="/hub/logistique/tournees" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Tournées de Livraison
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Contenu (root, founder, market) — landing pages + blog -->
        <div v-if="canAccess('intelligence')">
          <p class="section-title">CMS</p>
          <p class="section-subtitle">Content Management System</p>
          <ul class="space-y-0.5">
            <li>
              <!-- Sprint 18.1 — CMS Marketing scindé : landing pages (institutionnel, cat=1)
                   vs articles de blog (tous les autres dossiers). -->
              <NuxtLink to="/hub/marketing/landing-pages" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Landing pages
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/marketing/blog" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487 18.549 2.799a2.1 2.1 0 1 1 2.97 2.97L9.42 17.868a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l11.094-11.13Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Articles de blog
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/marketing/blog-categories" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
                Catégories blog
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('blog-ia')">
              <NuxtLink to="/hub/autoblog" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                Blog IA
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('hub-translations')">
              <NuxtLink to="/hub/translations" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                </svg>
                Traductions IA
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Communication (root, founder, market) — nurturing + diffusion -->
        <div v-if="canAccess('intelligence')">
          <p class="section-title">MAP</p>
          <p class="section-subtitle">Marketing Automation Platform</p>
          <ul class="space-y-0.5">
            <li v-if="!isFeatureDisabled('nurturing')">
              <NuxtLink to="/hub/marketing/nurturing" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
                Nurturing
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('broadcast')">
              <NuxtLink to="/hub/marketing/broadcast" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m-14.456 0c.045.597.068 1.198.068 1.8 0 1.194-.083 2.369-.24 3.519" />
                </svg>
                Broadcast
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('social-studio')">
              <NuxtLink to="/hub/marketing/studio" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Studio Social
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('youtube-studio')">
              <NuxtLink to="/hub/marketing/youtube" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
                </svg>
                YouTube Studio
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('transcreation')">
              <NuxtLink to="/hub/marketing/localization" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                </svg>
                Transcréation
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/hub/marketing/promos" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Codes promo
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- BI — Business Intelligence (root, founder, market) -->
        <div v-if="canAccess('intelligence')">
          <p class="section-title">BI</p>
          <p class="section-subtitle">Business Intelligence</p>
          <ul class="space-y-0.5">
            <li v-if="!isFeatureDisabled('growth-simulator')">
              <NuxtLink to="/hub/growth/simulator" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
                Simulateur Croissance
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('seo-console')">
              <NuxtLink to="/hub/marketing/seo-console" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
                SEO Console
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('bi-sales')">
              <NuxtLink to="/hub/bi/sales" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
                Ventes & CA
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('bi-cohorts')">
              <NuxtLink to="/hub/bi/cohorts" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72M18 18.72a9.094 9.094 0 0 1-3.741-.479 3 3 0 0 1 4.682-2.72M18 18.72v-.558c0-.34-.059-.668-.168-.977M18 18.72a9.094 9.094 0 0 1-3.741-.479 3 3 0 0 0-4.682-2.72M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                Cohortes
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('bi-matomo')">
              <NuxtLink to="/hub/bi/matomo" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                </svg>
                Matomo
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Finance & Accounting (hidden while all features are off) -->
        <div v-if="canAccess('fin') && hasAnyFeature('fin-payments','fin-tva-fec','fin-refunds','fin-treasury','fin-bank')">
          <p class="section-title">FIN</p>
          <p class="section-subtitle">Finance & Accounting</p>
          <ul class="space-y-0.5">
            <li v-if="isPlaceDesArmes && !isFeatureDisabled('fin-bank')">
              <NuxtLink to="/hub/finance/bank" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" />
                </svg>
                Relevé banque
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('fin-payments')">
              <NuxtLink to="/hub/finance/payments" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                Paiements
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('fin-tva-fec')">
              <NuxtLink to="/hub/finance/tva" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                </svg>
                TVA & FEC
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('fin-refunds')">
              <NuxtLink to="/hub/finance/refunds" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Remboursements
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('fin-treasury')">
              <NuxtLink to="/hub/finance/treasury" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Trésorerie
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- PRM — Purchasing & Fournisseurs -->
        <div v-if="canAccess('prm') && hasAnyFeature('prm-suppliers','prm-purchase-orders','prm-restock')">
          <p class="section-title">PRM</p>
          <p class="section-subtitle">Procurement & Supplier Management</p>
          <ul class="space-y-0.5">
            <li v-if="!isFeatureDisabled('prm-suppliers')">
              <NuxtLink to="/hub/procurement/suppliers" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
                Fournisseurs
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('prm-purchase-orders')">
              <NuxtLink to="/hub/procurement/purchase-orders" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />
                </svg>
                Bons de commande
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('prm-restock')">
              <NuxtLink to="/hub/procurement/restock" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Réassort IA
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Support — Helpdesk & UGC -->
        <div v-if="canAccess('crm_sav') && hasAnyFeature('support-sav','support-inbox','support-tickets','support-rma','support-reviews')">
          <p class="section-title">SUP</p>
          <p class="section-subtitle">Support & Customer Service</p>
          <ul class="space-y-0.5">
            <li v-if="!isFeatureDisabled('support-sav')">
              <NuxtLink to="/hub/sav" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                {{ t('nav.sav') }}
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('support-inbox')">
              <NuxtLink to="/hub/support/inbox" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
                </svg>
                Inbox
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('support-tickets')">
              <NuxtLink to="/hub/support/tickets" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
                </svg>
                Tickets
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('support-rma')">
              <NuxtLink to="/hub/support/rma" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Retours (RMA)
              </NuxtLink>
            </li>
            <li v-if="!isFeatureDisabled('support-reviews')">
              <NuxtLink to="/hub/support/reviews" class="nav-link" active-class="nav-link-active">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                Avis & UGC
              </NuxtLink>
            </li>
          </ul>
        </div>

      </nav>

      <!-- ── Modal customization sidebar visibility ──────────────────── -->
      <Teleport to="body">
        <div v-if="pickerOpen" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" @click.self="pickerOpen = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">{{ pickerTitle }}</h3>
              <button @click="pickerOpen = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400">Coche pour afficher, glisse <span class="font-mono text-gray-400">⋮⋮</span> pour réordonner.</p>
            <ul class="space-y-1 max-h-[60vh] overflow-auto">
              <li
                v-for="(item, idx) in pickerItems"
                :key="item.key"
                draggable="true"
                class="picker-row"
                :class="{ 'picker-row-dragging': dragSrcIdx === idx }"
                @dragstart="onPickerDragStart(idx, $event)"
                @dragover="onPickerDragOver"
                @drop="onPickerDrop(idx, $event)"
                @dragend="onPickerDragEnd"
              >
                <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-sm">
                  <span class="text-gray-300 dark:text-slate-600 font-mono select-none cursor-move" aria-hidden="true" title="Glisser pour réordonner">⋮⋮</span>
                  <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" :checked="!hiddenSidebarItems.has(item.key)" @change="toggleSidebarItem(item.key)" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span class="text-gray-800 dark:text-slate-200 truncate">{{ item.label }}</span>
                  </label>
                </div>
              </li>
            </ul>
            <div class="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-800 gap-3 flex-wrap">
              <div class="flex items-center gap-3">
                <button v-if="hiddenSidebarItems.size > 0" @click="resetSidebarVisibility" class="text-xs text-gray-500 hover:text-gray-700 transition-colors">Tout réafficher</button>
                <button v-if="sidebarOrder[pickerSectionKey]?.length" @click="resetSidebarOrder" class="text-xs text-gray-500 hover:text-gray-700 transition-colors">Ordre par défaut</button>
              </div>
              <button @click="pickerOpen = false" class="text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors">OK</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Profil utilisateur -->
      <div class="px-3 py-3 border-t relative" :class="isDark ? 'border-slate-700' : 'border-gray-100 dark:border-slate-800'">
        <button
          @click="profileOpen = !profileOpen"
          class="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          :class="sidebarCollapsed ? 'justify-center' : ''"
          :title="sidebarCollapsed ? `${user?.firstname || ''} ${user?.lastname || ''}`.trim() : ''"
        >
          <div class="w-7 h-7 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0">
            {{ user?.firstname?.charAt(0) }}{{ user?.lastname?.charAt(0) }}
          </div>
          <div v-if="!sidebarCollapsed" class="min-w-0 flex-1 text-left">
            <p class="text-xs font-medium text-gray-700 dark:text-slate-200 truncate">{{ user?.firstname }} {{ user?.lastname }}</p>
            <p class="text-[9px] font-semibold uppercase tracking-wider" :class="roleColor">{{ roleLabel }}</p>
          </div>
          <svg v-if="!sidebarCollapsed" class="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform" :class="profileOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        <!-- Dropdown profil -->
        <Transition
          enter-active-class="transition-all duration-150"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-if="profileOpen" class="absolute bottom-full left-3 right-3 mb-1 rounded-xl border shadow-lg py-1 z-50"
            :class="isDark ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'">
            <NuxtLink to="/hub/academy" class="profile-link" @click="profileOpen = false">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
              Academy
            </NuxtLink>
            <NuxtLink v-if="isOwner && !isFeatureDisabled('ambassador')" to="/hub/growth/ambassador" class="profile-link" @click="profileOpen = false">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Ambassadeur
            </NuxtLink>
            <NuxtLink to="/hub/growth/referral" class="profile-link" @click="profileOpen = false">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              Partenariat
            </NuxtLink>
            <div class="border-t border-gray-100 dark:border-slate-800 my-1" />
            <button @click="handleLogout" class="profile-link text-danger-500 hover:bg-danger-50 hover:text-danger-600 w-full">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              {{ t('nav.logout') }}
            </button>
          </div>
        </Transition>
      </div>

    </aside>

    <!-- ─── Zone principale ───────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Demo banner (if demo tenant: isDemo=true in runtimeConfig.public) -->
      <DemoBanner />

      <!-- Top Bar -->
      <header class="h-12 border-b px-6 flex items-center justify-end gap-1 shrink-0 transition-colors duration-200"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'">

        <!-- Chatbot — triggering / unread messages during takeover -->
        <div class="relative">
          <NuxtLink to="/hub/chatbot" class="topbar-btn" :title="chatbotUnread > 0 ? `${chatbotUnread} message(s) chatbot non lu(s)` : 'Chatbot — conversations en cours'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </NuxtLink>
          <span
            v-if="chatbotUnread > 0"
            class="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse"
          >{{ chatbotUnread > 99 ? '99+' : chatbotUnread }}</span>
        </div>

        <!-- WhatsApp -->
        <NuxtLink to="/hub/whatsapp" class="topbar-btn" :title="t('hub.hub_topbar_whatsapp', 'Templates WhatsApp')">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </NuxtLink>

        <!-- Events -->
        <NuxtLink v-if="!isFeatureDisabled('events')" to="/hub/logistique/events" class="topbar-btn" :title="t('hub.hub_topbar_events', 'Événements')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
          </svg>
        </NuxtLink>

        <!-- View as (super-admin / fondateur uniquement) -->
        <div v-if="actualIsRoot" class="flex items-center gap-1.5 mr-1" :title="viewAsRole ? t('hub.hub_view_as_active', 'Vous prévisualisez le hub en tant que {role}').replace('{role}', viewAsRole) : t('hub.hub_view_as_idle', 'Prévisualiser le hub avec un autre profil')">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <select
            :value="viewAsRole || ''"
            @change="(e) => setViewAsRole((e.target as HTMLSelectElement).value as any || null)"
            class="text-xs font-medium border rounded-md px-2 py-1 transition-colors"
            :class="viewAsRole
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'"
          >
            <option value="">Vue : réelle</option>
            <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">Vue : {{ opt.label }}</option>
          </select>
        </div>

        <!-- Config dropdown -->
        <div class="relative">
          <button @click="configOpen = !configOpen" class="topbar-btn" :title="t('hub.hub_topbar_config', 'Configuration')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-100"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="configOpen" class="absolute top-full right-0 mt-1 w-56 rounded-xl border shadow-lg py-1 z-50" :class="isDark ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'">

              <!-- ─── My hub (common to all tenants) ──────────── -->
              <p class="config-section-label">Mon hub</p>
              <NuxtLink v-if="isOwner" to="/hub/monitoring" class="config-link" @click="configOpen = false">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                </svg>
                Monitoring
              </NuxtLink>
              <NuxtLink v-if="isOwner" to="/hub/team" class="config-link" @click="configOpen = false">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                Équipe
              </NuxtLink>
              <NuxtLink v-if="isOwner" to="/hub/system/marketplace" class="config-link" @click="configOpen = false">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
                Marketplace
              </NuxtLink>
              <NuxtLink v-if="isOwner" to="/hub/system/cron" class="config-link" @click="configOpen = false">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Cron
              </NuxtLink>
              <NuxtLink v-if="isOwner && !isFeatureDisabled('finops')" to="/hub/system/ai-queue" class="config-link" @click="configOpen = false">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
                FinOps Queue
              </NuxtLink>

              <!-- ─── Operations Center (AC-hub uniquement, super admin) ─── -->
              <template v-if="isRoot && isPlaceDesArmes">
                <div class="border-t border-gray-100 dark:border-slate-700 my-1" />
                <p class="config-section-label config-section-label-ac">Operations Center</p>
                <NuxtLink to="/hub/deploy" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                  </svg>
                  Déployer un client
                </NuxtLink>
                <NuxtLink to="/hub/system/fleet" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
                  </svg>
                  Fleet Monitor
                </NuxtLink>
                <NuxtLink to="/hub/system/automates" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5 13.5 3l-2.25 6h7.5L9 21l2.25-7.5H3.75Z" />
                  </svg>
                  Automates
                </NuxtLink>
                <NuxtLink to="/hub/system/backlog" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                  </svg>
                  Auto-Backlog IA
                </NuxtLink>
                <NuxtLink to="/hub/system/learning-curve" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                  </svg>
                  Courbe d'apprentissage
                </NuxtLink>
                <NuxtLink to="/hub/planning" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                  </svg>
                  Planning
                </NuxtLink>
                <NuxtLink to="/hub/conduites" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375-10.5h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM8.25 6.75h12M8.25 12h12m-12 5.25h12" />
                  </svg>
                  La Conduite
                </NuxtLink>
                <NuxtLink to="/hub/admin/features" class="config-link" @click="configOpen = false">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  Config Système
                </NuxtLink>
              </template>
            </div>
          </Transition>
        </div>
      </header>

      <!-- Contenu -->
      <div class="flex-1 flex flex-col min-w-0 relative">
        <ImpersonationBanner />
        <slot />
        <FeatureHelpButton />
      </div>
    </div>

    <!-- Backdrop dropdowns -->
    <div
      v-if="configOpen || profileOpen"
      class="fixed inset-0 z-40"
      @click="configOpen = false; profileOpen = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ROLE_OPTIONS } from '~/composables/useRoles'

const { user, logout } = useAuth()
const router = useRouter()

const { resolvedClientId } = useClientDetection()
const { header } = useHeaderDb()
const { role, roleColor, roleLabel, canAccess, isOwner, isRoot, actualIsRoot, viewAsRole, setViewAsRole } = useRoles()
const { features, loaded: featuresLoaded, loadFeatures } = useFeatureFlag()

// Hides a sidebar item only if the feature EXISTS in the catalog
// and is disabled. If absent from the catalog (marketplace module not installed),
// it remains visible to avoid regressions on tenants without marketplace.
function isFeatureDisabled(id: string): boolean {
  if (!featuresLoaded.value) return false
  const f = features.value.find(x => x.id === id)
  return !!f && !f.enabled
}

// True if at least one of the features is visible (not disabled). Useful
// to hide an entire section when all its items are off.
function hasAnyFeature(...ids: string[]): boolean {
  return ids.some(id => !isFeatureDisabled(id))
}

// Used to hide global orchestration tools (Fleet, Planning,
// Auto-Backlog, Deployment, System Configuration) on client VPS.
const isPlaceDesArmes = computed(() => resolvedClientId.value === 'ac-hub')
const { t } = useHubT()
const { isDark } = useDarkMode()
const hubTitle = computed(() =>
  header.value?.logo?.text
  ?? (resolvedClientId.value !== 'ac-hub' ? resolvedClientId.value : null)
  ?? 'AC Hub'
)

const profileOpen = ref(false)
const configOpen  = ref(false)

// ── Sidebar customization (visibility + order + collapsed) ────────────
// Source of truth: cs_employee_sidebar_pref (1 row per id_employee
// on the current tenant's DB). Read/write via:
//   - GET  /api/hub/employee/sidebar-prefs
// - PUT  /api/hub/employee/sidebar-prefs   (debounced 300 ms)
//
// localStorage cache = first paint without flash while awaiting DB fetch
// on mount. After each mutation: local update + immediate localStorage
// (reactive UI), debounced DB PUT (multi-device persistence).
const navRef = ref<HTMLElement | null>(null)
const pickerOpen = ref(false)
const pickerTitle = ref('')
const pickerSectionKey = ref('')
const pickerItems = ref<Array<{ key: string; label: string }>>([])
const hiddenSidebarItems = ref<Set<string>>(new Set())
const sidebarOrder = ref<Record<string, string[]>>({})
const dragSrcIdx = ref<number | null>(null)


const STORAGE_KEY = 'hub_sidebar_hidden_v1'
const ORDER_KEY = 'hub_sidebar_order_v1'

// Sidebar collapse/expand state — persisted in localStorage. The rail
// collapsed (w-14) keeps icons clickable, gains ~10rem for the
// main-view. The CSS rule `.is-collapsed` hides labels and section titles
// via font-size:0 on anchors (child elements remain visible).
const COLLAPSE_KEY = 'hub_sidebar_collapsed_v1'
const sidebarCollapsed = ref(false)
function loadSidebarCollapsed() {
  if (!import.meta.client) return
  try {
    sidebarCollapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch { /* ignore */ }
}
function toggleSidebarCollapsed() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  if (import.meta.client) {
    localStorage.setItem(COLLAPSE_KEY, sidebarCollapsed.value ? '1' : '0')
  }
  persistPrefsDebounced()
}

function loadHiddenSidebar() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) hiddenSidebarItems.value = new Set(JSON.parse(raw))
  } catch { /* ignore */ }
}
function saveHiddenSidebar() {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenSidebarItems.value]))
}
function loadSidebarOrder() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (raw) sidebarOrder.value = JSON.parse(raw)
  } catch { /* ignore */ }
}
function saveSidebarOrder() {
  if (!import.meta.client) return
  localStorage.setItem(ORDER_KEY, JSON.stringify(sidebarOrder.value))
}
function toggleSidebarItem(key: string) {
  const s = new Set(hiddenSidebarItems.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  hiddenSidebarItems.value = s
  saveHiddenSidebar()
  applySidebarPrefs()
  persistPrefsDebounced()
}
function resetSidebarVisibility() {
  hiddenSidebarItems.value = new Set()
  saveHiddenSidebar()
  applySidebarPrefs()
  persistPrefsDebounced()
}
function resetSidebarOrder() {
  if (!pickerSectionKey.value) return
  const next = { ...sidebarOrder.value }
  delete next[pickerSectionKey.value]
  sidebarOrder.value = next
  saveSidebarOrder()
  // Re-sorts pickerItems according to native DOM order (picker is open).
  pickerItems.value = readPickerItemsFromDom(pickerSectionKey.value)
  applySidebarPrefs()
  persistPrefsDebounced()
}
function sectionKeyFromTitle(text: string): string {
  return (text || '').trim().toLowerCase()
}
function readPickerItemsFromDom(sectionKey: string): Array<{ key: string; label: string }> {
  if (!navRef.value) return []
  // Finds the section by normalized title
  const sections = navRef.value.querySelectorAll<HTMLDivElement>(':scope > div')
  for (const div of sections) {
    const titleEl = div.querySelector('.section-title')
    if (!titleEl) continue
    if (sectionKeyFromTitle(titleEl.textContent || '') !== sectionKey) continue
    const ul = div.querySelector('ul')
    if (!ul) return []
    const items: Array<{ key: string; label: string }> = []
    ul.querySelectorAll<HTMLLIElement>(':scope > li').forEach((li) => {
      const a = li.querySelector('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const key = a.getAttribute('href') || ''
      const label = (a.textContent || '').trim()
      if (key && label) items.push({ key, label })
    })
    return items
  }
  return []
}
// Combines visibility (display:none) + order (CSS order). The UL parent becomes
// flex-column so that `order` takes effect — preserves Tailwind classes
// existantes (space-y-0.5 reste intact via gap effectif).
function applySidebarPrefs() {
  if (!navRef.value) return
  const sections = navRef.value.querySelectorAll<HTMLDivElement>(':scope > div')
  sections.forEach((div) => {
    const titleEl = div.querySelector('.section-title')
    const ul = div.querySelector('ul') as HTMLUListElement | null
    if (!ul) return
    const sectionKey = sectionKeyFromTitle(titleEl?.textContent || '')
    const order = sidebarOrder.value[sectionKey] || []
    const orderMap = new Map<string, number>()
    order.forEach((href, idx) => orderMap.set(href, idx))

    // Activates flex-column on the UL so that CSS `order` takes effect.
    ul.style.display = 'flex'
    ul.style.flexDirection = 'column'

    let trailingIdx = order.length
    ul.querySelectorAll<HTMLLIElement>(':scope > li').forEach((li) => {
      const a = li.querySelector('a[href]') as HTMLAnchorElement | null
      const href = a?.getAttribute('href') || ''
      // Visibility (toggle hidden items)
      li.style.display = hiddenSidebarItems.value.has(href) ? 'none' : ''
      // Position (known items take their idx; new items at the tail)
      li.style.order = orderMap.has(href) ? String(orderMap.get(href)) : String(trailingIdx++)
    })
  })
}
function onNavClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  // Click on section-title or section-subtitle
  if (!target.classList.contains('section-title') && !target.classList.contains('section-subtitle')) return
  e.preventDefault()
  const sectionDiv = target.closest('div')
  if (!sectionDiv) return
  const titleEl = sectionDiv.querySelector('.section-title')
  const subtitleEl = sectionDiv.querySelector('.section-subtitle')
  const ul = sectionDiv.querySelector('ul')
  if (!ul) return
  const sectionKey = sectionKeyFromTitle(titleEl?.textContent || '')
  // Raw DOM read then sort according to the stored order for this section.
  const rawItems: Array<{ key: string; label: string }> = []
  ul.querySelectorAll<HTMLLIElement>(':scope > li').forEach((li) => {
    const a = li.querySelector('a[href]') as HTMLAnchorElement | null
    if (!a) return
    const key = a.getAttribute('href') || ''
    const label = (a.textContent || '').trim()
    if (key && label) rawItems.push({ key, label })
  })
  if (!rawItems.length) return
  const stored = sidebarOrder.value[sectionKey] || []
  const orderMap = new Map<string, number>()
  stored.forEach((href, idx) => orderMap.set(href, idx))
  rawItems.sort((a, b) => {
    const ai = orderMap.has(a.key) ? orderMap.get(a.key)! : stored.length + rawItems.indexOf(a)
    const bi = orderMap.has(b.key) ? orderMap.get(b.key)! : stored.length + rawItems.indexOf(b)
    return ai - bi
  })
  pickerSectionKey.value = sectionKey
  pickerTitle.value = `${titleEl?.textContent?.trim() || 'Section'} — ${subtitleEl?.textContent?.trim() || ''}`.replace(/—\s*$/, '').trim()
  pickerItems.value = rawItems
  pickerOpen.value = true
}

// ── Drag-and-drop reorder in the picker ──────────────────────────────
function onPickerDragStart(idx: number, e: DragEvent) {
  dragSrcIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}
function onPickerDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
function onPickerDrop(idx: number, e: DragEvent) {
  e.preventDefault()
  const src = dragSrcIdx.value
  dragSrcIdx.value = null
  if (src === null || src === idx) return
  const arr = [...pickerItems.value]
  const [moved] = arr.splice(src, 1)
  arr.splice(idx, 0, moved)
  pickerItems.value = arr
  // Persists the complete order of the section.
  sidebarOrder.value = {
    ...sidebarOrder.value,
    [pickerSectionKey.value]: arr.map((it) => it.key),
  }
  saveSidebarOrder()
  applySidebarPrefs()
  persistPrefsDebounced()
}
function onPickerDragEnd() {
  dragSrcIdx.value = null
}

// ── Sync DB (loaded on mount, debounced persist) ───────────────────────
let putTimer: ReturnType<typeof setTimeout> | null = null
function persistPrefsDebounced() {
  if (!import.meta.client) return
  if (putTimer) clearTimeout(putTimer)
  putTimer = setTimeout(() => {
    putTimer = null
    $fetch('/api/hub/employee/sidebar-prefs', {
      method: 'PUT',
      body: {
        hidden: [...hiddenSidebarItems.value],
        order: sidebarOrder.value,
        collapsed: sidebarCollapsed.value,
      },
    }).catch(() => { /* silent — localStorage couvre l'offline */ })
  }, 300)
}
async function loadPrefsFromDb() {
  if (!import.meta.client) return
  try {
    const data = await $fetch<{ hidden: string[]; order: Record<string, string[]>; collapsed: boolean }>('/api/hub/employee/sidebar-prefs')
    hiddenSidebarItems.value = new Set(Array.isArray(data?.hidden) ? data.hidden : [])
    sidebarOrder.value = (data?.order && typeof data.order === 'object') ? data.order : {}
    sidebarCollapsed.value = !!data?.collapsed
    // Sync localStorage cache for the next paint
    saveHiddenSidebar()
    saveSidebarOrder()
    localStorage.setItem(COLLAPSE_KEY, sidebarCollapsed.value ? '1' : '0')
    nextTick(() => applySidebarPrefs())
  } catch { /* silent — fallback localStorage */ }
}

onMounted(() => {
  // First paint from localStorage cache (instantaneous, zero flash)
  loadSidebarCollapsed()
  loadHiddenSidebar()
  loadSidebarOrder()
  nextTick(() => applySidebarPrefs())
  // Then sync DB in background (multi-device source of truth)
  loadPrefsFromDb()
})
// Re-apply when items mount asynchronously (feature flags loaded)
watch(featuresLoaded, () => nextTick(() => applySidebarPrefs()))

// Chatbot badge — lightweight counter, 10s polling. Visible in the sidebar
// CRM (Chatbot button) + dedicated topbar bell.
const chatbotUnread = ref(0)
async function loadChatbotUnread() {
  try {
    const data = await $fetch<any>('/api/bo/chatbot/unread-count', { query: { clientId: resolvedClientId.value } })
    chatbotUnread.value = Number(data?.unread || 0)
  } catch { /* silent */ }
}

onMounted(() => {
  loadChatbotUnread(); setInterval(loadChatbotUnread, 10_000)
  loadFeatures()
})

const handleLogout = async () => {
  profileOpen.value = false
  await logout()
  router.push('/')
}
</script>

<style scoped>
.nav-link {
  @apply flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full
         text-gray-600 hover:bg-primary-50 hover:text-primary-600;
}
:root.dark .nav-link {
  @apply text-gray-400;
}
:root.dark .nav-link:hover {
  @apply bg-gray-700 text-primary-400;
}
.nav-link-active {
  @apply bg-primary-50 text-primary-600;
}
:root.dark .nav-link-active {
  @apply bg-gray-700 text-primary-400;
}
.nav-icon {
  @apply w-4 h-4 shrink-0;
}
.section-title {
  @apply px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest cursor-pointer select-none transition-colors;
}
.section-title:hover {
  @apply text-primary-600 dark:text-primary-400;
}
.section-subtitle {
  @apply px-3 mb-1.5 text-[9px] font-normal text-gray-300 dark:text-slate-600 italic normal-case tracking-normal leading-tight cursor-pointer select-none transition-colors;
}
.section-subtitle:hover {
  @apply text-primary-500 dark:text-primary-300;
}
.config-section-label {
  @apply px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500;
}
.config-section-label-ac {
  @apply text-primary-500 dark:text-primary-400;
}
.section-header {
  @apply mb-0;
}

/* Sidebar collapsed (rail w-14) — we hide labels via font-size:0 on
   .nav-link (les nœuds texte enfants disparaissent) et on restaure une
   font-size sur les enfants élément (svg garde son sizing intrinsèque).
   Sections : titres + sous-titres entièrement masqués. */
.is-collapsed .nav-link {
  @apply justify-center px-0;
  font-size: 0 !important;
  line-height: 0 !important;
  gap: 0 !important;
}
.is-collapsed .nav-link > * {
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.is-collapsed .section-title,
.is-collapsed .section-subtitle {
  display: none !important;
}
.is-collapsed nav {
  @apply px-2 space-y-2;
}

.topbar-btn {
  @apply w-8 h-8 rounded-lg flex items-center justify-center transition-colors
         text-gray-400 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-600;
}
:root.dark .topbar-btn:hover {
  @apply bg-gray-700 text-gray-300;
}
.picker-row {
  @apply rounded transition-opacity;
}
.picker-row-dragging {
  @apply opacity-40;
}
.profile-link {
  @apply flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors
         text-gray-600 hover:bg-primary-50 hover:text-primary-600;
}
:root.dark .profile-link {
  @apply text-gray-400;
}
:root.dark .profile-link:hover {
  @apply bg-gray-700 text-primary-400;
}
.config-link {
  @apply flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-600
         hover:bg-gray-50 hover:text-gray-800 dark:text-slate-100 transition-colors;
}
:root.dark .config-link {
  @apply text-gray-400;
}
:root.dark .config-link:hover {
  @apply bg-gray-700 text-gray-200;
}
</style>
