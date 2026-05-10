<template>
  <aside
    class="fixed left-0 top-0 bottom-0 z-[150] flex flex-col builder-sidebar"
    :class="{ 'is-collapsed': builderCollapsed }"
    :style="{
      width: builderCollapsed ? '56px' : `${builderWidth}px`,
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      boxShadow: '4px 0 24px rgba(0,0,0,.08)',
      transition: isResizing ? 'none' : 'width 200ms ease',
    }"
  >

    <!-- ── Header barre ───────────────────────────────────────────────────── -->
    <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 builder-header-text">
          <span class="text-base">🔧</span>
          <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">Builder</span>
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 text-primary-700 uppercase">
            {{ resolvedClientId }}
          </span>
        </div>
        <!-- Collapsed: only the toggle icon is shown, the rest is hidden -->
        <span v-if="builderCollapsed" class="text-base mx-auto">🔧</span>
        <div class="flex items-center gap-1.5 builder-header-actions">
          <span v-if="globalDirty && !builderCollapsed" class="w-2 h-2 rounded-full bg-amber-400 animate-pulse" :title="`${globalDirtyCount} domaine${globalDirtyCount > 1 ? 's' : ''} non sauvegardé${globalDirtyCount > 1 ? 's' : ''}`" />
          <button
            @click="toggleBuilderCollapsed"
            class="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            :title="builderCollapsed ? 'Étendre la sidebar' : 'Réduire en rail (56px)'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path v-if="builderCollapsed" stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m12-12.75-3.75 3.75 3.75 3.75M3 4.5v15" />
            </svg>
          </button>
          <button v-if="!builderCollapsed" @click="toggleEditMode" class="text-gray-400 hover:text-gray-600 transition-colors p-0.5" title="Fermer le Builder">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Drag-resize handle (right edge, hidden in collapsed mode) ──────── -->
    <div
      v-if="!builderCollapsed"
      class="builder-resize-handle"
      :class="{ 'is-resizing': isResizing }"
      @mousedown="onResizeStart"
      title="Glisser pour redimensionner (320–560px)"
    />


    <!-- ── Back from a panel ───────────────────────────────────────── -->
    <div v-if="activePanel" class="px-4 py-2 border-b border-gray-100 shrink-0">
      <button
        @click="activePanel = null"
        class="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Retour
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- VUE LISTE — aucun panneau ouvert                                    -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <div v-if="!activePanel" class="flex-1 overflow-auto">

      <!-- ── Groupe GLOBAL SETTINGS ──────────────────────────────────────── -->
      <div class="border-b border-gray-100">
        <button
          @click="toggleGroup('apparence')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Apparence</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'apparence' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'apparence'" class="px-3 pb-3 space-y-1.5">
          <!-- Theme -->
          <button
            @click="activePanel = 'theme'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🎨</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Thème</p>
              <p class="text-[10px] text-gray-400">Couleurs, polices, UI</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Groupe HAUT DE PAGE ──────────────────────────────────────────── -->
      <div class="border-b border-gray-100">
        <button
          @click="toggleGroup('top')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Haut de page</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'top' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'top'" class="px-3 pb-3 space-y-1.5">
          <!-- Header -->
          <button
            @click="activePanel = 'header'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🏷️</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Header</p>
              <p class="text-[10px] text-gray-400">Logo, topbar, contact, layout</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <!-- Menu (navigation + megamenu) -->
          <button
            @click="activePanel = 'menu'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🧭</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Menu</p>
              <p class="text-[10px] text-gray-400">Navigation, dropdowns, mégamenu</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Groupe PAGE SETTINGS (contexte dynamique) ──────────────────── -->
      <div v-if="contextPageId" class="border-b border-gray-100">
        <button
          @click="toggleGroup('page')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Page Settings</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'page' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'page'" class="px-3 pb-3 space-y-1.5">
          <!-- Silo (grossiste) -->
          <template v-if="contextPageId === 'silo'">
            <button
              @click="activePanel = 'silo:hero'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🗂️</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Sections catégories</p>
                <p class="text-[10px] text-gray-400 truncate">{{ contextPayload.label ?? contextPayload.path ?? '—' }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </template>

        </div>
      </div>

      <!-- ── Groupe HOMEPAGE SECTIONS (drag-and-drop) ────────────────────── -->
      <div v-if="!contextPageId" class="border-b border-gray-100">
        <div class="flex items-center">
          <button
            @click="toggleGroup('homepage')"
            class="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Sections Homepage</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="openGroup === 'homepage' ? '' : '-rotate-90'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <!-- Component library button (DB sections only) -->
          <button
            v-if="isDbSections"
            @click="activePanel = 'section-library'"
            class="w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Bibliothèque de composants"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </button>
        </div>

        <div v-show="openGroup === 'homepage'" class="px-3 pb-3">

          <!-- ── DB mode (example deployments and future DB-driven tenants) ─────────── -->
          <template v-if="isDbSections">
            <div v-if="dbSectionsLoading" class="py-4 text-center">
              <span class="text-[10px] text-gray-400">Chargement des sections...</span>
            </div>
            <template v-else>
              <div
                v-for="(section, index) in dbSectionsList"
                :key="section.id"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover.prevent="onDragOver(index)"
                @drop.prevent="onDbDrop(index)"
                @dragend="dragOver = null"
                class="flex items-center gap-2 p-2.5 mb-1.5 rounded-xl border bg-white
                       group transition-all duration-150 cursor-grab"
                :class="[
                  dragOver === index ? 'border-primary-400 bg-primary-50 scale-[1.01]' : '',
                  section.active ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/40' : 'border-dashed border-gray-300 opacity-50',
                ]"
              >
                <!-- Grip -->
                <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                </svg>
                <!-- Icon + label -->
                <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-semibold" :class="section.active ? 'text-gray-700' : 'text-gray-400'">
                    {{ sectionMeta(section.type).label }}
                  </span>
                  <span v-if="section.title" class="ml-1 text-[10px] text-gray-400 truncate">{{ section.title }}</span>
                </div>
                <!-- Up/Down -->
                <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button v-if="index > 0" @click.stop="moveDbSection(index, index - 1)"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
                    </svg>
                  </button>
                  <button v-if="index < dbSectionsList.length - 1" @click.stop="moveDbSection(index, index + 1)"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                <!-- Toggle active/inactive -->
                <button
                  @click.stop="toggleDbSection(index)"
                  class="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  :class="section.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
                  :title="section.active ? 'Désactiver' : 'Activer'"
                >
                  <svg v-if="section.active" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
                <!-- Edit section content -->
                <button
                  @click.stop="openSectionEditor(section.id)"
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                  title="Configurer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
              <div class="flex items-center justify-between mt-2">
                <p class="text-[10px] text-gray-400">Glissez pour réordonner</p>
                <p v-if="dbSectionsDirty" class="text-[10px] font-medium text-amber-600 italic">Modifié — Enregistrer en bas ↓</p>
              </div>
            </template>
          </template>

          <!-- ── Mode AC Hub (editor store, legacy) ───────────────────── -->
          <template v-else>
            <div
              v-for="(section, index) in sections"
              :key="section.type"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent="onDragOver(index)"
              @drop.prevent="onDrop(index)"
              @dragend="dragOver = null"
              class="flex items-center gap-2 p-2.5 mb-1.5 rounded-xl border border-gray-200 bg-white
                     hover:border-primary-300 hover:bg-primary-50/40 group transition-all duration-150 cursor-grab"
              :class="dragOver === index ? 'border-primary-400 bg-primary-50 scale-[1.01]' : ''"
            >
              <!-- Grip -->
              <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
              </svg>
              <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-semibold text-gray-700">{{ sectionMeta(section.type).label }}</span>
                <!-- Purple badge if visibility rule is active -->
                <span
                  v-if="section.visibility.avatars.length > 0"
                  class="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-violet-100 text-violet-700"
                  :title="formatVisibilityLabel(section.visibility)"
                >👁️ {{ section.visibility.avatars.length }}</span>
              </div>
              <!-- Up/Down -->
              <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button v-if="index > 0" @click.stop="moveSection(index, index - 1)"
                  class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
                  </svg>
                </button>
                <button v-if="index < sections.length - 1" @click.stop="moveSection(index, index + 1)"
                  class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
              <!-- Visibility -->
              <button
                @click.stop="openVisibilityPanel(section.type)"
                class="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                :class="section.visibility.avatars.length > 0 ? 'text-violet-500 hover:bg-violet-100' : 'text-gray-400 hover:text-violet-500 hover:bg-violet-50'"
                title="Affichage conditionnel"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <!-- Edit -->
              <button
                @click.stop="activePanel = ('homepage:' + section.type) as any"
                class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                title="Éditer le contenu"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
            <p class="text-[10px] text-gray-400 mt-2 text-center">Glissez · ✏️ contenu · 👁️ visibilité</p>
          </template>
        </div>
      </div>

      <!-- ── Groupe PIED DE PAGE ─────────────────────────────────────────── -->
      <div class="border-b border-gray-100">
        <div class="flex items-center">
          <button
            @click="toggleGroup('footer')"
            class="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Pied de page</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="openGroup === 'footer' ? '' : '-rotate-90'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <!-- Pre-footer library button -->
          <button
            v-if="isDbSections"
            @click="activePanel = 'prefooter-library'"
            class="w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Composants pré-footer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </button>
        </div>

        <div v-show="openGroup === 'footer'" class="px-3 pb-3 space-y-1.5">

          <!-- Pre-footer sections (DB-driven) -->
          <template v-if="isDbSections && pfSectionsList.length">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avant le footer</p>
            <div
              v-for="(section, index) in pfSectionsList"
              :key="section.id"
              class="flex items-center gap-2 p-2 mb-1 rounded-xl border bg-white group transition-all"
              :class="section.active ? 'border-gray-200 hover:border-primary-300' : 'border-dashed border-gray-300 opacity-50'"
            >
              <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-semibold" :class="section.active ? 'text-gray-700' : 'text-gray-400'">
                  {{ sectionMeta(section.type).label }}
                </span>
              </div>
              <button
                @click.stop="togglePfSection(index)"
                class="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                :class="section.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
                :title="section.active ? 'Désactiver' : 'Activer'"
              >
                <svg v-if="section.active" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </button>
              <button
                @click.stop="openPfSectionEditor(section.id)"
                class="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                title="Configurer"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
            <p v-if="pfSectionsDirty" class="text-[10px] font-medium text-amber-600 italic mt-1 text-center">Modifié — Enregistrer en bas ↓</p>
          </template>

          <!-- Separator if pre-footer sections exist -->
          <div v-if="isDbSections && pfSectionsList.length" class="border-t border-gray-100 my-1.5" />

          <!-- Footer config button -->
          <button
            @click="activePanel = 'footer'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🦶</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Footer</p>
              <p class="text-[10px] text-gray-400">Contact, liens, copyright</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- PANNEAUX DE FORMULAIRE                                              -->
    <!-- ════════════════════════════════════════════════════════════════════ -->

    <!-- ── Component library (DB sections) ──────────────────────── -->
    <div v-else-if="activePanel === 'section-library'" class="flex-1 overflow-auto p-4 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        Composants
      </h3>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        Activez ou désactivez les composants de votre homepage. Cliquez sur un composant pour le configurer.
      </p>

      <div class="space-y-1.5">
        <div
          v-for="section in dbSectionsList"
          :key="section.id"
          class="flex items-center gap-3 p-3 rounded-xl border transition-all"
          :class="section.active
            ? 'border-primary-200 bg-primary-50/40'
            : 'border-gray-200 bg-white opacity-60'"
        >
          <!-- Icon + info -->
          <span class="text-lg">{{ sectionMeta(section.type).icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold" :class="section.active ? 'text-gray-800' : 'text-gray-500'">
              {{ sectionMeta(section.type).label }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">{{ sectionTypeDescription(section.type) }}</p>
          </div>
          <!-- Configure button -->
          <button
            @click="openSectionEditor(section.id)"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
            title="Configurer"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <!-- Toggle switch -->
          <button
            @click="toggleDbSectionFromLibrary(section.id)"
            class="relative w-10 h-5 rounded-full transition-colors duration-200"
            :class="section.active ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="section.active ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <p v-if="dbSectionsDirty" class="pt-2 text-xs text-amber-600 italic text-center">Modifié — Enregistrer en bas ↓</p>
    </div>

    <!-- ── Individual section editor (DB) ──────────────────────────── -->
    <div v-else-if="activePanel === 'section-edit' && editingSection" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">{{ sectionMeta(editingSection.type).icon }}</span>
        {{ sectionMeta(editingSection.type).label }}
      </h3>

      <!-- Section title (multilang) -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Titrage</legend>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingSection.title)"
            :langs="tenantLangs"
            placeholder="Titre de la section"
            @update:model-value="updateEditingSectionTitle($event)"
          />
        </div>
        <div>
          <label class="field-label">Sous-titre</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingSection.subtitle)"
            :langs="tenantLangs"
            type="textarea"
            placeholder="Description de la section"
            @update:model-value="updateEditingSectionSubtitle($event)"
          />
        </div>
      </fieldset>

      <!-- Type-specific editor -->
      <EditorSectionsHeroSliderEditor
        v-if="editingSection.type === 'hero-slider'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsFeaturesEditor
        v-else-if="editingSection.type === 'features'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsNarrativeBlocksEditor
        v-else-if="editingSection.type === 'narrative-blocks'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsCategoriesEditor
        v-else-if="editingSection.type === 'categories'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsBlogEditor
        v-else-if="editingSection.type === 'blog'"
        :payload="editingSection.payload"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsInstagramEditor
        v-else-if="editingSection.type === 'instagram'"
        :payload="editingSection.payload"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsSimpleConfigEditor
        v-else
        :payload="editingSection.payload"
        :section-type="editingSection.type"
        @update:payload="updateEditingSectionPayload($event)"
      />

      <p v-if="sectionPayloadDirty" class="text-xs text-amber-600 italic text-center pt-2">Modifié — Enregistrer en bas ↓</p>
    </div>

    <!-- ── Pre-footer component library ─────────────────────────── -->
    <div v-else-if="activePanel === 'prefooter-library'" class="flex-1 overflow-auto p-4 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        Pré-footer
      </h3>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        Composants affichés sur toutes les pages, juste avant le footer.
      </p>

      <div class="space-y-1.5">
        <div
          v-for="section in pfSectionsList"
          :key="section.id"
          class="flex items-center gap-3 p-3 rounded-xl border transition-all"
          :class="section.active ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-white opacity-60'"
        >
          <span class="text-lg">{{ sectionMeta(section.type).icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold" :class="section.active ? 'text-gray-800' : 'text-gray-500'">
              {{ sectionMeta(section.type).label }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">{{ prefooterTypeDescription(section.type) }}</p>
          </div>
          <button
            @click="openPfSectionEditor(section.id)"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
            title="Configurer"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button
            @click="togglePfSectionFromLibrary(section.id)"
            class="relative w-10 h-5 rounded-full transition-colors duration-200"
            :class="section.active ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="section.active ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <p v-if="pfSectionsDirty" class="pt-2 text-xs text-amber-600 italic text-center">Modifié — Enregistrer en bas ↓</p>
    </div>

    <!-- ── Pre-footer section editor ──────────────────────────────── -->
    <div v-else-if="activePanel === 'prefooter-edit' && editingPfSection" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">{{ sectionMeta(editingPfSection.type).icon }}</span>
        {{ sectionMeta(editingPfSection.type).label }}
      </h3>

      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Titrage</legend>
        <div>
          <label class="field-label">Titre</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingPfSection.title)"
            :langs="tenantLangs"
            placeholder="Titre de la section"
            @update:model-value="updatePfSectionTitle($event)"
          />
        </div>
        <div>
          <label class="field-label">Sous-titre</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingPfSection.subtitle)"
            :langs="tenantLangs"
            type="textarea"
            placeholder="Description"
            @update:model-value="updatePfSectionSubtitle($event)"
          />
        </div>
      </fieldset>

      <EditorSectionsCustomerReviewsEditor
        v-if="editingPfSection.type === 'customer-reviews'"
        :payload="editingPfSection.payload"
        @update:payload="updatePfSectionPayload($event)"
      />
      <EditorSectionsSimpleConfigEditor
        v-else
        :payload="editingPfSection.payload"
        :section-type="editingPfSection.type"
        @update:payload="updatePfSectionPayload($event)"
      />

      <p v-if="pfPayloadDirty" class="text-xs text-amber-600 italic text-center pt-2">Modifié — Enregistrer en bas ↓</p>
    </div>

    <!-- ── Header Settings ────────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'header'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🏷️ Header</h3>

      <!-- Logo -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Logo</legend>
        <div>
          <label class="field-label">Image du logo</label>
          <div class="flex gap-1.5">
            <input
              :value="headerBuilderState?.logo?.src ?? ''"
              @input="onHeaderLogoChange({ src: ($event.target as HTMLInputElement).value })"
              type="url" class="field flex-1" placeholder="https://... ou uploader →" />
            <button
              type="button"
              class="shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-600 transition-colors"
              :class="{ 'opacity-50 pointer-events-none': logoUploading }"
              @click="($refs.logoFileInput as HTMLInputElement)?.click()"
            >
              {{ logoUploading ? '⏳' : '📁' }}
            </button>
            <input
              ref="logoFileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              class="hidden"
              @change="handleLogoUpload"
            />
          </div>
          <p v-if="logoUploadError" class="text-[10px] text-red-500 mt-1">{{ logoUploadError }}</p>
          <div v-if="headerBuilderState?.logo?.src" class="mt-1.5 h-10 flex items-center">
            <img :src="headerBuilderState.logo.src" :alt="(headerBuilderState.logo.alt as any)?.fr ?? 'logo preview'" class="h-full w-auto object-contain" />
          </div>
        </div>
        <div>
          <label class="field-label">Texte alternatif (alt)</label>
          <EditorI18nField
            :model-value="headerBuilderState?.logo?.alt"
            :langs="tenantLangs"
            placeholder="Nom de la marque"
            @update:model-value="onHeaderLogoChange({ alt: $event })"
          />
        </div>
        <div>
          <label class="field-label">Texte fallback (si image manquante)</label>
          <EditorI18nField
            :model-value="headerBuilderState?.logo?.text"
            :langs="tenantLangs"
            placeholder="Mon Entreprise"
            @update:model-value="onHeaderLogoChange({ text: $event })"
          />
        </div>
        <div>
          <label class="field-label">Lien du logo</label>
          <input
            :value="headerBuilderState?.logo?.href ?? '/'"
            @input="onHeaderLogoChange({ href: ($event.target as HTMLInputElement).value })"
            type="text" class="field" placeholder="/" />
        </div>
        <div>
          <label class="field-label">Taille du logo</label>
          <select
            :value="headerBuilderState?.logo?.class ?? 'h-10 w-auto max-w-[160px] object-contain'"
            @change="onHeaderLogoChange({ class: ($event.target as HTMLSelectElement).value })"
            class="field"
          >
            <option value="h-8 w-auto max-w-[120px] object-contain">Petit (h-8)</option>
            <option value="h-10 w-auto max-w-[160px] object-contain">Normal (h-10)</option>
            <option value="h-12 w-auto max-w-[200px] object-contain">Grand (h-12)</option>
            <option value="h-14 w-auto max-w-[240px] object-contain">Très grand (h-14)</option>
            <option value="h-16 w-auto max-w-[280px] object-contain">Extra (h-16)</option>
            <option value="h-20 w-auto max-w-[320px] object-contain">XXL (h-20)</option>
            <option value="h-24 w-auto max-w-[360px] object-contain">XXXL (h-24)</option>
          </select>
        </div>
      </fieldset>

      <!-- Top Bar -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Top Bar</legend>
        <div>
          <label class="field-label">Message</label>
          <EditorI18nField
            :model-value="headerBuilderState?.topBar?.message"
            :langs="tenantLangs"
            placeholder="Livraison offerte dès 50€"
            @update:model-value="onHeaderTopBarChange({ message: $event })"
          />
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="headerBuilderState?.topBar?.align === 'center'"
            @change="onHeaderTopBarChange({ align: ($event.target as HTMLInputElement).checked ? 'center' : 'left' })"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">Centrer le message (sinon aligné à gauche)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!headerBuilderState?.topBar?.showLanguages"
            @change="onHeaderTopBarChange({ showLanguages: ($event.target as HTMLInputElement).checked })"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">Afficher le sélecteur de langues</span>
        </label>
        <div v-if="headerBuilderState?.topBar?.showLanguages" class="space-y-1.5 pt-1">
          <div v-for="(lang, i) in headerBuilderState?.topBar?.languages ?? []" :key="i" class="flex items-center gap-1.5">
            <input
              :value="lang.code"
              @input="updateLanguage(i, { code: ($event.target as HTMLInputElement).value })"
              type="text" class="field" style="width: 50px" placeholder="fr" maxlength="3" />
            <EditorI18nField
              :model-value="lang.label"
              :langs="tenantLangs"
              placeholder="Français"
              class="flex-1"
              @update:model-value="updateLanguage(i, { label: $event })"
            />
            <input
              :value="lang.href"
              @input="updateLanguage(i, { href: ($event.target as HTMLInputElement).value })"
              type="text" class="field" style="width: 70px" placeholder="/fr/" />
            <button @click="removeLanguage(i)" class="text-red-400 hover:text-red-600 shrink-0" title="Supprimer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button @click="addLanguage" class="w-full text-xs font-semibold text-primary-600 hover:bg-primary-50 py-1.5 rounded-lg transition-colors">+ Ajouter une langue</button>
        </div>
      </fieldset>

      <!-- Contact -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Contact</legend>
        <div>
          <label class="field-label">Email de contact</label>
          <input
            :value="headerBuilderState?.contactEmail ?? ''"
            @input="onHeaderContactChange(($event.target as HTMLInputElement).value)"
            type="email" class="field" placeholder="contact@exemple.fr" />
        </div>
      </fieldset>

      <!-- Features -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Fonctionnalités</legend>
        <label v-for="feat in headerFeaturesList" :key="feat.key" class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!(headerBuilderState?.features as any)?.[feat.key]"
            @change="onHeaderFeatureChange(feat.key, ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ i18nt(feat.label) }}</span>
        </label>
      </fieldset>

      <!-- Layout & Comportement -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Layout & Comportement</legend>

        <!-- Header Layout -->
        <div>
          <label class="field-label">Layout du header</label>
          <div class="flex gap-2 mt-1">
            <button
              v-for="opt in headerLayoutOptions" :key="opt.value"
              type="button"
              class="flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-colors text-center"
              :class="(headerBuilderState?.features as any)?.headerLayout === opt.value || (!((headerBuilderState?.features as any)?.headerLayout) && opt.value === 'stacked')
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'"
              @click="onHeaderFeatureChange('headerLayout', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mt-1">Inline = logo + menu sur 1 ligne. Stacked = 2 lignes.</p>
        </div>

        <!-- Sticky Header -->
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!(headerBuilderState?.features as any)?.stickyHeader"
            @change="onHeaderFeatureChange('stickyHeader', ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">Header sticky (fixé au scroll)</span>
        </label>
      </fieldset>
    </div>

    <!-- ── Settings Menu (navigation + dropdowns + megamenu) ──────────────── -->
    <div v-else-if="activePanel === 'menu'" class="flex-1 overflow-auto p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🧭 Menu</h3>
        <button @click="addMenuItem" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Item
        </button>
      </div>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        Items de navigation principale. 3 types : <strong>lien simple</strong>, <strong>dropdown plat</strong> ou <strong>mégamenu colonnes</strong>.
        Cliquez sur un item pour l'éditer.
      </p>

      <!-- Level 1 items list -->
      <div v-for="(item, i) in menuItems" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <!-- Header item (collapse toggle + actions) -->
        <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
          <button @click="moveMenuItem(i, i - 1)" :disabled="i === 0" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" /></svg>
          </button>
          <button @click="moveMenuItem(i, i + 1)" :disabled="i === menuItems.length - 1" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <button
            @click="expandedMenuItem = expandedMenuItem === i ? null : i"
            class="flex-1 flex items-center gap-2 px-1 text-left"
          >
            <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(item.label) || '(sans label)' }}</span>
            <span class="text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                  :class="menuItemTypeBadge(item)">
              {{ menuItemTypeLabel(item) }}
            </span>
          </button>
          <button @click="removeMenuItem(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
          <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedMenuItem === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        <!-- Body item (edit) -->
        <div v-if="expandedMenuItem === i" class="p-3 space-y-3">
          <!-- Label -->
          <div>
            <label class="field-label">Libellé affiché</label>
            <EditorI18nField
              :model-value="item.label"
              :langs="tenantLangs"
              placeholder="Nos Produits"
              @update:model-value="updateMenuItem(i, { label: $event })"
            />
          </div>

          <!-- Bubble (text badge above the label, e.g., a highlighted brand name) -->
          <div class="rounded-lg border border-gray-200 p-2 bg-amber-50/40">
            <label class="field-label flex items-center gap-1">
              <span>🔖 Bulle au-dessus</span>
              <span class="text-[9px] font-normal text-gray-400 normal-case tracking-normal">— optionnel</span>
            </label>
            <EditorI18nField
              :model-value="item.badge"
              :langs="tenantLangs"
              placeholder="Alfaliquid"
              @update:model-value="updateMenuItem(i, { badge: $event })"
            />
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label class="text-[10px] font-medium text-gray-500 mb-0.5 block">Fond</label>
                <input
                  type="color"
                  :value="item.badgeBg || '#FFEB3B'"
                  @input="updateMenuItem(i, { badgeBg: ($event.target as HTMLInputElement).value })"
                  class="w-full h-7 rounded border border-gray-200 cursor-pointer"
                />
              </div>
              <div>
                <label class="text-[10px] font-medium text-gray-500 mb-0.5 block">Texte</label>
                <input
                  type="color"
                  :value="item.badgeColor || '#000000'"
                  @input="updateMenuItem(i, { badgeColor: ($event.target as HTMLInputElement).value })"
                  class="w-full h-7 rounded border border-gray-200 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <!-- Selector type -->
          <div>
            <label class="field-label">Type</label>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="t in MENU_TYPES" :key="t.value"
                @click="setMenuItemType(i, t.value)"
                class="text-[10px] font-semibold py-1.5 px-1 rounded-lg border transition-colors"
                :class="menuItemTypeOf(item) === t.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Cas LIEN SIMPLE -->
          <div v-if="menuItemTypeOf(item) === 'link'">
            <label class="field-label">URL</label>
            <input
              :value="item.href ?? ''"
              @input="updateMenuItem(i, { href: ($event.target as HTMLInputElement).value })"
              type="text" class="field" placeholder="/blog ou https://..." />
          </div>

          <!-- Flat dropdown case (1 column without title) -->
          <div v-else-if="menuItemTypeOf(item) === 'dropdown'" class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="field-label !mb-0">Liens du dropdown</label>
              <button @click="addDropdownLink(i)" class="text-[10px] font-semibold text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded">+ Lien</button>
            </div>
            <div v-for="(link, li) in (item.megaMenu?.[0]?.links ?? [])" :key="li" class="border border-gray-100 rounded-lg p-1.5 space-y-1 bg-white">
              <div class="flex items-center gap-1">
                <EditorI18nField
                  :model-value="link.label"
                  :langs="tenantLangs"
                  placeholder="Libellé"
                  class="flex-1"
                  @update:model-value="updateDropdownLink(i, li, { label: $event })"
                />
                <button @click="removeDropdownLink(i, li)" class="text-red-400 hover:text-red-600 shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input
                :value="link.href"
                @input="updateDropdownLink(i, li, { href: ($event.target as HTMLInputElement).value })"
                type="text" class="field w-full !text-[10px] text-gray-400" placeholder="/url" />
              <!-- PS subcategories (one compact line) -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <label class="flex items-center gap-1 cursor-pointer" title="Afficher les sous-catégories PrestaShop sous ce lien">
                  <input
                    type="checkbox"
                    :checked="!!link.showPsChildren"
                    class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    @change="updateDropdownLink(i, li, { showPsChildren: ($event.target as HTMLInputElement).checked })"
                  />
                  <span class="text-[10px] font-medium text-gray-600">Afficher sous-cat.</span>
                </label>
                <input
                  :value="link.psCategoryId ?? ''"
                  @input="updateDropdownLink(i, li, { psCategoryId: Number(($event.target as HTMLInputElement).value) || undefined })"
                  type="number" class="field w-16 !text-[10px] !py-0.5 !px-1" placeholder="cat ID" title="ID catégorie PS" />
                <span v-if="link.showPsChildren && link.psChildren?.length" class="text-[10px] text-violet-600 font-semibold">+{{ link.psChildren.length }}</span>
              </div>
            </div>
            <p v-if="!item.megaMenu?.[0]?.links?.length" class="text-[10px] text-gray-400 text-center py-2">Aucun lien — cliquez sur + Lien</p>
          </div>

          <!-- Megamenu columns case -->
          <div v-else-if="menuItemTypeOf(item) === 'megamenu'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="field-label !mb-0">Colonnes ({{ item.megaMenu?.length ?? 0 }})</label>
              <button @click="addMegaColumn(i)" class="text-[10px] font-semibold text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded">+ Colonne</button>
            </div>

            <div v-for="(col, ci) in item.megaMenu ?? []" :key="ci" class="border border-violet-200 rounded-xl bg-violet-50/30 p-2.5 space-y-2">
              <div class="flex items-center gap-1.5">
                <button @click="moveMegaColumn(i, ci, ci - 1)" :disabled="ci === 0" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                </button>
                <span class="text-[9px] font-bold text-violet-600 uppercase tracking-wider flex-1">Col {{ ci + 1 }}</span>
                <button @click="removeMegaColumn(i, ci)" class="text-red-400 hover:text-red-600">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="flex gap-1.5 items-stretch">
                <!-- Picto : miniature cliquable (path) ou input emoji compact -->
                <div class="shrink-0">
                  <button
                    type="button"
                    :title="col.icon && String(col.icon).startsWith('/')
                      ? 'Remplacer l\'image (clic)'
                      : 'Téléverser une image'"
                    :disabled="megaIconUploading[`${i}:${ci}`]"
                    class="relative h-9 w-9 flex items-center justify-center rounded-lg border border-violet-200 bg-white hover:bg-violet-50 transition-colors disabled:opacity-40"
                    @click="triggerMegaIconUpload(i, ci)"
                  >
                    <img
                      v-if="col.icon && String(col.icon).startsWith('/')"
                      :src="col.icon"
                      alt=""
                      class="h-6 w-6 object-contain"
                    />
                    <span
                      v-else-if="col.icon"
                      class="text-base leading-none"
                      aria-hidden="true"
                    >{{ col.icon }}</span>
                    <svg
                      v-else
                      class="w-3.5 h-3.5 text-violet-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span
                      v-if="megaIconUploading[`${i}:${ci}`]"
                      class="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg"
                    >
                      <svg class="w-3.5 h-3.5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </span>
                  </button>
                  <input
                    :ref="el => { if (el) megaIconFileInputs[`${i}:${ci}`] = el as HTMLInputElement }"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    class="hidden"
                    @change="onMegaIconFileChange(i, ci, $event)"
                  />
                </div>
                <EditorI18nField
                  :model-value="col.title"
                  :langs="tenantLangs"
                  placeholder="Titre de la colonne"
                  class="flex-1"
                  @update:model-value="updateMegaColumn(i, ci, { title: $event })"
                />
              </div>
              <input
                :value="col.icon ?? ''"
                @input="updateMegaColumn(i, ci, { icon: ($event.target as HTMLInputElement).value })"
                type="text"
                class="field w-full !text-[10px] text-gray-400"
                placeholder="🌍 ou /universe/menu-olive.webp"
              />
              <p v-if="megaIconError[`${i}:${ci}`]" class="text-[10px] text-red-600">{{ megaIconError[`${i}:${ci}`] }}</p>
              <div class="space-y-2">
                <div v-for="(link, li) in col.links ?? []" :key="li" class="border border-gray-100 rounded-lg p-1.5 space-y-1 bg-white">
                  <div class="flex items-center gap-1">
                    <EditorI18nField
                      :model-value="link.label"
                      :langs="tenantLangs"
                      placeholder="Libellé"
                      class="flex-1"
                      @update:model-value="updateMegaLink(i, ci, li, { label: $event })"
                    />
                    <button @click="removeMegaLink(i, ci, li)" class="text-red-400 hover:text-red-600 shrink-0">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <input
                    :value="link.href"
                    @input="updateMegaLink(i, ci, li, { href: ($event.target as HTMLInputElement).value })"
                    type="text" class="field w-full !text-[10px] text-gray-400" placeholder="/url" />
                  <!-- Short i18n description (subtitle displayed in the rendered megamenu) -->
                  <EditorI18nField
                    :model-value="link.description"
                    :langs="tenantLangs"
                    placeholder="Description courte (ex: Amandes, dattes, pistaches…)"
                    class="!text-[10px]"
                    @update:model-value="updateMegaLink(i, ci, li, { description: $event })"
                  />
                  <!-- PS subcategories (one compact line) -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <label class="flex items-center gap-1 cursor-pointer" title="Afficher les sous-catégories PrestaShop sous ce lien">
                      <input
                        type="checkbox"
                        :checked="!!link.showPsChildren"
                        class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        @change="updateMegaLink(i, ci, li, { showPsChildren: ($event.target as HTMLInputElement).checked })"
                      />
                      <span class="text-[10px] font-medium text-gray-600">Afficher sous-cat.</span>
                    </label>
                    <input
                      :value="link.psCategoryId ?? ''"
                      @input="updateMegaLink(i, ci, li, { psCategoryId: Number(($event.target as HTMLInputElement).value) || undefined })"
                      type="number" class="field w-16 !text-[10px] !py-0.5 !px-1" placeholder="cat ID" title="ID catégorie PS" />
                    <span v-if="link.showPsChildren && link.psChildren?.length" class="text-[10px] text-violet-600 font-semibold">+{{ link.psChildren.length }}</span>
                  </div>
                </div>
                <button @click="addMegaLink(i, ci)" class="w-full text-[10px] font-semibold text-primary-600 hover:bg-primary-50 py-1 rounded">+ Lien</button>
              </div>
            </div>
            <p v-if="!item.megaMenu?.length" class="text-[10px] text-gray-400 text-center py-2">Aucune colonne — cliquez sur + Colonne</p>
          </div>
        </div>
      </div>

      <p v-if="!menuItems.length" class="text-xs text-gray-400 text-center py-6">Aucun item — cliquez sur + Item</p>
    </div>

    <!-- ── Footer Settings ─────────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'footer'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🦶 Footer</h3>

      <!-- Identity -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Identité</legend>
        <div>
          <label class="field-label">Description</label>
          <EditorI18nField
            :model-value="footerBuilderState?.description"
            :langs="tenantLangs"
            type="textarea"
            placeholder="Votre entreprise en quelques mots…"
            @update:model-value="onFooterFieldChange({ description: $event })"
          />
        </div>
        <div>
          <label class="field-label">Horaires</label>
          <EditorI18nField
            :model-value="footerBuilderState?.hours"
            :langs="tenantLangs"
            type="textarea"
            placeholder="Lun–Ven : 9h–18h"
            @update:model-value="onFooterFieldChange({ hours: $event })"
          />
        </div>
        <div>
          <label class="field-label">Thème footer</label>
          <select
            :value="footerBuilderState?.theme ?? 'light'"
            @change="onFooterFieldChange({ theme: ($event.target as HTMLSelectElement).value })"
            class="field"
          >
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </div>
      </fieldset>

      <!-- Contact -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Contact</legend>
        <div>
          <label class="field-label">Email</label>
          <input
            :value="footerBuilderState?.contact?.email ?? ''"
            @input="onFooterContactChange({ email: ($event.target as HTMLInputElement).value })"
            type="email" class="field" placeholder="contact@exemple.fr" />
        </div>
        <div>
          <label class="field-label">Téléphone</label>
          <input
            :value="footerBuilderState?.contact?.phone ?? ''"
            @input="onFooterContactChange({ phone: ($event.target as HTMLInputElement).value })"
            type="text" class="field" placeholder="+33 3 XX XX XX XX" />
        </div>
        <div>
          <label class="field-label">Adresse</label>
          <textarea
            :value="footerBuilderState?.contact?.address ?? ''"
            @input="onFooterContactChange({ address: ($event.target as HTMLTextAreaElement).value })"
            rows="2" class="field resize-none" placeholder="1 Rue de la Paix, 57000 Metz" />
        </div>
      </fieldset>

      <!-- Bottom bar -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Barre basse</legend>
        <div>
          <label class="field-label">Copyright</label>
          <EditorI18nField
            :model-value="footerBuilderState?.bottomBar?.copyright"
            :langs="tenantLangs"
            placeholder="© 2026 Mon Entreprise"
            @update:model-value="onFooterBottomBarChange({ copyright: $event })"
          />
        </div>
      </fieldset>

      <!-- Social media -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Réseaux sociaux</legend>
        <div
          v-for="(s, si) in footerSocialList"
          :key="si"
          class="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
        >
          <select
            :value="s.platform"
            @change="updateSocialItem(si, { platform: ($event.target as HTMLSelectElement).value as any })"
            class="field !w-24 !py-1 !text-[10px]"
          >
            <option v-for="p in SOCIAL_PLATFORMS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <input
            :value="s.href"
            @input="updateSocialItem(si, { href: ($event.target as HTMLInputElement).value })"
            type="url" class="field flex-1 !py-1" placeholder="https://..."
          />
          <button @click="removeSocialItem(si)" class="text-red-400 hover:text-red-600 shrink-0" title="Supprimer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          @click="addSocialItem"
          class="w-full text-[10px] font-semibold py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          + Réseau social
        </button>
      </fieldset>

      <!-- Newsletter -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Newsletter</legend>
        <label class="flex items-center justify-between gap-2 cursor-pointer">
          <span class="text-xs font-medium text-gray-700">Activer le formulaire (sous les réseaux sociaux)</span>
          <input
            type="checkbox"
            :checked="!!footerBuilderState?.newsletter?.show"
            @change="onFooterNewsletterChange({ show: ($event.target as HTMLInputElement).checked })"
            class="w-4 h-4 accent-primary-600 cursor-pointer"
          />
        </label>
        <template v-if="footerBuilderState?.newsletter?.show">
          <div>
            <label class="field-label">Titre</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.title"
              :langs="tenantLangs"
              placeholder="Newsletter"
              @update:model-value="onFooterNewsletterChange({ title: $event })"
            />
          </div>
          <div>
            <label class="field-label">Accroche</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.description"
              :langs="tenantLangs"
              type="textarea"
              placeholder="Restez informé de nos arrivages…"
              @update:model-value="onFooterNewsletterChange({ description: $event })"
            />
          </div>
          <div>
            <label class="field-label">Placeholder champ email</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.placeholder"
              :langs="tenantLangs"
              placeholder="Votre adresse email"
              @update:model-value="onFooterNewsletterChange({ placeholder: $event })"
            />
          </div>
          <div>
            <label class="field-label">Libellé bouton</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.ctaLabel"
              :langs="tenantLangs"
              placeholder="S'inscrire"
              @update:model-value="onFooterNewsletterChange({ ctaLabel: $event })"
            />
          </div>
          <div>
            <label class="field-label">Texte de consentement (RGPD — obligatoire)</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.consentText"
              :langs="tenantLangs"
              type="textarea"
              placeholder="J'accepte de recevoir la newsletter et confirme avoir pris connaissance de la politique de confidentialité."
              @update:model-value="onFooterNewsletterChange({ consentText: $event })"
            />
            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">
              Ce texte est snapshoté à chaque inscription pour tracer le consentement (article 7 RGPD). Sans valeur, le formulaire est désactivé côté front.
            </p>
          </div>
        </template>
      </fieldset>

      <!-- Colonnes de liens (DB) -->
      <fieldset v-if="isDbSections" class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Colonnes de liens</legend>
        <p v-if="footerColumnsLoading" class="text-[10px] text-gray-400 text-center py-2">Chargement…</p>
        <template v-else>
          <div
            v-for="(col, ci) in footerColumnsList"
            :key="ci"
            class="border border-gray-100 rounded-lg p-2 space-y-1.5"
          >
            <div class="flex items-center gap-2">
              <input
                :value="col.title"
                @input="updateColumnTitle(ci, ($event.target as HTMLInputElement).value)"
                class="field flex-1 !py-1 !text-[10px] font-semibold" placeholder="Titre colonne"
              />
              <button @click="removeColumn(ci)" class="text-red-400 hover:text-red-600 shrink-0" title="Supprimer la colonne">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              v-for="(link, li) in col.links"
              :key="link.id"
              class="flex items-center gap-1.5 pl-2"
            >
              <input
                :value="link.label"
                @input="updateFooterLink(ci, li, { label: ($event.target as HTMLInputElement).value })"
                class="field flex-1 !py-0.5 !text-[10px]" placeholder="Libellé"
              />
              <input
                :value="link.href"
                @input="updateFooterLink(ci, li, { href: ($event.target as HTMLInputElement).value })"
                class="field flex-1 !py-0.5 !text-[10px]" placeholder="/page/..."
              />
              <button @click="removeFooterLink(ci, li)" class="text-red-300 hover:text-red-500 shrink-0">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addFooterLink(ci)"
              class="w-full text-[9px] font-medium py-1 rounded border border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
            >
              + Lien
            </button>
          </div>
          <button
            @click="addColumn"
            class="w-full text-[10px] font-semibold py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            + Colonne
          </button>
          <p v-if="footerColumnsDirty" class="text-[10px] font-medium text-amber-600 italic mt-1 text-center">Modifié — Enregistrer en bas ↓</p>
        </template>
      </fieldset>
    </div>

    <!-- ── Theme Settings ──────────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'theme'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🎨 Thème</h3>

      <!-- Couleurs -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Couleurs</legend>
        <div v-for="col in themeColorsList" :key="col.key" class="flex items-center gap-3">
          <input
            type="color"
            :value="(themeBuilderState?.colors as any)?.[col.key] ?? '#000000'"
            @input="onThemeColorChange(col.key, ($event.target as HTMLInputElement).value)"
            class="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0"
            :title="col.label"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-700">{{ col.label }}</p>
            <input
              type="text"
              :value="(themeBuilderState?.colors as any)?.[col.key] ?? ''"
              @input="onThemeColorChange(col.key, ($event.target as HTMLInputElement).value)"
              class="field mt-0.5" placeholder="#000000" />
          </div>
        </div>
      </fieldset>

      <!-- Typographie -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Typographie</legend>
        <div>
          <label class="field-label">Police (CSS)</label>
          <input
            :value="themeBuilderState?.typography?.fontFamily ?? ''"
            @input="onThemeTypoChange('fontFamily', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Montserrat, sans-serif" />
        </div>
        <div>
          <label class="field-label">URL Google Fonts</label>
          <input
            :value="themeBuilderState?.typography?.fontUrl ?? ''"
            @input="onThemeTypoChange('fontUrl', ($event.target as HTMLInputElement).value)"
            type="url" class="field" placeholder="https://fonts.googleapis.com/..." />
        </div>
      </fieldset>

      <!-- UI -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Interface</legend>
        <div>
          <label class="field-label">Rayon des éléments</label>
          <div class="flex flex-wrap gap-1.5 mt-1">
            <button
              v-for="r in radiusOptions"
              :key="r.value"
              @click="onThemeUiChange('borderRadius', r.value)"
              :class="[
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                themeBuilderState?.ui?.borderRadius === r.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-600 hover:border-primary-300',
              ]"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="themeBuilderState?.ui?.shadow !== false"
            @change="onThemeUiChange('shadow', ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">Activer les ombres portées</span>
        </label>
        <div>
          <label class="field-label">Largeur colonne centrale</label>
          <div class="flex flex-wrap gap-1.5 mt-1">
            <button
              v-for="cw in contentWidthOptions"
              :key="cw.value"
              @click="onThemeUiChange('contentWidth', cw.value)"
              :class="[
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                (themeBuilderState?.ui?.contentWidth ?? '6xl') === cw.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-600 hover:border-primary-300',
              ]"
            >
              {{ cw.label }}
            </button>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- ── Homepage : Hero ─────────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:hero'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🦸 Hero</h3>

      <!-- Layout -->
      <div>
        <label class="field-label">Layout</label>
        <select :value="hpDb.hero?.layout ?? 'banner'" @change="onHpHeroChange({ layout: ($event.target as HTMLSelectElement).value as any })" class="field">
          <option value="banner">Banner (image de fond)</option>
          <option value="portfolio">Portfolio (texte + photo)</option>
        </select>
      </div>

      <div>
        <label class="field-label">Titre (HTML autorisé)</label>
        <EditorI18nField :model-value="hpDb.hero?.title" :langs="tenantLangs" type="textarea" placeholder="Titre principal"
          @update:model-value="onHpHeroChange({ title: $event })" />
      </div>
      <div>
        <label class="field-label">Sous-titre</label>
        <EditorI18nField :model-value="hpDb.hero?.subtitle" :langs="tenantLangs" type="textarea" placeholder="Description courte"
          @update:model-value="onHpHeroChange({ subtitle: $event })" />
      </div>

      <!-- Badge (portfolio) -->
      <div v-if="hpDb.hero?.layout === 'portfolio'">
        <label class="field-label">Badge de statut</label>
        <EditorI18nField :model-value="hpDb.hero?.badge" :langs="tenantLangs" placeholder="Disponible pour nouveaux projets"
          @update:model-value="onHpHeroChange({ badge: $event })" />
      </div>

      <!-- Tags (portfolio) -->
      <div v-if="hpDb.hero?.layout === 'portfolio'">
        <label class="field-label">Tags / Compétences (séparés par des virgules)</label>
        <input
          :value="(hpDb.hero?.tags ?? []).join(', ')"
          @input="onHpHeroChange({ tags: ($event.target as HTMLInputElement).value.split(',').map((s: string) => s.trim()).filter(Boolean) })"
          type="text" class="field" placeholder="PrestaShop, Nuxt 3, Docker" />
      </div>

      <div>
        <label class="field-label">{{ hpDb.hero?.layout === 'portfolio' ? 'Photo portrait' : 'Image de fond' }}</label>
        <div class="flex gap-1.5">
          <input :value="hpDb.hero?.image ?? ''" @input="onHpHeroChange({ image: ($event.target as HTMLInputElement).value })"
            type="url" class="field flex-1" placeholder="https://… ou upload →" />
          <button
            type="button"
            @click="hpHeroUploadInput?.click()"
            :disabled="hpHeroUploading"
            class="text-[11px] font-semibold px-2.5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-1"
            title="Uploader une image"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5 7.5 12M12 7.5v12" /></svg>
            {{ hpHeroUploading ? '…' : 'Upload' }}
          </button>
          <input ref="hpHeroUploadInput" type="file" accept="image/*" class="hidden" @change="onHpHeroUpload" />
        </div>
        <p v-if="hpHeroUploadError" class="mt-1 text-[11px] text-red-600">{{ hpHeroUploadError }}</p>
        <div v-if="hpDb.hero?.image" class="mt-1.5 rounded-lg overflow-hidden border border-gray-200 h-20">
          <img :src="hpDb.hero.image" alt="preview" class="w-full h-full object-cover" />
        </div>
      </div>

      <!-- Link on banner click -->
      <div v-if="hpDb.hero?.layout !== 'portfolio'">
        <label class="field-label">Lien au clic sur la bannière (optionnel)</label>
        <input :value="hpDb.hero?.imageHref ?? ''" @input="onHpHeroChange({ imageHref: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="/promotions ou https://..." />
        <p class="mt-0.5 text-[10px] text-gray-400">Si renseigné, l'utilisateur clique n'importe où sur l'image et est redirigé. Le CTA reste cliquable indépendamment.</p>
      </div>

      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">CTA Principal</legend>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Label</label>
            <EditorI18nField :model-value="hpDb.hero?.cta?.label" :langs="tenantLangs" placeholder="Découvrir"
              @update:model-value="onHpHeroChange({ cta: { ...(hpDb.hero?.cta ?? {}), label: $event, href: hpDb.hero?.cta?.href ?? '/' } })" />
          </div>
          <div>
            <label class="field-label">Lien</label>
            <input
              :value="hpDb.hero?.cta?.href ?? ''"
              @input="onHpHeroChange({ cta: { ...(hpDb.hero?.cta ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.hero?.cta?.label ?? '' } })"
              type="text" class="field" placeholder="/catalogue/..." />
          </div>
        </div>
      </fieldset>

      <!-- CTA 2 (portfolio) -->
      <fieldset v-if="hpDb.hero?.layout === 'portfolio'" class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">CTA Secondaire</legend>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">Label</label>
            <EditorI18nField :model-value="hpDb.hero?.cta2?.label" :langs="tenantLangs" placeholder="En savoir plus →"
              @update:model-value="onHpHeroChange({ cta2: { ...(hpDb.hero?.cta2 ?? {}), label: $event, href: hpDb.hero?.cta2?.href ?? '/' } })" />
          </div>
          <div>
            <label class="field-label">Lien</label>
            <input
              :value="hpDb.hero?.cta2?.href ?? ''"
              @input="onHpHeroChange({ cta2: { ...(hpDb.hero?.cta2 ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.hero?.cta2?.label ?? '' } })"
              type="text" class="field" placeholder="/blog" />
          </div>
        </div>
      </fieldset>
    </div>

    <!-- ── Homepage : Atouts ───────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:features'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">✨ Atouts</h3>
        <button @click="onHpAddFeature" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ajouter
        </button>
      </div>
      <div v-for="(feat, i) in hpDb.features ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atout {{ i + 1 }}</span>
          <button @click="onHpRemoveFeature(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <select :value="feat.icon" @change="onHpUpdateFeature(i, { icon: ($event.target as HTMLSelectElement).value as any })" class="field">
          <option v-for="ico in FEATURE_ICONS" :key="ico.value" :value="ico.value">{{ ico.label }}</option>
        </select>
        <EditorI18nField :model-value="feat.label" :langs="tenantLangs" placeholder="Label" @update:model-value="onHpUpdateFeature(i, { label: $event })" />
        <EditorI18nField :model-value="feat.description" :langs="tenantLangs" placeholder="Description" @update:model-value="onHpUpdateFeature(i, { description: $event })" />
      </div>
      <p v-if="!hpDb.features?.length" class="text-xs text-gray-400 text-center py-4">Aucun atout — cliquez sur Ajouter</p>
    </div>

    <!-- ── Homepage: Categories ───────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:categories'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">🗂️ Catégories</h3>
        <button @click="onHpAddCategory" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ajouter
        </button>
      </div>
      <div v-for="(cat, i) in hpDb.categories ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cat. {{ i + 1 }}</span>
          <button @click="onHpRemoveCategory(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <EditorI18nField :model-value="cat.label" :langs="tenantLangs" placeholder="Nom de la catégorie" @update:model-value="onHpUpdateCategory(i, { label: $event })" />
        <input :value="cat.image" @input="onHpUpdateCategory(i, { image: ($event.target as HTMLInputElement).value })" type="url" class="field" placeholder="URL de l'image" />
        <input :value="cat.href" @input="onHpUpdateCategory(i, { href: ($event.target as HTMLInputElement).value })" type="text" class="field" placeholder="/catalogue/..." />
        <div v-if="cat.image" class="rounded-lg overflow-hidden border border-gray-200 h-16">
          <img :src="cat.image" :alt="cat.label" class="w-full h-full object-cover" />
        </div>
      </div>
      <p v-if="!hpDb.categories?.length" class="text-xs text-gray-400 text-center py-4">Aucune catégorie — cliquez sur Ajouter</p>
    </div>

    <!-- ── Homepage: Testimonials ────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:testimonials'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">⭐ Témoignages</h3>
        <button @click="onHpAddTestimonial" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ajouter
        </button>
      </div>
      <div v-for="(t, i) in hpDb.testimonials ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Témoignage {{ i + 1 }}</span>
          <button @click="onHpRemoveTestimonial(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <input :value="t.author" @input="onHpUpdateTestimonial(i, { author: ($event.target as HTMLInputElement).value })" type="text" class="field" placeholder="Auteur" />
        <input :value="t.role ?? ''" @input="onHpUpdateTestimonial(i, { role: ($event.target as HTMLInputElement).value })" type="text" class="field" placeholder="Rôle / Entreprise" />
        <textarea :value="t.text" @input="onHpUpdateTestimonial(i, { text: ($event.target as HTMLTextAreaElement).value })" rows="3" class="field resize-none" placeholder="Témoignage…" />
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-semibold text-gray-500">Note :</span>
          <button v-for="star in 5" :key="star" @click="onHpUpdateTestimonial(i, { rating: star })" class="text-sm" :class="star <= (t.rating ?? 5) ? 'text-amber-400' : 'text-gray-300'">★</button>
        </div>
      </div>
      <p v-if="!hpDb.testimonials?.length" class="text-xs text-gray-400 text-center py-4">Aucun témoignage — cliquez sur Ajouter</p>
    </div>

    <!-- ── Homepage: About ───────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:about'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">👤 À propos</h3>
      <div>
        <label class="field-label">Titre</label>
        <input :value="hpDb.about?.title ?? ''" @input="onHpAboutChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="Titre section" />
      </div>
      <div>
        <label class="field-label">Sous-titre</label>
        <input :value="hpDb.about?.subtitle ?? ''" @input="onHpAboutChange({ subtitle: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="Sous-titre / rôle" />
      </div>
      <div>
        <label class="field-label">Paragraphes (un par ligne)</label>
        <textarea
          :value="(hpDb.about?.paragraphs ?? []).join('\n\n')"
          @input="onHpAboutChange({ paragraphs: ($event.target as HTMLTextAreaElement).value.split('\n\n').filter(Boolean) })"
          rows="8" class="field resize-none" placeholder="Paragraphe 1&#10;&#10;Paragraphe 2" />
      </div>
      <div>
        <label class="field-label">Image (URL)</label>
        <input :value="hpDb.about?.image ?? ''" @input="onHpAboutChange({ image: ($event.target as HTMLInputElement).value })"
          type="url" class="field" placeholder="https://..." />
      </div>
      <div>
        <label class="field-label">Embed Google Maps (URL iframe)</label>
        <input :value="hpDb.about?.mapEmbed ?? ''" @input="onHpAboutChange({ mapEmbed: ($event.target as HTMLInputElement).value })"
          type="url" class="field" placeholder="https://www.google.com/maps/embed?..." />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="field-label">Bouton CTA</label>
          <input
            :value="hpDb.about?.cta?.label ?? ''"
            @input="onHpAboutChange({ cta: { ...(hpDb.about?.cta ?? {}), label: ($event.target as HTMLInputElement).value, href: hpDb.about?.cta?.href ?? '/' } })"
            type="text" class="field" placeholder="Label" />
        </div>
        <div>
          <label class="field-label">Lien CTA</label>
          <input
            :value="hpDb.about?.cta?.href ?? ''"
            @input="onHpAboutChange({ cta: { ...(hpDb.about?.cta ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.about?.cta?.label ?? '' } })"
            type="text" class="field" placeholder="/contact" />
        </div>
      </div>
    </div>

    <!-- ── Homepage : Blog ───────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:blog'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">📝 Blog</h3>
      <div>
        <label class="field-label">Titre de la section</label>
        <input :value="hpDb.blog?.title ?? 'Derniers articles'" @input="onHpBlogChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="Derniers articles" />
      </div>
      <div>
        <label class="field-label">Nombre d'articles</label>
        <select :value="hpDb.blog?.limit ?? 3" @change="onHpBlogChange({ limit: Number(($event.target as HTMLSelectElement).value) })" class="field">
          <option value="3">3 articles</option>
          <option value="4">4 articles</option>
          <option value="6">6 articles</option>
          <option value="9">9 articles</option>
        </select>
      </div>
    </div>

    <!-- ── Homepage : FAQ ────────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:faq'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">❓ FAQ</h3>
      <div>
        <label class="field-label">Titre</label>
        <input :value="hpDb.faq?.title ?? 'Questions Fréquentes'" @input="onHpFaqChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="Questions Fréquentes" />
      </div>
      <div>
        <label class="field-label">Sous-titre</label>
        <input :value="hpDb.faq?.subtitle ?? ''" @input="onHpFaqChange({ subtitle: ($event.target as HTMLInputElement).value })"
          type="text" class="field" placeholder="Sous-titre optionnel" />
      </div>
      <p class="text-[10px] text-gray-400">Les questions sont chargées depuis <code class="bg-gray-100 px-1 rounded">data/faq.json</code></p>
    </div>

    <!-- ── Homepage : Malt ───────────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:malt'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🟠 Carte Malt</h3>
      <p class="text-xs text-gray-500">Affiche la carte profil Malt avec les avis et statistiques.</p>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="hpDb.malt?.show !== false"
          @change="onHpMaltChange(($event.target as HTMLInputElement).checked)"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
        />
        <span class="text-xs text-gray-700">Afficher la carte Malt</span>
      </label>
    </div>

    <!-- ── Category: Cover & SEO ────────────────────────────────────────── -->
    <!-- ── Category sections ──────────────────────────────────── -->
    <div v-else-if="activePanel === 'silo:hero'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">🗂️ Sections catégories</h3>
      <p class="text-[10px] text-gray-400 -mt-2 truncate">{{ contextPayload.label }} — /grossiste/{{ contextPayload.path }}/</p>

      <!-- Hero -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Hero</legend>
        <div>
          <label class="field-label">H1</label>
          <input
            :value="editorSiloState.h1 ?? ''"
            @input="updateSiloField('h1', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Grossiste fruits secs en gros" />
        </div>
        <div>
          <label class="field-label">Description courte (intro)</label>
          <textarea
            :value="editorSiloState.intro_html ?? ''"
            @input="updateSiloField('intro_html', ($event.target as HTMLTextAreaElement).value)"
            rows="3" class="field resize-none" placeholder="Texte d'accroche sous le H1…" />
        </div>
        <div>
          <label class="field-label">Image catégorie (URL)</label>
          <input
            :value="editorSiloState.image_path ?? ''"
            @input="updateSiloField('image_path', ($event.target as HTMLInputElement).value)"
            type="url" class="field" placeholder="/example-shop/silo/fruits-secs.webp" />
        </div>
        <div v-if="editorSiloState.image_path" class="rounded-lg overflow-hidden border border-gray-200 h-20">
          <img :src="editorSiloState.image_path" alt="preview" class="w-full h-full object-cover" />
        </div>
        <div>
          <label class="field-label">Alt image</label>
          <input
            :value="editorSiloState.image_alt ?? ''"
            @input="updateSiloField('image_alt', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Fruits secs en gros" />
        </div>
      </fieldset>

      <!-- Liaison PrestaShop -->
      <fieldset class="border border-blue-200 rounded-xl p-3 space-y-2 bg-blue-50/30">
        <legend class="text-[10px] font-bold text-blue-500 uppercase tracking-wider px-1">Liaison PS</legend>
        <div>
          <label class="field-label">Slug URL</label>
          <input
            :value="editorSiloState.slug ?? ''"
            @input="updateSiloField('slug', ($event.target as HTMLInputElement).value)"
            type="text" class="field !text-[11px]" placeholder="snack" />
          <p class="text-[9px] text-gray-400 mt-0.5">Dernier segment de l'URL : /grossiste/<strong>{{ editorSiloState.slug || '…' }}</strong>/</p>
        </div>
        <div>
          <label class="field-label">ID Catégorie PS</label>
          <div class="flex items-center gap-2">
            <input
              :value="editorSiloState.id_category ?? ''"
              @input="updateSiloField('id_category', ($event.target as HTMLInputElement).value)"
              type="number" class="field w-20" placeholder="ID" />
            <span v-if="editorSiloState.id_category" class="text-[9px] text-blue-600 font-medium">Cat. #{{ editorSiloState.id_category }}</span>
            <span v-else class="text-[9px] text-gray-400">Aucune catégorie liée</span>
          </div>
          <p class="text-[9px] text-gray-400 mt-0.5">Les produits affichés viennent de ps_category_product (PS natif).</p>
        </div>
        <!-- Bouton sync produits -->
        <div v-if="editorSiloState.id_category">
          <button
            @click="syncSiloProducts"
            :disabled="siloSyncBusy"
            class="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold rounded-lg transition-colors"
            :class="siloSyncBusy ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'"
          >
            <svg v-if="!siloSyncBusy" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            {{ siloSyncBusy ? 'Synchronisation…' : 'Synchroniser les produits' }}
          </button>
          <p v-if="siloSyncResult" class="text-[9px] mt-1 font-medium" :class="siloSyncResult.added > 0 ? 'text-green-600' : 'text-gray-500'">
            {{ siloSyncResult.added > 0 ? `+${siloSyncResult.added} produits ajoutés` : 'Déjà à jour' }} ({{ siloSyncResult.after }} total)
          </p>
        </div>
      </fieldset>

      <!-- SEO -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">SEO</legend>
        <div>
          <label class="field-label">Title SEO</label>
          <input
            :value="editorSiloState.meta_title ?? ''"
            @input="updateSiloField('meta_title', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Grossiste fruits secs en gros — Example Shop" />
        </div>
        <div>
          <label class="field-label">Méta description</label>
          <textarea
            :value="editorSiloState.meta_description ?? ''"
            @input="updateSiloField('meta_description', ($event.target as HTMLTextAreaElement).value)"
            rows="3" class="field resize-none" placeholder="Description SEO…" />
        </div>
      </fieldset>

      <!-- Page sections -->
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-1.5">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Composants</legend>
        <p class="text-[9px] text-gray-400 leading-relaxed mb-1">
          Activez/désactivez les sections de la page catégorie. Les sections conditionnelles (orange) nécessitent des données en DB.
        </p>
        <div
          v-for="comp in SILO_COMPONENTS"
          :key="comp.id"
          class="flex items-center gap-2 p-2 rounded-lg border bg-white group transition-all"
          :class="isSiloSectionActive(comp.id) ? 'border-gray-200 hover:border-primary-300' : 'border-dashed border-gray-300 opacity-50'"
        >
          <span class="text-sm select-none">{{ comp.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold" :class="isSiloSectionActive(comp.id) ? 'text-gray-700' : 'text-gray-400'">{{ comp.label }}</p>
            <p class="text-[9px] text-gray-400 truncate">{{ comp.desc }}</p>
          </div>
          <span
            v-if="comp.conditional"
            class="text-amber-400"
            title="Conditionnel (données requises)"
          >
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" /></svg>
          </span>
          <button
            @click.stop="toggleSiloSection(comp.id)"
            class="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
            :class="isSiloSectionActive(comp.id) ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
            :title="isSiloSectionActive(comp.id) ? 'Désactiver' : 'Activer'"
          >
            <svg v-if="isSiloSectionActive(comp.id)" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
      </fieldset>

      <p v-if="siloFieldsDirty" class="text-[10px] font-medium text-amber-600 italic text-center">Modifié — Enregistrer en bas ↓</p>
    </div>

    <!-- ── Homepage: Visibility ──────────────────────────────────────────── -->
    <div v-else-if="activePanel === 'homepage:visibility'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        👁️ Affichage conditionnel
        <span class="text-xs font-normal text-violet-600">— {{ sectionMeta(visibilityEditType!).label }}</span>
      </h3>

      <p class="text-[10px] text-gray-500 leading-relaxed">
        Contrôlez quels types de visiteurs voient cette section. L'IA classe chaque visiteur automatiquement.
      </p>

      <!-- Mode show/hide -->
      <fieldset class="border border-violet-200 rounded-xl p-3 space-y-2 bg-violet-50/30">
        <legend class="text-[10px] font-bold text-violet-500 uppercase tracking-wider px-1">Mode</legend>
        <div class="flex gap-2">
          <button
            v-for="m in [{ value: 'show', label: 'Visible pour', desc: 'Uniquement ces avatars' }, { value: 'hide', label: 'Caché pour', desc: 'Tous sauf ces avatars' }]"
            :key="m.value"
            @click="visibilityRule.mode = m.value as 'show' | 'hide'"
            :class="[
              'flex-1 p-2 rounded-lg border text-xs font-medium transition-all',
              visibilityRule.mode === m.value
                ? 'bg-violet-600 text-white border-violet-600'
                : 'border-gray-200 text-gray-600 hover:border-violet-300',
            ]"
          >
            <div class="font-semibold">{{ m.label }}</div>
            <div class="text-[9px] opacity-70">{{ m.desc }}</div>
          </button>
        </div>
      </fieldset>

      <!-- Avatar selection -->
      <fieldset class="border border-violet-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-violet-500 uppercase tracking-wider px-1">Avatars</legend>
        <p class="text-[10px] text-gray-400">Vide = tout le monde voit la section</p>
        <label
          v-for="avatarType in AC_HUB_AVATARS"
          :key="avatarType"
          class="flex items-center gap-2.5 cursor-pointer py-1 select-none"
        >
          <input
            type="checkbox"
            :checked="visibilityRule.avatars.includes(avatarType)"
            @change="toggleAvatarInRule(avatarType)"
            class="rounded border-gray-300 text-violet-600 focus:ring-violet-400"
          />
          <span class="text-base leading-none">{{ AVATAR_META[avatarType].icon }}</span>
          <span class="text-xs text-gray-700">{{ AVATAR_META[avatarType].label }}</span>
        </label>
      </fieldset>

      <!-- Rule preview -->
      <div v-if="visibilityRule.avatars.length > 0" class="text-[10px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
        {{ formatVisibilityLabel(visibilityRule) }}
      </div>
      <div v-else class="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        Tout le monde voit cette section
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          @click="saveVisibilityRule"
          class="flex-1 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
        >
          Appliquer
        </button>
        <button
          @click="clearVisibilityRule"
          class="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl transition-colors"
        >
          Effacer
        </button>
      </div>
    </div>

    <!-- ── Save footer (unified — Phase 2 UX 2026-05-08) ───────────────────── -->
    <div class="p-4 border-t border-gray-100 shrink-0 bg-gray-50">
      <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
        <p v-if="saveStatus === 'ok'" class="text-xs text-green-600 font-medium mb-2 text-center">✓ Sauvegardé !</p>
        <p v-else-if="saveStatus === 'error'" class="text-xs text-red-500 font-medium mb-2 text-center">✗ Erreur de sauvegarde</p>
      </Transition>
      <button
        @click="saveAll"
        :disabled="globalSaving || !globalDirty"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="globalSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <template v-if="globalSaving">Enregistrement…</template>
        <template v-else-if="globalDirty">Enregistrer<span v-if="globalDirtyCount > 1" class="ml-1 px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">{{ globalDirtyCount }} domaines</span></template>
        <template v-else>À jour</template>
      </button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { SECTION_META, FEATURE_ICONS, useEditorState, useDbHomepageSections, useDbFooterColumns, useEditorSilo, useEditorSiloSections } from '~/composables/useEditorState'
import type { SectionType, DbHomepageSection, DbFooterColumn, DbFooterLink, EditorSiloData } from '~/composables/useEditorState'
import { AVATAR_META, AC_HUB_AVATARS, formatVisibilityLabel, DEFAULT_VISIBILITY_RULE } from '~/utils/avatar'
import type { SectionVisibilityRule, AvatarType } from '~/types/avatar'
import type { ClientLang } from '~/server/api/client-langs.get'

const {
  homepage: hp, sections, activePanel,
  theme: editorTheme, header: editorHeader, footer: editorFooter,
  isDirty, isSaving, saveStatus,
  moveSection, updateSectionVisibility, updateHero,
  addFeature, removeFeature, updateFeature,
  addCategory, removeCategory, updateCategory,
  addTestimonial, removeTestimonial, updateTestimonial,
  updateAbout, updateBlog, updateFaq,
  markDirty,
  updateThemeColor, updateThemeTypography, updateThemeUI,
  updateHeader,
  updateFooter, updateFooterContact, updateFooterBottomBar, updateFooterSocial,
  saveConfig,
} = useEditorState()

const { contextPageId, contextPayload } = useEditorContext()
const { toggleEditMode } = useEditMode()
const { resolvedClientId } = useClientDetection()
const { t: i18nt } = useI18nField()
const route = useRoute()

// ── Sidebar geometry (drag-resize + rail collapsed) ────────────────────
// Shared state via useBuilderGeometry — the white-label.vue layout uses
// the same composable to sync the margin-left of the main content.
// localStorage persistence per device (personal UI preference, not tenant-scoped).
import {
  useBuilderGeometry,
  BUILDER_WIDTH_KEY, BUILDER_COLLAPSED_KEY,
  BUILDER_WIDTH_MIN, BUILDER_WIDTH_MAX,
} from '~/composables/useBuilderGeometry'
const {
  builderWidth, builderCollapsed,
} = useBuilderGeometry()
const isResizing = ref<boolean>(false)
let resizeStartX = 0
let resizeStartWidth = 0

function clampWidth(w: number): number {
  return Math.max(BUILDER_WIDTH_MIN, Math.min(BUILDER_WIDTH_MAX, Math.round(w)))
}

function loadBuilderGeometry() {
  if (!import.meta.client) return
  try {
    const w = Number(localStorage.getItem(BUILDER_WIDTH_KEY))
    if (w >= BUILDER_WIDTH_MIN && w <= BUILDER_WIDTH_MAX) builderWidth.value = w
    builderCollapsed.value = localStorage.getItem(BUILDER_COLLAPSED_KEY) === '1'
  } catch { /* ignore */ }
}
function saveBuilderWidth() {
  if (!import.meta.client) return
  try { localStorage.setItem(BUILDER_WIDTH_KEY, String(builderWidth.value)) } catch { /* ignore */ }
}
function toggleBuilderCollapsed() {
  builderCollapsed.value = !builderCollapsed.value
  if (import.meta.client) {
    try { localStorage.setItem(BUILDER_COLLAPSED_KEY, builderCollapsed.value ? '1' : '0') } catch { /* ignore */ }
  }
}

function onResizeStart(e: MouseEvent) {
  if (builderCollapsed.value) return
  e.preventDefault()
  isResizing.value = true
  resizeStartX = e.clientX
  resizeStartWidth = builderWidth.value
  if (typeof document !== 'undefined') {
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd, { once: true })
  }
}
function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return
  const delta = e.clientX - resizeStartX
  builderWidth.value = clampWidth(resizeStartWidth + delta)
}
function onResizeEnd() {
  if (!isResizing.value) return
  isResizing.value = false
  if (typeof document !== 'undefined') {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onResizeMove)
  }
  saveBuilderWidth()
}

if (import.meta.client) {
  loadBuilderGeometry()
}

// ── Megamenu DB-first ────────────────────────────────────────────────────
const { loadIntoBuilder: loadMegamenu, setBuilderItems: setMegamenuItems, syncToDb: syncMegamenuToDb, builderOverride: megamenuBuilderItems } = useMegamenu()

// ── Theme DB-first ──────────────────────────────────────────────────────
const {
  loadIntoBuilder: loadThemeDb,
  updateColor: updateThemeColorDb,
  updateTypography: updateTypographyDb,
  updateUi: updateUiDb,
  syncToDb: syncThemeToDb,
  builderTheme: themeBuilderState,
} = useThemeDb()
const themeDbLoaded = ref(false)

// ── Footer DB-first ─────────────────────────────────────────────────────
const {
  loadIntoBuilder: loadFooterDb,
  updateFooterField: updateFooterFieldDb,
  updateContact: updateContactDb,
  updateBottomBar: updateBottomBarDb,
  updateNewsletter: updateNewsletterDb,
  setSocial: setSocialDb,
  syncToDb: syncFooterToDb,
  builderFooter: footerBuilderState,
} = useFooterDb()
const footerDbLoaded = ref(false)

// ── Header DB-first ─────────────────────────────────────────────────────
const {
  loadIntoBuilder: loadHeaderDb,
  updateLogo: updateLogoDb,
  updateTopBar: updateTopBarDb,
  updateFeatures: updateFeaturesDb,
  updateContactEmail: updateContactEmailDb,
  syncToDb: syncHeaderToDb,
  builderHeader: headerBuilderState,
} = useHeaderDb()
const headerDbLoaded = ref(false)

// ── Homepage DB-first ───────────────────────────────────────────────────
const {
  loadIntoBuilder: loadHomepageDb,
  updateHero: updateHeroDb,
  updateAbout: updateAboutDb,
  updateBlog: updateBlogDb,
  updateFaq: updateFaqDb,
  setFeatures: setFeaturesDb,
  setCategories: setCategoriesDb,
  setTestimonials: setTestimonialsDb,
  setSections: setSectionsDb,
  syncToDb: syncHomepageToDb,
  builderHomepage: hpBuilderState,
  builderSections: sectionsBuilderState,
} = useHomepageDb()
const homepageDbLoaded = ref(false)

// ── Tenant languages (for I18nField tabs) ─────────────────────────────────
const tenantLangs = ref<ClientLang[]>([{ id_lang: 1, iso_code: 'fr', name: 'Français', is_default: true }])

onMounted(async () => {
  try {
    const res = await $fetch<{ langs: ClientLang[] }>('/api/client-langs')
    if (res?.langs?.length) tenantLangs.value = res.langs
  } catch {
    // Fallback: single-language French (builder functional even without PS module)
  }
  // Load the DB megamenu into the builder state for live editing
  loadMegamenu()
  megamenuLoaded.value = true
  // Load the DB theme into the builder state
  loadThemeDb()
  themeDbLoaded.value = true
  // Load the DB header into the builder state
  loadHeaderDb()
  headerDbLoaded.value = true
  // Load the DB footer into the builder state
  loadFooterDb()
  footerDbLoaded.value = true
  // Load the DB homepage
  loadHomepageDb()
  homepageDbLoaded.value = true
})

// ── Save all (config + megamenu DB) ─────────────────────────────────────────
async function saveAll() {
  // All domains DB-first sync in parallel. Each specific save is
  // tracked conditionally by its own dirty flag — we only write what
  // has actually changed. Phase 2 UX (2026-05-08): a single "Save" button
  // sticky bottom replaces the ~10 intra-panel saves scattered across.
  await Promise.all([
    saveConfig(),
    megamenuLoaded.value ? syncMegamenuToDb() : Promise.resolve(),
    themeDbLoaded.value ? syncThemeToDb() : Promise.resolve(),
    headerDbLoaded.value ? syncHeaderToDb() : Promise.resolve(),
    footerDbLoaded.value ? syncFooterToDb() : Promise.resolve(),
    homepageDbLoaded.value ? syncHomepageToDb() : Promise.resolve(),
    dbSectionsDirty.value ? saveDbSections() : Promise.resolve(),
    sectionPayloadDirty.value ? saveSectionPayload() : Promise.resolve(),
    pfSectionsDirty.value ? savePfSections() : Promise.resolve(),
    pfPayloadDirty.value ? savePfSectionPayload() : Promise.resolve(),
    siloFieldsDirty.value ? saveSiloFields() : Promise.resolve(),
    footerColumnsDirty.value ? saveFooterColumns() : Promise.resolve(),
  ])
}

// Multi-domain dirty aggregation: the sticky bottom button activates as soon as
// any domain is dirty (not just the standard editor store).
const globalDirty = computed(() =>
  isDirty.value
  || dbSectionsDirty.value
  || sectionPayloadDirty.value
  || pfSectionsDirty.value
  || pfPayloadDirty.value
  || siloFieldsDirty.value
  || footerColumnsDirty.value,
)
const globalDirtyCount = computed(() => {
  let n = 0
  if (isDirty.value) n++
  if (dbSectionsDirty.value) n++
  if (sectionPayloadDirty.value) n++
  if (pfSectionsDirty.value) n++
  if (pfPayloadDirty.value) n++
  if (siloFieldsDirty.value) n++
  if (footerColumnsDirty.value) n++
  return n
})
const globalSaving = computed(() =>
  isSaving.value
  || dbSectionsSaving.value
  || sectionPayloadSaving.value
  || pfSectionsSaving.value
  || pfPayloadSaving.value
  || siloFieldsSaving.value
  || footerColumnsSaving.value,
)

// ── Tenant-aware section resolution ─────────────────────────────────────────
// DB-driven deployments (homepage sections in DB, not in the editor store)
const DB_SECTION_TENANTS = ['example-shop']
const isDbSections = computed(() => DB_SECTION_TENANTS.includes(resolvedClientId.value))

// Helper for SECTION_META lookup with graceful fallback (unknown type)
function sectionMeta(type: string): { label: string; icon: string } {
  return SECTION_META[type] ?? { label: type, icon: '📦' }
}

// ── DB sections state (example deployments and future DB-driven tenants) ──────────────
// useState shared with the index page for real-time live preview
const dbSectionsList = useDbHomepageSections()
const dbSectionsLoading = ref(false)
const dbSectionsDirty = ref(false)
const dbSectionsSaving = ref(false)
const dbSectionsOriginal = ref<string>('')

async function loadDbSections() {
  if (!isDbSections.value) return
  dbSectionsLoading.value = true
  try {
    const res = await $fetch<{ sections: DbHomepageSection[] }>('/api/homepage-sections?all=1')
    dbSectionsList.value = res.sections ?? []
    dbSectionsOriginal.value = JSON.stringify(dbSectionsList.value)
    dbSectionsDirty.value = false
  } catch {
    dbSectionsList.value = []
  } finally {
    dbSectionsLoading.value = false
  }
}

function markDbDirty() {
  dbSectionsDirty.value = JSON.stringify(dbSectionsList.value) !== dbSectionsOriginal.value
}

function moveDbSection(from: number, to: number) {
  const arr = [...dbSectionsList.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  // Position recalculation (multiples of 10)
  arr.forEach((s, i) => { s.position = (i + 1) * 10 })
  dbSectionsList.value = arr
  markDbDirty()
}

function onDbDrop(toIndex: number) {
  if (dragFrom.value !== null && dragFrom.value !== toIndex) {
    moveDbSection(dragFrom.value, toIndex)
  }
  dragFrom.value = null
  dragOver.value = null
}

function toggleDbSection(index: number) {
  const s = dbSectionsList.value[index]
  if (!s) return
  s.active = !s.active
  markDbDirty()
}

async function saveDbSections() {
  dbSectionsSaving.value = true
  try {
    await $fetch('/api/homepage-sections', {
      method: 'POST',
      body: {
        sections: dbSectionsList.value.map(s => ({
          id: s.id,
          position: s.position,
          active: s.active,
        })),
      },
    })
    dbSectionsOriginal.value = JSON.stringify(dbSectionsList.value)
    dbSectionsDirty.value = false
  } catch (err) {
    console.error('[builder] Erreur sauvegarde sections DB :', err)
  } finally {
    dbSectionsSaving.value = false
  }
}

onMounted(() => {
  if (isDbSections.value) loadDbSections()
})

// ── Section editor state (individual payload editor) ──────────────────────
const editingSectionId = ref<number | null>(null)
const sectionPayloadDirty = ref(false)
const sectionPayloadSaving = ref(false)
const sectionPayloadOriginal = ref<string>('')

const editingSection = computed(() =>
  dbSectionsList.value.find(s => s.id === editingSectionId.value) ?? null,
)

function openSectionEditor(sectionId: number) {
  editingSectionId.value = sectionId
  const section = dbSectionsList.value.find(s => s.id === sectionId)
  if (section) {
    sectionPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
  }
  sectionPayloadDirty.value = false
  activePanel.value = 'section-edit'
}

function markSectionPayloadDirty() {
  if (!editingSection.value) return
  const current = JSON.stringify({
    title: editingSection.value.title,
    subtitle: editingSection.value.subtitle,
    payload: editingSection.value.payload,
  })
  sectionPayloadDirty.value = current !== sectionPayloadOriginal.value
}

/**
 * Parse a title/subtitle stored in DB: can be a raw string, JSON dict, or already an object.
 * The GET API always returns a string (VARCHAR). But in live preview, the shared state
 * can contain a raw I18n object (not yet saved). We handle both cases.
 */
function parseSectionI18n(value: string | Record<string, string> | null | undefined): any {
  if (!value) return null
  if (typeof value === 'object') return value  // Déjà un dict I18n (live preview)
  // String : tente de parser comme JSON dict
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch { /* string nue legacy */ }
  return value
}

function updateEditingSectionTitle(value: any) {
  if (!editingSection.value) return
  // We keep the raw I18n dict in the shared state for live preview.
  // JSON serialization happens only in saveSectionPayload → API PUT.
  editingSection.value.title = value
  markSectionPayloadDirty()
}

function updateEditingSectionSubtitle(value: any) {
  if (!editingSection.value) return
  editingSection.value.subtitle = value
  markSectionPayloadDirty()
}

function updateEditingSectionPayload(payload: any) {
  if (!editingSection.value) return
  editingSection.value.payload = payload
  markSectionPayloadDirty()
}

async function saveSectionPayload() {
  if (!editingSection.value || !sectionPayloadDirty.value) return
  sectionPayloadSaving.value = true
  try {
    const section = editingSection.value
    // The PUT API expects strings for title/subtitle (VARCHAR in DB).
    // If it's an I18n dict, we serialize it to JSON for storage.
    await $fetch(`/api/homepage-sections/${section.id}`, {
      method: 'PUT',
      body: {
        title: section.title,
        subtitle: section.subtitle,
        payload: section.payload,
      },
    })
    sectionPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
    sectionPayloadDirty.value = false
  } catch (err) {
    console.error('[builder] Erreur sauvegarde section payload :', err)
  } finally {
    sectionPayloadSaving.value = false
  }
}

function toggleDbSectionFromLibrary(sectionId: number) {
  const index = dbSectionsList.value.findIndex(s => s.id === sectionId)
  if (index >= 0) toggleDbSection(index)
}

/** Description courte par type de section */
function sectionTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'hero-slider':      'Carousel d\'images avec texte et boutons',
    'features':         'Bandeau d\'atouts (livraison, qualité, etc.)',
    'categories':       'Grille de catégories avec pictos',
    'promotions':       'Grille de produits en promotion',
    'new-products':     'Nouveaux produits du catalogue',
    'narrative-blocks': 'Blocs storytelling (sourcing, livraison, etc.)',
    'bestsellers':      'Meilleures ventes du catalogue',
    'instagram':        'Bandeau Instagram / réseaux sociaux',
  }
  return descriptions[type] ?? 'Composant personnalisable'
}

// ── Pre-footer sections (same pattern as DB homepage sections) ────────────
import { useDbPrefooterSections } from '~/composables/useEditorState'

const pfSectionsList = useDbPrefooterSections()
const pfSectionsLoading = ref(false)
const pfSectionsDirty = ref(false)
const pfSectionsSaving = ref(false)
const pfSectionsOriginal = ref<string>('')

const editingPfSectionId = ref<number | null>(null)
const pfPayloadDirty = ref(false)
const pfPayloadSaving = ref(false)
const pfPayloadOriginal = ref<string>('')

const editingPfSection = computed(() =>
  pfSectionsList.value.find(s => s.id === editingPfSectionId.value) ?? null,
)

async function loadPfSections() {
  if (!isDbSections.value) return
  pfSectionsLoading.value = true
  try {
    const res = await $fetch<{ sections: DbHomepageSection[] }>('/api/prefooter-sections?all=1')
    pfSectionsList.value = res.sections ?? []
    pfSectionsOriginal.value = JSON.stringify(pfSectionsList.value)
    pfSectionsDirty.value = false
  } catch {
    pfSectionsList.value = []
  } finally {
    pfSectionsLoading.value = false
  }
}

function markPfDirty() {
  pfSectionsDirty.value = JSON.stringify(pfSectionsList.value) !== pfSectionsOriginal.value
}

function togglePfSection(index: number) {
  const s = pfSectionsList.value[index]
  if (!s) return
  s.active = !s.active
  markPfDirty()
}

function togglePfSectionFromLibrary(sectionId: number) {
  const index = pfSectionsList.value.findIndex(s => s.id === sectionId)
  if (index >= 0) togglePfSection(index)
}

async function savePfSections() {
  pfSectionsSaving.value = true
  try {
    await $fetch('/api/prefooter-sections', {
      method: 'POST',
      body: {
        sections: pfSectionsList.value.map(s => ({
          id: s.id,
          position: s.position,
          active: s.active,
        })),
      },
    })
    pfSectionsOriginal.value = JSON.stringify(pfSectionsList.value)
    pfSectionsDirty.value = false
  } catch (err) {
    console.error('[builder] Erreur sauvegarde sections pré-footer :', err)
  } finally {
    pfSectionsSaving.value = false
  }
}

function openPfSectionEditor(sectionId: number) {
  editingPfSectionId.value = sectionId
  const section = pfSectionsList.value.find(s => s.id === sectionId)
  if (section) {
    pfPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
  }
  pfPayloadDirty.value = false
  activePanel.value = 'prefooter-edit'
}

function markPfPayloadDirty() {
  if (!editingPfSection.value) return
  const current = JSON.stringify({
    title: editingPfSection.value.title,
    subtitle: editingPfSection.value.subtitle,
    payload: editingPfSection.value.payload,
  })
  pfPayloadDirty.value = current !== pfPayloadOriginal.value
}

function updatePfSectionTitle(value: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.title = value
  markPfPayloadDirty()
}

function updatePfSectionSubtitle(value: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.subtitle = value
  markPfPayloadDirty()
}

function updatePfSectionPayload(payload: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.payload = payload
  markPfPayloadDirty()
}

async function savePfSectionPayload() {
  if (!editingPfSection.value || !pfPayloadDirty.value) return
  pfPayloadSaving.value = true
  try {
    const section = editingPfSection.value
    await $fetch(`/api/prefooter-sections/${section.id}`, {
      method: 'PUT',
      body: {
        title: section.title,
        subtitle: section.subtitle,
        payload: section.payload,
      },
    })
    pfPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
    pfPayloadDirty.value = false
  } catch (err) {
    console.error('[builder] Erreur sauvegarde payload pré-footer :', err)
  } finally {
    pfPayloadSaving.value = false
  }
}

function prefooterTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'customer-reviews': 'Avis clients vérifiés (Google, Malt)',
    'newsletter':       'Formulaire d\'inscription newsletter',
    'trust-badges':     'Badges de confiance et certifications',
  }
  return descriptions[type] ?? 'Composant pré-footer'
}

// Load pre-footer sections on mount (in addition to homepage)
onMounted(() => {
  if (isDbSections.value) loadPfSections()
})

// ── Silo editor (grossiste category pages) ─────────────────────────────────
const editorSiloState = useEditorSilo()
const editorSiloSections = useEditorSiloSections()
const siloFieldsDirty = ref(false)
const siloFieldsSaving = ref(false)
const siloFieldsOriginal = ref<string>('')
const siloSyncBusy = ref(false)
const siloSyncResult = ref<{ added: number; after: number } | null>(null)

// Initialize the original when the context is detected
watch(() => contextPageId.value, (id) => {
  if (id === 'silo') {
    // Small delay to let the state fill from the page
    setTimeout(() => {
      siloFieldsOriginal.value = JSON.stringify(editorSiloState.value)
      siloFieldsDirty.value = false
    }, 100)
  }
})

function updateSiloField(key: keyof EditorSiloData, value: string | number) {
  const coerced = key === 'id_category' ? (Number(value) || null) : (value || null)
  editorSiloState.value = { ...editorSiloState.value, [key]: coerced }
  siloFieldsDirty.value = JSON.stringify(editorSiloState.value) !== siloFieldsOriginal.value
}

function isSiloSectionActive(id: string): boolean {
  return editorSiloSections.value?.[id] !== false
}

function toggleSiloSection(id: string) {
  if (!editorSiloSections.value) {
    editorSiloSections.value = {}
  }
  editorSiloSections.value = {
    ...editorSiloSections.value,
    [id]: !isSiloSectionActive(id),
  }
  siloFieldsDirty.value = true
}

async function saveSiloFields() {
  siloFieldsSaving.value = true
  try {
    await $fetch('/api/silo', {
      method: 'PUT',
      body: {
        id_silo: contextPayload.value.id_silo,
        path: contextPayload.value.path,
        ...editorSiloState.value,
        sections: editorSiloSections.value,
      },
    })
    siloFieldsOriginal.value = JSON.stringify({ ...editorSiloState.value, sections: editorSiloSections.value })
    siloFieldsDirty.value = false
  } catch (err) {
    console.error('[builder] Erreur sauvegarde silo :', err)
  } finally {
    siloFieldsSaving.value = false
  }
}

async function syncSiloProducts() {
  siloSyncBusy.value = true
  siloSyncResult.value = null
  try {
    const result = await $fetch<{ ok: boolean; added: number; after: number }>('/api/silo/sync-products', {
      method: 'POST',
      body: { id_silo: contextPayload.value.id_silo },
    })
    siloSyncResult.value = { added: result.added, after: result.after }
  } catch (err) {
    console.error('[builder] Erreur sync produits silo :', err)
  } finally {
    siloSyncBusy.value = false
  }
}

const SILO_COMPONENTS = [
  { id: 'hero', icon: '🦸', label: 'Hero', desc: 'Image + H1 + intro + sous-catégories', conditional: false },
  { id: 'subcategories', icon: '🏷️', label: 'Sous-catégories', desc: 'Pills navigables dans le hero', conditional: true },
  { id: 'products', icon: '📦', label: 'Grille produits', desc: 'Liste paginée SSR des produits', conditional: true },
  { id: 'livraison', icon: '🚚', label: 'Livraison & B2B', desc: 'Rungis, Bordeaux, conditionnement', conditional: false },
  { id: 'faq', icon: '❓', label: 'FAQ', desc: 'Accordéon + JSON-LD FAQPage', conditional: true },
  { id: 'presentation', icon: '📝', label: 'Présentation', desc: 'Description longue PrestaShop', conditional: true },
  { id: 'articles', icon: '📰', label: 'Articles liés', desc: 'Carrousel blog CMS', conditional: true },
  { id: 'contact', icon: '✉️', label: 'Devis / Contact', desc: 'CTA demande de devis', conditional: false },
] as const

// ── Footer columns (DB-driven, cs_footer) ──────────────────────────────
const footerColumnsList = useDbFooterColumns()
const footerColumnsLoading = ref(false)
const footerColumnsDirty = ref(false)
const footerColumnsSaving = ref(false)
const footerColumnsOriginal = ref<string>('')

async function loadFooterColumns() {
  if (!isDbSections.value) return
  footerColumnsLoading.value = true
  try {
    const res = await $fetch<{ columns: any[] }>('/api/footer?ids=1')
    // Map API response → local state
    footerColumnsList.value = (res.columns ?? []).map((col: any, ci: number) => ({
      title: col.title ?? '',
      column_position: col.links?.[0]?.column_position ?? (ci + 1),
      links: (col.links ?? []).map((l: any) => ({
        id: l.id,
        label: l.label,
        href: l.href,
        badge: l.badge,
        external: l.external ?? false,
        column_position: l.column_position ?? (ci + 1),
        link_position: l.link_position ?? 0,
      })),
    }))
    footerColumnsOriginal.value = JSON.stringify(footerColumnsList.value)
    footerColumnsDirty.value = false
  } catch {
    footerColumnsList.value = []
  } finally {
    footerColumnsLoading.value = false
  }
}

function markFooterColumnsDirty() {
  footerColumnsDirty.value = JSON.stringify(footerColumnsList.value) !== footerColumnsOriginal.value
}

function updateColumnTitle(ci: number, title: string) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  cols[ci] = { ...cols[ci], title }
  // Update title on all links in this column
  cols[ci].links = cols[ci].links.map(l => ({ ...l }))
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function updateFooterLink(ci: number, li: number, patch: Partial<DbFooterLink>) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]?.links[li]) return
  cols[ci] = { ...cols[ci], links: [...cols[ci].links] }
  cols[ci].links[li] = { ...cols[ci].links[li], ...patch }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function addFooterLink(ci: number) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  const maxPos = Math.max(0, ...cols[ci].links.map(l => l.link_position))
  cols[ci] = {
    ...cols[ci],
    links: [...cols[ci].links, {
      id: -Date.now(), // Temporary negative ID for new items
      label: 'Nouveau lien',
      href: '/',
      external: false,
      column_position: cols[ci].column_position,
      link_position: maxPos + 1,
    }],
  }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function removeFooterLink(ci: number, li: number) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  cols[ci] = { ...cols[ci], links: cols[ci].links.filter((_, i) => i !== li) }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function addColumn() {
  const maxPos = Math.max(0, ...footerColumnsList.value.map(c => c.column_position))
  footerColumnsList.value = [...footerColumnsList.value, {
    title: 'Nouvelle colonne',
    column_position: maxPos + 1,
    links: [],
  }]
  markFooterColumnsDirty()
}

function removeColumn(ci: number) {
  footerColumnsList.value = footerColumnsList.value.filter((_, i) => i !== ci)
  markFooterColumnsDirty()
}

async function saveFooterColumns() {
  footerColumnsSaving.value = true
  try {
    // Collect all existing link IDs to know what to delete
    const originalCols: DbFooterColumn[] = JSON.parse(footerColumnsOriginal.value || '[]')
    const originalIds = new Set<number>()
    for (const col of originalCols) {
      for (const link of col.links) {
        if (link.id > 0) originalIds.add(link.id)
      }
    }

    const currentIds = new Set<number>()
    const updates: Promise<any>[] = []

    for (const col of footerColumnsList.value) {
      for (let li = 0; li < col.links.length; li++) {
        const link = col.links[li]
        if (link.id > 0) {
          // Existing link → update
          currentIds.add(link.id)
          updates.push($fetch(`/api/footer-links/${link.id}`, {
            method: 'PUT',
            body: {
              column_title: col.title,
              column_position: col.column_position,
              link_label: link.label,
              link_href: link.href,
              link_badge: link.badge || null,
              link_external: link.external,
              link_position: li + 1,
            },
          }))
        } else {
          // New link → create
          updates.push($fetch('/api/footer-links', {
            method: 'POST',
            body: {
              column_title: col.title,
              column_position: col.column_position,
              link_label: link.label,
              link_href: link.href,
              link_badge: link.badge || null,
              link_external: link.external,
              link_position: li + 1,
            },
          }))
        }
      }
    }

    // Delete removed links
    for (const id of originalIds) {
      if (!currentIds.has(id)) {
        updates.push($fetch(`/api/footer-links/${id}`, { method: 'DELETE' }))
      }
    }

    await Promise.all(updates)

    // Reload to get fresh IDs
    await loadFooterColumns()
  } catch (err) {
    console.error('[builder] Erreur sauvegarde footer columns :', err)
  } finally {
    footerColumnsSaving.value = false
  }
}

onMounted(() => {
  if (isDbSections.value) loadFooterColumns()
})

// ── Footer social links (config-based, saved via saveConfig) ────────────────
type SocialPlatform = 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'x' | 'youtube' | 'tiktok' | 'github'

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'github', label: 'GitHub' },
]

const footerSocialList = computed(() => footerBuilderState.value?.social ?? [])

function addSocialItem() {
  const social = [...(footerBuilderState.value?.social ?? [])]
  social.push({ platform: 'linkedin' as any, href: '' })
  setSocialDb(social as any)
  markDirty()
}

function removeSocialItem(i: number) {
  const social = [...(footerBuilderState.value?.social ?? [])]
  social.splice(i, 1)
  setSocialDb(social as any)
  markDirty()
}

function updateSocialItem(i: number, patch: Partial<{ platform: SocialPlatform; href: string }>) {
  const social = [...(footerBuilderState.value?.social ?? [])]
  if (!social[i]) return
  social[i] = { ...social[i], ...patch }
  setSocialDb(social as any)
  markDirty()
}

// ── Group accordions ────────────────────────────────────────────────────
type GroupId = 'apparence' | 'top' | 'page' | 'homepage' | 'footer'
const openGroup = ref<GroupId>('top')

function toggleGroup(group: GroupId) {
  openGroup.value = openGroup.value === group ? 'apparence' : group
}

// Auto-open the page group when a context is saved
watch(contextPageId, (ctx) => {
  if (ctx) openGroup.value = 'page'
})

// Auto-switch panel on context change
const DEFAULT_PANEL_FOR_CONTEXT: Record<string, any> = {
  silo:     'silo:hero',
}
watch(contextPageId, (ctx) => {
  if (ctx && DEFAULT_PANEL_FOR_CONTEXT[ctx]) {
    activePanel.value = DEFAULT_PANEL_FOR_CONTEXT[ctx]
  }
})

// ── Exit URL ────────────────────────────────────────────────────────────────
const exitUrl = computed(() => {
  const { edit_mode: _, ...rest } = route.query
  const qs = new URLSearchParams(rest as Record<string, string>).toString()
  return route.path + (qs ? `?${qs}` : '')
})

// ── DnD natif ───────────────────────────────────────────────────────────────
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)

function onDragStart(index: number) { dragFrom.value = index }
function onDragOver(index: number)  { dragOver.value = index }
function onDrop(toIndex: number) {
  if (dragFrom.value !== null && dragFrom.value !== toIndex) {
    moveSection(dragFrom.value, toIndex)
  }
  dragFrom.value = null
  dragOver.value = null
}

// ── Helpers panels ──────────────────────────────────────────────────────────

// ── Header Logo — Upload image → WebP ────────────────────────────────────────
const logoUploading = ref(false)
const logoUploadError = ref('')
async function handleLogoUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploadError.value = ''
  logoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'logos')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
    })
    if (res?.url) {
      onHeaderLogoChange({ src: res.url })
    }
  } catch (err: any) {
    logoUploadError.value = err?.data?.message || err?.message || 'Erreur upload'
  } finally {
    logoUploading.value = false
    // Reset input to allow re-upload of the same file
    ;(e.target as HTMLInputElement).value = ''
  }
}

// ── Header DB-first wrappers ────────────────────────────────────────────────
function onHeaderLogoChange(patch: Record<string, any>) {
  updateLogoDb(patch)
  markDirty()
}
function onHeaderTopBarChange(patch: Record<string, any>) {
  updateTopBarDb(patch)
  markDirty()
}
function onHeaderContactChange(email: string) {
  updateContactEmailDb(email)
  markDirty()
}
function onHeaderFeatureChange(key: string, value: any) {
  updateFeaturesDb({ [key]: value })
  markDirty()
}

// ── Header Top Bar — Languages (DB-first) ──────────────────────────────────
function addLanguage() {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  // DB-first: label is a string (resolved on the API side via cs_header_locale_lang).
  langs.push({ code: 'fr', label: 'Français', href: '/' })
  updateTopBarDb({ languages: langs })
  markDirty()
}
function removeLanguage(i: number) {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  langs.splice(i, 1)
  updateTopBarDb({ languages: langs })
  markDirty()
}
function updateLanguage(i: number, patch: Partial<{ code: string; label: string; href: string }>) {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  if (!langs[i]) return
  langs[i] = { ...langs[i], ...patch }
  updateTopBarDb({ languages: langs })
  markDirty()
}

// ── Menu (navigation + dropdowns + megamenu) — DB-first via ac_megamenu ──
type MenuLink = { label: string; href: string; psId?: number; badge?: string; description?: string | Record<string, string>; psCategoryId?: number; showPsChildren?: boolean; psChildren?: any[] }
type MegaColumn = { title?: string; icon?: string; links: MenuLink[] }
type MenuItem = { label: string; href?: string; isMegaMenu?: boolean; megaMenu?: MegaColumn[]; children?: MenuLink[]; bgColor?: string; textColor?: string; style?: Record<string, string>; rightAlign?: boolean; align?: string; cssClass?: string; highlight?: boolean; external?: boolean; badge?: any; badgeBg?: string; badgeColor?: string }
type MenuItemKind = 'link' | 'dropdown' | 'megamenu'

const MENU_TYPES: { value: MenuItemKind; label: string }[] = [
  { value: 'link',     label: 'Lien' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'megamenu', label: 'Mégamenu' },
]

const expandedMenuItem = ref<number | null>(null)
const megamenuLoaded = ref(false)

const menuItems = computed<MenuItem[]>(() => {
  return (megamenuBuilderItems.value as MenuItem[]) ?? []
})

function commitMenuItems(items: MenuItem[]) {
  setMegamenuItems(items)
  markDirty()
}

function menuItemTypeOf(item: MenuItem): MenuItemKind {
  if (item.isMegaMenu === true) return 'megamenu'
  if (Array.isArray(item.megaMenu) && item.megaMenu.length > 0) return 'dropdown'
  return 'link'
}
function menuItemTypeLabel(item: MenuItem): string {
  return MENU_TYPES.find(t => t.value === menuItemTypeOf(item))?.label ?? '?'
}
function menuItemTypeBadge(item: MenuItem): string {
  const k = menuItemTypeOf(item)
  if (k === 'megamenu') return 'bg-violet-100 text-violet-700'
  if (k === 'dropdown') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

function addMenuItem() {
  const items = [...menuItems.value]
  items.push({ label: 'Nouvel item', href: '/' })
  commitMenuItems(items)
  expandedMenuItem.value = items.length - 1
}
function removeMenuItem(i: number) {
  const items = [...menuItems.value]
  items.splice(i, 1)
  commitMenuItems(items)
  if (expandedMenuItem.value === i) expandedMenuItem.value = null
}
function moveMenuItem(from: number, to: number) {
  if (to < 0 || to >= menuItems.value.length) return
  const items = [...menuItems.value]
  const [it] = items.splice(from, 1)
  items.splice(to, 0, it)
  commitMenuItems(items)
  if (expandedMenuItem.value === from) expandedMenuItem.value = to
}
function updateMenuItem(i: number, patch: Partial<MenuItem>) {
  const items = [...menuItems.value]
  if (!items[i]) return
  items[i] = { ...items[i], ...patch }
  commitMenuItems(items)
}
function setMenuItemType(i: number, kind: MenuItemKind) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const current = items[i]
  if (kind === 'link') {
    items[i] = { label: current.label, href: current.href ?? '/' }
  } else if (kind === 'dropdown') {
    const existingLinks = current.megaMenu?.[0]?.links ?? (current.megaMenu?.flatMap(c => c.links) ?? [])
    items[i] = { label: current.label, isMegaMenu: false, megaMenu: [{ links: existingLinks }] }
  } else {
    const existingCols: MegaColumn[] = current.megaMenu && current.megaMenu.length > 0
      ? current.megaMenu.map(c => ({ title: c.title ?? '', icon: c.icon ?? '', links: c.links ?? [] }))
      : [{ title: '', icon: '', links: [] }]
    items[i] = { label: current.label, isMegaMenu: true, megaMenu: existingCols }
  }
  commitMenuItems(items)
}

// Dropdown helpers (1 column without title)
function addDropdownLink(i: number) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const cols = items[i].megaMenu ?? [{ links: [] }]
  cols[0] = { ...cols[0], links: [...(cols[0].links ?? []), { label: 'Nouveau', href: '/' }] }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeDropdownLink(i: number, li: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[0]) return
  const links = [...items[i].megaMenu![0].links]
  links.splice(li, 1)
  items[i].megaMenu![0] = { ...items[i].megaMenu![0], links }
  commitMenuItems(items)
}
function updateDropdownLink(i: number, li: number, patch: Partial<MenuLink>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[0]?.links?.[li]) return
  const links = [...items[i].megaMenu![0].links]
  links[li] = { ...links[li], ...patch }
  items[i].megaMenu![0] = { ...items[i].megaMenu![0], links }
  commitMenuItems(items)
}

// Megamenu columns helpers
function addMegaColumn(i: number) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const cols = [...(items[i].megaMenu ?? [])]
  cols.push({ title: 'Nouvelle colonne', icon: '✨', links: [] })
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeMegaColumn(i: number, ci: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu) return
  const cols = [...items[i].megaMenu!]
  cols.splice(ci, 1)
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function moveMegaColumn(i: number, from: number, to: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu) return
  if (to < 0 || to >= items[i].megaMenu!.length) return
  const cols = [...items[i].megaMenu!]
  const [c] = cols.splice(from, 1)
  cols.splice(to, 0, c)
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function updateMegaColumn(i: number, ci: number, patch: Partial<MegaColumn>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]) return
  const cols = [...items[i].megaMenu!]
  cols[ci] = { ...cols[ci], ...patch }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}

// ── Megamenu column icon upload (WebP path via /api/admin/upload-image) ────
const megaIconFileInputs = ref<Record<string, HTMLInputElement>>({})
const megaIconUploading  = ref<Record<string, boolean>>({})
const megaIconError      = ref<Record<string, string>>({})

function triggerMegaIconUpload(i: number, ci: number) {
  megaIconFileInputs.value[`${i}:${ci}`]?.click()
}
async function onMegaIconFileChange(i: number, ci: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const k = `${i}:${ci}`
  megaIconError.value      = { ...megaIconError.value, [k]: '' }
  megaIconUploading.value  = { ...megaIconUploading.value, [k]: true }
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'megamenu')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body:   fd,
    })
    if (!res?.url) throw new Error('Réponse invalide')
    updateMegaColumn(i, ci, { icon: res.url })
  } catch (err: any) {
    megaIconError.value = { ...megaIconError.value, [k]: err?.data?.message || err?.message || 'Échec upload' }
  } finally {
    megaIconUploading.value = { ...megaIconUploading.value, [k]: false }
    if (input) input.value = ''
  }
}
function addMegaLink(i: number, ci: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]) return
  const cols = [...items[i].megaMenu!]
  cols[ci] = { ...cols[ci], links: [...(cols[ci].links ?? []), { label: 'Nouveau', href: '/' }] }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeMegaLink(i: number, ci: number, li: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]?.links) return
  const cols = [...items[i].megaMenu!]
  const links = [...cols[ci].links]
  links.splice(li, 1)
  cols[ci] = { ...cols[ci], links }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function updateMegaLink(i: number, ci: number, li: number, patch: Partial<MenuLink>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]?.links?.[li]) return
  const cols = [...items[i].megaMenu!]
  const links = [...cols[ci].links]
  links[li] = { ...links[li], ...patch }
  cols[ci] = { ...cols[ci], links }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}

// Header features list
const headerFeaturesList = [
  { key: 'showSearch',      label: 'Barre de recherche' },
  { key: 'showWishlist',    label: 'Favoris / Wishlist' },
  { key: 'showLogin',       label: 'Connexion client' },
  { key: 'showContact',     label: 'Email de contact' },
  { key: 'showGiftcardLink', label: 'Lien Cartes cadeaux (après Marques)' },
  { key: 'showBlogLink',    label: 'Lien Blog (à droite du menu)' },
  { key: 'showStoresLink',  label: 'Lien Magasins / Store locator (à droite du menu)' },
  { key: 'showContactLink', label: 'Lien Nous contacter (à droite du menu)' },
]

const headerLayoutOptions = [
  { value: 'stacked', label: '2 lignes' },
  { value: 'inline',  label: '1 ligne' },
]

// Theme colors list
const themeColorsList = [
  { key: 'primary',    label: 'Couleur primaire' },
  { key: 'secondary',  label: 'Couleur secondaire' },
  { key: 'headerBg',   label: 'Fond header' },
  { key: 'footerBg',   label: 'Fond footer' },
  { key: 'topBarBg',   label: 'Fond top bar' },
  { key: 'topBarText', label: 'Texte top bar' },
  { key: 'background', label: 'Fond général' },
]

// Border radius options
const radiusOptions = [
  { value: 'none', label: 'Carré' },
  { value: 'sm',   label: 'Léger' },
  { value: 'md',   label: 'Normal' },
  { value: 'lg',   label: 'Large' },
  { value: 'full', label: 'Pilule' },
]

// Content width options
const contentWidthOptions = [
  { value: '6xl',  label: '6xl (1152px)' },
  { value: '7xl',  label: '7xl (1280px)' },
  { value: '8xl',  label: '8xl (1440px)' },
  { value: 'full', label: 'Pleine largeur' },
]

// ── Theme DB-first wrappers (edit local + markDirty) ─────────────────────
function onThemeColorChange(key: string, value: string) {
  updateThemeColorDb(key, value)
  markDirty()
}
function onThemeTypoChange(key: string, value: string) {
  updateTypographyDb(key, value)
  markDirty()
}
function onThemeUiChange(key: string, value: string | boolean) {
  updateUiDb(key, value)
  markDirty()
}

// ── Homepage DB-first proxy (hp → hpBuilderState) ──────────────────────
// Reactive proxy that allows the template to continue reading hpDb.hero, hpDb.features etc.
const hpDb = computed(() => hpBuilderState.value || {})

function onHpHeroChange(patch: Record<string, any>) { updateHeroDb(patch); markDirty() }

// Upload image hero (file picker → /api/admin/upload-image → URL)
const hpHeroUploadInput = ref<HTMLInputElement | null>(null)
const hpHeroUploading = ref(false)
const hpHeroUploadError = ref<string | null>(null)
async function onHpHeroUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  hpHeroUploadError.value = null
  hpHeroUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'hero')
    const r = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', { method: 'POST', body: fd })
    if (r?.url) {
      onHpHeroChange({ image: r.url })
    } else {
      hpHeroUploadError.value = 'Upload échoué (pas d\'URL retournée)'
    }
  } catch (err: any) {
    hpHeroUploadError.value = err?.data?.message || err?.message || 'Erreur upload'
  } finally {
    hpHeroUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
function onHpAboutChange(patch: Record<string, any>) { updateAboutDb(patch); markDirty() }
function onHpBlogChange(patch: Record<string, any>) { updateBlogDb(patch); markDirty() }
function onHpFaqChange(patch: Record<string, any>) { updateFaqDb(patch); markDirty() }
function onHpMaltChange(show: boolean) {
  if (!hpBuilderState.value) loadHomepageDb()
  hpBuilderState.value = { ...hpBuilderState.value!, malt: { show } }
  markDirty()
}

function onHpAddFeature() {
  const feats = [...(hpBuilderState.value?.features || [])]
  feats.push({ icon: 'star', label: 'Nouvel atout', description: 'Description' })
  setFeaturesDb(feats); markDirty()
}
function onHpRemoveFeature(i: number) {
  const feats = [...(hpBuilderState.value?.features || [])]
  feats.splice(i, 1)
  setFeaturesDb(feats); markDirty()
}
function onHpUpdateFeature(i: number, patch: Record<string, any>) {
  const feats = [...(hpBuilderState.value?.features || [])]
  if (!feats[i]) return
  feats[i] = { ...feats[i], ...patch }
  setFeaturesDb(feats); markDirty()
}

function onHpAddCategory() {
  const cats = [...(hpBuilderState.value?.categories || [])]
  cats.push({ label: 'Nouvelle catégorie', image: '', href: '/catalogue/nouvelle-categorie' })
  setCategoriesDb(cats); markDirty()
}
function onHpRemoveCategory(i: number) {
  const cats = [...(hpBuilderState.value?.categories || [])]
  cats.splice(i, 1)
  setCategoriesDb(cats); markDirty()
}
function onHpUpdateCategory(i: number, patch: Record<string, any>) {
  const cats = [...(hpBuilderState.value?.categories || [])]
  if (!cats[i]) return
  cats[i] = { ...cats[i], ...patch }
  setCategoriesDb(cats); markDirty()
}

function onHpAddTestimonial() {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  t.push({ author: 'Nom', text: 'Témoignage…', rating: 5 })
  setTestimonialsDb(t); markDirty()
}
function onHpRemoveTestimonial(i: number) {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  t.splice(i, 1)
  setTestimonialsDb(t); markDirty()
}
function onHpUpdateTestimonial(i: number, patch: Record<string, any>) {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  if (!t[i]) return
  t[i] = { ...t[i], ...patch }
  setTestimonialsDb(t); markDirty()
}

// ── Footer DB-first wrappers ─────────────────────────────────────────────
function onFooterFieldChange(patch: Record<string, any>) {
  updateFooterFieldDb(patch)
  markDirty()
}
function onFooterContactChange(patch: Record<string, any>) {
  updateContactDb(patch)
  markDirty()
}
function onFooterBottomBarChange(patch: Record<string, any>) {
  updateBottomBarDb(patch)
  markDirty()
}
function onFooterNewsletterChange(patch: Record<string, any>) {
  updateNewsletterDb(patch)
  markDirty()
}

// ── Visibility panel ────────────────────────────────────────────────────────

const visibilityEditType = ref<SectionType | null>(null)
const visibilityRule = ref<SectionVisibilityRule>({ ...DEFAULT_VISIBILITY_RULE })

function openVisibilityPanel(type: SectionType) {
  visibilityEditType.value = type
  const existing = sections.value.find(s => s.type === type)?.visibility
  visibilityRule.value = existing
    ? { avatars: [...existing.avatars], mode: existing.mode }
    : { ...DEFAULT_VISIBILITY_RULE }
  activePanel.value = 'homepage:visibility' as any
}

function toggleAvatarInRule(avatarType: AvatarType) {
  const idx = visibilityRule.value.avatars.indexOf(avatarType)
  if (idx >= 0) {
    visibilityRule.value.avatars.splice(idx, 1)
  } else {
    visibilityRule.value.avatars.push(avatarType)
  }
}

function saveVisibilityRule() {
  if (!visibilityEditType.value) return
  updateSectionVisibility(visibilityEditType.value, { ...visibilityRule.value })
  activePanel.value = null
}

function clearVisibilityRule() {
  if (!visibilityEditType.value) return
  updateSectionVisibility(visibilityEditType.value, { ...DEFAULT_VISIBILITY_RULE })
  visibilityRule.value = { ...DEFAULT_VISIBILITY_RULE }
  activePanel.value = null
}
</script>

<style scoped>
/* ── Champs Builder (Phase 3 UX 2026-05-08) ─────────────────────────────
   Bordure plus marquée, padding aéré, focus ring 4px primary, contraste
   texte/placeholder élevé. Compteur `.field-help` & `.field-counter` pour
   les hints sous le champ. */
.field {
  @apply block w-full px-3.5 py-2.5 text-sm rounded-lg
         border-2 border-slate-300
         bg-white text-slate-900 placeholder:text-slate-400
         shadow-sm
         focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500
         hover:border-slate-400
         transition-colors;
}
textarea.field {
  @apply leading-relaxed py-3;
  min-height: 96px;
}
.field-label {
  @apply flex items-center gap-1.5
         text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5;
}
.field-help {
  @apply mt-1 text-[10px] text-slate-400 leading-snug;
}
.field-counter {
  @apply ml-auto text-[10px] font-mono text-slate-400 normal-case tracking-normal;
}

/* ── Resize handle (right edge of the sidebar, 4px width, cursor col-resize)
   Visible au hover + état actif (drag en cours). */
.builder-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 120ms ease;
  z-index: 5;
}
.builder-resize-handle:hover,
.builder-resize-handle.is-resizing {
  background: rgba(99, 102, 241, 0.45); /* primary-400/50 */
}

/* ── Collapsed mode (56px rail) — hides non-essential content.
   Pattern : font-size:0 sur les labels (les nœuds texte deviennent
   invisibles, les SVG/icônes restent intrinsèquement dimensionnés). */
.builder-sidebar.is-collapsed .builder-header-text,
.builder-sidebar.is-collapsed .builder-resize-handle {
  display: none !important;
}
.builder-sidebar.is-collapsed > div:not(:first-child) {
  display: none !important;
}
.builder-sidebar.is-collapsed > div:first-child {
  padding: 0.75rem 0.5rem !important;
}
</style>
