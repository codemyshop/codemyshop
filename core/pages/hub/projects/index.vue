<template>
  <div class="flex-1 overflow-auto">
    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100 shrink-0">Pipeline</h1>

        <!-- Toolbar -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- View switcher -->
          <div class="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
            <button
              @click="viewMode = 'kanban'"
              :class="viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 dark:bg-slate-950'"
              class="px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10V7m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2" />
              </svg>
              Kanban
            </button>
            <button
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-50 dark:bg-slate-950'"
              class="px-3 py-1.5 flex items-center gap-1.5 transition-colors border-l border-gray-200 dark:border-slate-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Liste
            </button>
          </div>

          <!-- Task templates -->
          <button
            @click="openTaskTemplates"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 dark:bg-slate-950 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
            Tâches modèles
          </button>

          <!-- Team -->
          <button
            @click="openTeam"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 dark:bg-slate-950 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            Équipe
          </button>

          <!-- WhatsApp templates -->
          <button
            @click="openWhatsApp"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 dark:bg-slate-950 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            WhatsApp
          </button>

          <!-- Automations -->
          <button
            @click="openAutomations"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 dark:bg-slate-950 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            Automatisations
          </button>

          <!-- New project -->
          <button
            @click="openCreate"
            class="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouveau projet
          </button>
        </div>
      </div>
    </header>

    <div class="p-6">
      <div v-if="loading" class="text-center py-20 text-gray-400">Chargement…</div>

      <!-- Kanban board -->
      <div v-else-if="viewMode === 'kanban'" class="flex gap-4 overflow-x-auto pb-4">
        <div
          v-for="(label, key) in STATUSES"
          :key="key"
          class="kanban-column shrink-0 w-72"
          @dragover.prevent
          @drop="onDrop($event, key)"
        >
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500">{{ label }}</h2>
              <span class="text-xs text-gray-400 bg-gray-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                {{ (projectsByStatus[key] || []).length }}
              </span>
            </div>
            <div class="h-1 rounded-full" :class="statusColor(key)" />
          </div>

          <div class="space-y-3 min-h-16">
            <div
              v-for="p in (projectsByStatus[key] || [])"
              :key="p.id_ac_smartproject"
              draggable="true"
              @dragstart="onDragStart($event, p)"
              class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 cursor-pointer hover:shadow-md transition-shadow"
              @click="goToProject(p.id_ac_smartproject)"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-xs text-gray-400">#{{ p.id_ac_smartproject }}</span>
                <div class="flex items-center gap-1">
                  <button @click.stop="openEdit(p)" class="text-gray-300 hover:text-primary-500 transition-colors" title="Modifier">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button @click.stop="deleteProject(p)" class="text-gray-300 hover:text-rose-500 transition-colors" title="Supprimer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="font-semibold text-gray-800 dark:text-slate-100 text-sm leading-snug mb-2">{{ p.project_title }}</p>

              <!-- Contact + source (ligne badge type voguimmo) -->
              <div v-if="p.contact_name" class="flex items-center gap-1.5 mb-2">
                <div
                  class="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                  :class="leadLevelAvatarClass(p.lead_level)"
                  :title="leadLevelLabel(p.lead_level)"
                >
                  {{ p.contact_name?.charAt(0) }}
                </div>
                <span class="text-xs text-gray-500 truncate">{{ p.contact_name }}</span>
                <span
                  v-if="p.lead_source"
                  class="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                  :class="sourceBadge(p.lead_source).cls"
                  :title="`Source : ${p.lead_source}`"
                >
                  {{ sourceBadge(p.lead_source).label }}
                </span>
              </div>

              <!-- Niveau (score /10) + budget tag -->
              <div v-if="p.lead_level || p.budget" class="flex items-center gap-2 mb-2">
                <span
                  v-if="p.lead_level !== null && p.lead_level !== undefined"
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  :class="leadLevelBadgeClass(p.lead_level)"
                  :title="`Score lead : ${p.lead_level}/10 — ${leadLevelLabel(p.lead_level)}`"
                >
                  {{ p.lead_level }}/10
                </span>
                <span v-if="p.budget" class="text-[10px] text-gray-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  💰 {{ BUDGETS[p.budget] || p.budget }}
                </span>
              </div>

              <!-- Compteurs : docs / tasks open / WA / emails / prix final -->
              <div class="flex items-center gap-3 text-xs text-gray-400 mt-2">
                <span v-if="p.documents_count" :title="`${p.documents_count} document(s)`">📎 {{ p.documents_count }}</span>
                <span v-if="p.tasks_open_count" :title="`${p.tasks_open_count} tâche(s) ouverte(s) sur ${p.tasks_count}`">✓ {{ p.tasks_open_count }}</span>
                <span v-if="p.contact_phone_whatsapp" title="WhatsApp disponible" class="text-emerald-500">💬</span>
                <span v-if="p.emails_count" :title="`${p.emails_count} email(s) échangé(s)`">✉ {{ p.emails_count }}</span>
                <span v-if="p.final_price" class="ml-auto font-medium text-gray-600">{{ formatPrice(p.final_price) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid / List view -->
      <div v-else class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projet</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tâches</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="p in projects"
              :key="p.id_ac_smartproject"
              class="hover:bg-gray-50 dark:bg-slate-950 cursor-pointer transition-colors"
              @click="goToProject(p.id_ac_smartproject)"
            >
              <td class="px-4 py-3 text-xs text-gray-400">#{{ p.id_ac_smartproject }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800 dark:text-slate-100 truncate max-w-xs">{{ p.project_title }}</p>
                <p v-if="p.project_type" class="text-xs text-gray-400">{{ PROJECT_TYPES[p.project_type] || p.project_type }}</p>
              </td>
              <td class="px-4 py-3 text-xs text-gray-500">
                <div>{{ p.contact_name || '—' }}</div>
                <div v-if="p.lead_source || p.lead_level !== null" class="flex items-center gap-1 mt-0.5">
                  <span
                    v-if="p.lead_source"
                    class="text-[10px] px-1 py-0 rounded font-medium"
                    :class="sourceBadge(p.lead_source).cls"
                  >{{ sourceBadge(p.lead_source).label }}</span>
                  <span
                    v-if="p.lead_level !== null && p.lead_level !== undefined"
                    class="text-[10px] font-mono px-1 py-0 rounded"
                    :class="leadLevelBadgeClass(p.lead_level)"
                  >{{ p.lead_level }}/10</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 text-xs">
                  <span class="w-2 h-2 rounded-full" :class="statusColor(p.project_status)" />
                  {{ STATUSES[p.project_status] || p.project_status }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-500">{{ p.final_price ? formatPrice(p.final_price) : '—' }}</td>
              <td class="px-4 py-3 text-xs text-gray-400">
                <span class="inline-flex items-center gap-2">
                  <span v-if="p.tasks_open_count" :title="`${p.tasks_open_count}/${p.tasks_count} tâches`">✓ {{ p.tasks_open_count }}</span>
                  <span v-if="p.documents_count" :title="`${p.documents_count} doc(s)`">📎 {{ p.documents_count }}</span>
                  <span v-if="p.emails_count" :title="`${p.emails_count} email(s)`">✉ {{ p.emails_count }}</span>
                  <span v-if="!p.tasks_count && !p.documents_count && !p.emails_count">—</span>
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(p.date_add) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1">
                  <button
                    @click.stop="openEdit(p)"
                    class="text-gray-300 hover:text-primary-500 transition-colors p-1"
                    title="Modifier"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteProject(p)"
                    class="text-gray-300 hover:text-rose-500 transition-colors p-1"
                    title="Supprimer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- =================== Modal Create / Edit project =================== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="closeModal">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">{{ editingId ? 'Modifier le projet' : 'Nouveau projet' }}</h2>
              <button @click="closeModal" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form @submit.prevent="saveProject" class="px-6 py-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Titre *</label>
                <input v-model="form.project_title" required class="input-field" placeholder="Nom du projet" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Contact</label>
                <input v-model="contactSearch" @input="searchContacts" class="input-field" placeholder="Rechercher un contact…" />
                <div v-if="contactResults.length" class="border border-gray-200 dark:border-slate-700 rounded-lg mt-1 overflow-hidden">
                  <button
                    v-for="c in contactResults"
                    :key="c.id_ac_smartlead"
                    type="button"
                    @click="selectContact(c)"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 border-b last:border-0"
                  >
                    {{ c.firstname }} {{ c.lastname }}
                    <span v-if="c.email" class="text-gray-400 text-xs ml-1">— {{ c.email }}</span>
                  </button>
                </div>
                <p v-if="form.id_ac_smartlead" class="text-xs text-primary-600 mt-1">Contact : {{ selectedContactName }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Statut</label>
                <select v-model="form.project_status" class="input-field">
                  <option v-for="(label, key) in STATUSES" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Type</label>
                <select v-model="form.project_type" class="input-field">
                  <option value="">— Choisir —</option>
                  <option v-for="(label, key) in PROJECT_TYPES" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Budget estimé</label>
                <select v-model="form.budget" class="input-field">
                  <option value="">— Choisir —</option>
                  <option value="moins_1k">&lt; 1 000 €</option>
                  <option value="1k_3k">1 000 – 3 000 €</option>
                  <option value="3k_8k">3 000 – 8 000 €</option>
                  <option value="8k_20k">8 000 – 20 000 €</option>
                  <option value="20k_60k">20 000 – 60 000 €</option>
                  <option value="60k_plus">&gt; 60 000 €</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Besoins / Description</label>
                <textarea v-model="form.needs" rows="4" class="input-field resize-none" />
              </div>
              <p v-if="formError" class="text-sm text-danger-500">{{ formError }}</p>
              <div class="flex gap-3 pt-2">
                <button type="button" @click="closeModal" class="flex-1 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:bg-slate-950">Annuler</button>
                <button type="submit" :disabled="saving" class="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =================== Modal Task Templates =================== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showTaskTemplates" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showTaskTemplates = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">Modèles de tâches</h2>
              <button @click="showTaskTemplates = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div class="flex gap-6 p-6 overflow-y-auto flex-1">
              <!-- List -->
              <div class="flex-1 min-w-0">
                <div v-if="taskTemplatesLoading" class="text-center py-10 text-gray-400 text-sm">Chargement…</div>
                <div v-else-if="!taskTemplates.length" class="text-center py-10 text-gray-400 text-sm">Aucun modèle.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="t in taskTemplates"
                    :key="t.id_ac_smarttask_template"
                    class="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{{ t.title }}</p>
                      <p class="text-xs text-gray-400">J+{{ t.days_to_deadline }} — avancement {{ t.next_step }}%</p>
                    </div>
                    <div class="flex gap-1.5 shrink-0 ml-3">
                      <button @click="editTaskTemplate(t)" class="text-xs px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Modifier</button>
                      <button @click="deleteTaskTemplate(t.id_ac_smarttask_template)" class="text-xs px-2 py-1 border border-danger-100 rounded text-danger-400 hover:bg-danger-50">✕</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Form -->
              <div class="w-64 shrink-0 border-l border-gray-100 dark:border-slate-800 pl-6">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">{{ ttForm.id ? 'Modifier' : 'Nouveau modèle' }}</h3>
                <form @submit.prevent="saveTaskTemplate" class="space-y-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Titre *</label>
                    <input v-model="ttForm.title" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Statut par défaut</label>
                    <select v-model="ttForm.default_status" class="input-field">
                      <option value="todo">À faire</option>
                      <option value="in_progress">En cours</option>
                      <option value="done">Terminé</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Délai (jours)</label>
                    <input v-model.number="ttForm.days_to_deadline" type="number" min="0" class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Avancement (%)</label>
                    <input v-model.number="ttForm.next_step" type="number" min="0" max="100" class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Description</label>
                    <textarea v-model="ttForm.default_description" rows="3" class="input-field resize-none" />
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button v-if="ttForm.id" type="button" @click="resetTtForm" class="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Annuler</button>
                    <button type="submit" :disabled="ttSaving" class="flex-1 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {{ ttSaving ? '…' : 'Enregistrer' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =================== Modal Team =================== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showTeam" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showTeam = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">Équipe</h2>
              <button @click="showTeam = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div class="flex gap-6 p-6 overflow-y-auto flex-1">
              <!-- List -->
              <div class="flex-1 min-w-0">
                <div v-if="teamLoading" class="text-center py-10 text-gray-400 text-sm">Chargement…</div>
                <div v-else-if="!teamMembers.length" class="text-center py-10 text-gray-400 text-sm">Aucun membre.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="m in teamMembers"
                    :key="m.id_ac_smartteam"
                    class="flex items-center gap-3 p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <div class="w-9 h-9 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm shrink-0">
                      {{ (m.firstname?.[0] || '') + (m.lastname?.[0] || '') }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ m.firstname }} {{ m.lastname }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ m.email }} — {{ TEAM_ROLES[m.role] || m.role }}</p>
                    </div>
                    <button @click="deleteMember(m.id_ac_smartteam)" class="text-xs px-2 py-1 border border-danger-100 rounded text-danger-400 hover:bg-danger-50 shrink-0">✕</button>
                  </div>
                </div>
              </div>

              <!-- Form -->
              <div class="w-64 shrink-0 border-l border-gray-100 dark:border-slate-800 pl-6">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Ajouter un membre</h3>
                <form @submit.prevent="saveTeamMember" class="space-y-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Prénom *</label>
                    <input v-model="teamForm.firstname" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Nom *</label>
                    <input v-model="teamForm.lastname" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Email</label>
                    <input v-model="teamForm.email" type="email" class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Rôle</label>
                    <select v-model="teamForm.role" class="input-field">
                      <option v-for="(label, key) in TEAM_ROLES" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <button type="submit" :disabled="teamSaving" class="w-full py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 mt-1">
                    {{ teamSaving ? 'Création...' : 'Ajouter' }}
                  </button>
                  <!-- Result toast -->
                  <div v-if="teamToast" class="mt-2 p-2 rounded-lg text-[10px] leading-relaxed"
                    :class="teamToast.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600'">
                    {{ teamToast.message }}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =================== Modal WhatsApp Templates =================== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showWhatsApp" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showWhatsApp = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">Modèles WhatsApp</h2>
              <button @click="showWhatsApp = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div class="flex gap-6 p-6 overflow-y-auto flex-1">
              <!-- List -->
              <div class="flex-1 min-w-0">
                <div v-if="waLoading" class="text-center py-10 text-gray-400 text-sm">Chargement…</div>
                <div v-else-if="!waTemplates.length" class="text-center py-10 text-gray-400 text-sm">Aucun modèle.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="t in waTemplates"
                    :key="t.id_ac_whatsapp_template"
                    class="flex items-start justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:bg-slate-950 gap-3"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ t.title }}</p>
                      <span class="inline-block text-xs bg-success-50 text-success-700 rounded px-1.5 py-0.5 mt-1">{{ WA_TYPES[t.type] || t.type }}</span>
                      <p class="text-xs text-gray-400 mt-1 line-clamp-2">{{ t.message_body }}</p>
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                      <button @click="editWaTemplate(t)" class="text-xs px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Modifier</button>
                      <button @click="deleteWaTemplate(t.id_ac_whatsapp_template)" class="text-xs px-2 py-1 border border-danger-100 rounded text-danger-400 hover:bg-danger-50">✕</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Form -->
              <div class="w-64 shrink-0 border-l border-gray-100 dark:border-slate-800 pl-6">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">{{ waForm.id ? 'Modifier' : 'Nouveau modèle' }}</h3>
                <form @submit.prevent="saveWaTemplate" class="space-y-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Titre *</label>
                    <input v-model="waForm.title" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Type</label>
                    <select v-model="waForm.type" class="input-field">
                      <option v-for="(label, key) in WA_TYPES" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Message *</label>
                    <textarea v-model="waForm.message_body" required rows="6" class="input-field resize-none" placeholder="Bonjour {prenom}, …" />
                    <p class="text-xs text-gray-400 mt-1">Variables : {prenom} {nom} {projet}</p>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button v-if="waForm.id" type="button" @click="resetWaForm" class="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Annuler</button>
                    <button type="submit" :disabled="waSaving" class="flex-1 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {{ waSaving ? '…' : 'Enregistrer' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =================== Modal Automations =================== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAutomations" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showAutomations = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">Automatisations</h2>
              <button @click="showAutomations = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div class="flex gap-6 p-6 overflow-y-auto flex-1">
              <!-- List -->
              <div class="flex-1 min-w-0">
                <div v-if="autoLoading" class="text-center py-10 text-gray-400 text-sm">Chargement…</div>
                <div v-else-if="!automations.length" class="text-center py-10 text-gray-400 text-sm">Aucune automatisation.</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="a in automations"
                    :key="a.id_ac_smartautomation_rule"
                    class="flex items-start justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:bg-slate-950 gap-3"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span
                          class="w-2 h-2 rounded-full shrink-0"
                          :class="a.active == 1 ? 'bg-success-500' : 'bg-gray-300'"
                        />
                        <p class="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{{ a.title }}</p>
                      </div>
                      <p class="text-xs text-gray-400">
                        Si <strong>{{ AUTO_TRIGGERS[a.trigger_type] || a.trigger_type }}</strong>
                        → <strong>{{ AUTO_ACTIONS[a.action_type] || a.action_type }}</strong>
                      </p>
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                      <button @click="toggleAutomation(a)" class="text-xs px-2 py-1 border rounded" :class="a.active == 1 ? 'border-success-200 text-success-600 hover:bg-success-50' : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:bg-slate-950'">
                        {{ a.active == 1 ? 'Actif' : 'Inactif' }}
                      </button>
                      <button @click="editAutomation(a)" class="text-xs px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Modifier</button>
                      <button @click="deleteAutomation(a.id_ac_smartautomation_rule)" class="text-xs px-2 py-1 border border-danger-100 rounded text-danger-400 hover:bg-danger-50">✕</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Form -->
              <div class="w-72 shrink-0 border-l border-gray-100 dark:border-slate-800 pl-6">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">{{ autoForm.id_ac_smartautomation_rule ? 'Modifier' : 'Nouvelle règle' }}</h3>
                <form @submit.prevent="saveAutomation" class="space-y-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Nom *</label>
                    <input v-model="autoForm.title" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Déclencheur</label>
                    <select v-model="autoForm.trigger_type" class="input-field">
                      <option v-for="(label, key) in AUTO_TRIGGERS" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Action</label>
                    <select v-model="autoForm.action_type" class="input-field">
                      <option v-for="(label, key) in AUTO_ACTIONS" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">Payload (JSON)</label>
                    <textarea v-model="autoForm.action_payload" rows="4" class="input-field resize-none font-mono text-xs" placeholder='{"message": "…"}' />
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" v-model="autoForm.active" id="auto-active" class="rounded" />
                    <label for="auto-active" class="text-xs text-gray-600">Activer la règle</label>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button v-if="autoForm.id_ac_smartautomation_rule" type="button" @click="resetAutoForm" class="flex-1 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:bg-slate-950">Annuler</button>
                    <button type="submit" :disabled="autoSaving" class="flex-1 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      {{ autoSaving ? '…' : 'Enregistrer' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()
const router   = useRouter()

// ── Constants ──────────────────────────────────────────────────────────────
const STATUSES: Record<string, string> = {
  perdu_standby: 'Perdu / Standby',
  lead_entrant:  'Lead entrant',
  qualification: 'Qualification',
  devis_envoye:  'Devis envoyé',
  devis_accepte: 'Devis accepté',
  en_cours:      'En cours',
  livraison:     'Livraison',
  facture:       'Facturé',
  gagne:         'Gagné',
}

const PROJECT_TYPES: Record<string, string> = {
  site_web:    'Site PrestaShop complet',
  module_ps:   'Module PrestaShop sur-mesure',
  integration: 'Intégration ERP / PIM / WMS',
  migration:   'Migration',
  headless:    'Architecture headless',
  seo:         'Mission SEO / contenu',
  audit:       'Audit technique',
  formation:   'Formation / coaching',
  maintenance: 'TMA mensuelle',
  conseil:     'Conseil',
  autre:       'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  perdu_standby: 'bg-gray-300',
  lead_entrant:  'bg-stage-lead-300',
  qualification: 'bg-stage-qualify-400',
  devis_envoye:  'bg-stage-quoted-400',
  devis_accepte: 'bg-stage-accepted-400',
  en_cours:      'bg-stage-active-500',
  livraison:     'bg-stage-delivery-500',
  facture:       'bg-stage-invoiced-500',
  gagne:         'bg-stage-won-500',
}

const TEAM_ROLES: Record<string, string> = {
  owner:     'Propriétaire',
  developer: 'Développeur',
  designer:  'Designer',
  pm:        'Chef de projet',
  account:   'Account manager',
  other:     'Autre',
}

const WA_TYPES: Record<string, string> = {
  prospection: 'Prospection',
  relance:     'Relance',
  devis:       'Devis',
  onboarding:  'Onboarding',
  suivi:       'Suivi projet',
  livraison:   'Livraison',
  autre:       'Autre',
}

const AUTO_TRIGGERS: Record<string, string> = {
  status_change:  'Changement de statut',
  project_create: 'Création de projet',
  task_done:      'Tâche terminée',
  document_added: 'Document ajouté',
  email_sent:     'Email envoyé',
  manual:         'Manuel',
}

const AUTO_ACTIONS: Record<string, string> = {
  send_whatsapp:       'Envoyer WhatsApp',
  send_email:          'Envoyer email',
  create_task:         'Créer une tâche',
  change_status:       'Changer le statut',
  notify_team:         'Notifier l\'équipe',
  apply_task_template: 'Appliquer modèle de tâches',
}

// ── View mode ──────────────────────────────────────────────────────────────
const viewMode = ref<'kanban' | 'grid'>('kanban')

// ── Projects ───────────────────────────────────────────────────────────────
const projects       = ref<any[]>([])
const loading        = ref(true)
const showModal      = ref(false)
const editingId      = ref<number | null>(null)
const saving         = ref(false)
const formError      = ref('')
const contactSearch  = ref('')
const contactResults = ref<any[]>([])
const selectedContactName = ref('')
const draggedProject = ref<any>(null)

const emptyForm = () => ({
  project_title:   '',
  project_status:  'lead_entrant',
  project_type:    '',
  budget:          '',
  needs:           '',
  id_ac_smartlead: 0,
})
const form = ref(emptyForm())

const projectsByStatus = computed(() => {
  const map: Record<string, any[]> = {}
  for (const key of Object.keys(STATUSES)) map[key] = []
  for (const p of projects.value) {
    const key = p.project_status || 'lead_entrant'
    if (map[key]) map[key].push(p)
    else map['lead_entrant'].push(p)
  }
  return map
})

const statusColor = (key: string) => STATUS_COLORS[key] || 'bg-gray-200'

// Lead score 0-10 → label + color (inspired by hot/warm/cold scoring)
const leadLevelLabel = (lvl: number | null | undefined): string => {
  const v = Number(lvl)
  if (lvl === null || lvl === undefined || Number.isNaN(v)) return 'Non qualifié'
  if (v >= 7) return 'Chaud'
  if (v >= 4) return 'Tiède'
  return 'Froid'
}
const leadLevelAvatarClass = (lvl: number | null | undefined): string => {
  const v = Number(lvl)
  if (lvl === null || lvl === undefined || Number.isNaN(v)) return 'bg-primary-100 text-primary-600'
  if (v >= 7) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  if (v >= 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
}
const leadLevelBadgeClass = (lvl: number | null | undefined): string => {
  const v = Number(lvl)
  if (lvl === null || lvl === undefined || Number.isNaN(v)) return 'bg-gray-100 text-gray-500'
  if (v >= 7) return 'bg-rose-100 text-rose-700'
  if (v >= 4) return 'bg-amber-100 text-amber-700'
  return 'bg-sky-100 text-sky-700'
}

// lead_source slug → badge { humanized label, classes }. Fallback to raw slug.
const SOURCE_BADGES: Record<string, { label: string; cls: string }> = {
  product_form:        { label: 'Form produit',  cls: 'bg-rose-100 text-rose-700' },
  contact_form:        { label: 'Contact',       cls: 'bg-rose-100 text-rose-700' },
  demande_devis:       { label: 'Devis',         cls: 'bg-rose-100 text-rose-700' },
  calendly:            { label: 'Calendly',      cls: 'bg-blue-100 text-blue-700' },
  rdv:                 { label: 'RDV',           cls: 'bg-blue-100 text-blue-700' },
  whatsapp:            { label: 'WhatsApp',      cls: 'bg-emerald-100 text-emerald-700' },
  chatbot_product:     { label: 'Chatbot',       cls: 'bg-violet-100 text-violet-700' },
  manual:              { label: 'Manuel',        cls: 'bg-gray-200 text-gray-700' },
  blog_article:        { label: 'Blog',          cls: 'bg-indigo-100 text-indigo-700' },
  'rungis-carnet-2025':{ label: 'Atlas Rungis',  cls: 'bg-amber-100 text-amber-700' },
  import:              { label: 'Import',        cls: 'bg-slate-100 text-slate-700' },
}
const sourceBadge = (src: string): { label: string; cls: string } => {
  if (!src) return { label: '—', cls: 'bg-gray-100 text-gray-500' }
  const hit = SOURCE_BADGES[src]
  if (hit) return hit
  // Fallback: humanize the slug (snake/kebab → Title Case), neutral class
  const label = src.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 14)
  return { label, cls: 'bg-gray-100 text-gray-600' }
}

const formatPrice = (v: any) =>
  v ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v)) : ''

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

const loadProjects = async () => {
  loading.value = true
  try {
    // DB-First: direct read via Nuxt API (no PS proxy)
    const data = await $fetch<{ projects: any[] }>('/api/bo/projects')
    projects.value = data.projects || []
  } finally {
    loading.value = false
  }
}

const goToProject = (id: number) => router.push(`/hub/projects/${id}`)

const deleteProject = async (p: any) => {
  const id = Number(p?.id_ac_smartproject)
  if (!id) return
  const title = String(p?.project_title || `#${id}`)
  if (!confirm(`Supprimer définitivement « ${title} » ?\n\nTâches, emails, documents et messages WhatsApp liés seront aussi supprimés.`)) return
  try {
    await $fetch(`/api/bo/projects/${id}`, { method: 'DELETE' })
    projects.value = projects.value.filter((x) => x.id_ac_smartproject !== id)
  } catch (err: any) {
    alert(err?.data?.message || err?.message || 'Erreur suppression')
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  contactSearch.value = ''
  contactResults.value = []
  selectedContactName.value = ''
  formError.value = ''
  showModal.value = true
}

const openEdit = (p: any) => {
  editingId.value = p.id_ac_smartproject
  form.value = {
    project_title:   p.project_title   || '',
    project_status:  p.project_status  || 'lead_entrant',
    project_type:    p.project_type    || '',
    budget:          p.budget          || '',
    needs:           p.needs           || '',
    id_ac_smartlead: p.id_ac_smartlead || 0,
  }
  contactSearch.value       = p.contact_name || ''
  selectedContactName.value = p.contact_name || ''
  formError.value = ''
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

let searchTimer: ReturnType<typeof setTimeout>
const searchContacts = () => {
  form.value.id_ac_smartlead = 0
  selectedContactName.value = ''
  clearTimeout(searchTimer)
  if (contactSearch.value.length < 2) { contactResults.value = []; return }
  searchTimer = setTimeout(async () => {
    const data = await $fetch<{ contacts: any[] }>('/api/bo/smartproject/contacts/search', {
      query: { q: contactSearch.value },
    })
    contactResults.value = data.contacts || []
  }, 300)
}

const selectContact = (c: any) => {
  form.value.id_ac_smartlead = c.id_ac_smartlead
  selectedContactName.value  = `${c.firstname} ${c.lastname}`
  contactSearch.value        = `${c.firstname} ${c.lastname}`
  contactResults.value       = []
}

const saveProject = async () => {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/bo/projects/${editingId.value}`, {
        method: 'PUT',
        body: form.value,
      })
    } else {
      await $fetch('/api/bo/projects/create', {
        method: 'POST',
        body: form.value,
      })
    }
    closeModal()
    await loadProjects()
  } catch (err: any) {
    formError.value = err?.data?.message || err?.message || 'Erreur lors de la sauvegarde'
  } finally {
    saving.value = false
  }
}

const onDragStart = (e: DragEvent, p: any) => {
  draggedProject.value = p
  e.dataTransfer?.setData('text/plain', String(p.id_ac_smartproject))
}

const onDrop = async (e: DragEvent, newStatus: string) => {
  if (!draggedProject.value) return
  const p = draggedProject.value
  if (p.project_status === newStatus) return
  p.project_status = newStatus
  draggedProject.value = null
  await $fetch(`/api/bo/projects/${p.id_ac_smartproject}/status`, {
    method: 'PUT',
    body: { project_status: newStatus },
  })
}

// ── Task Templates ─────────────────────────────────────────────────────────
const showTaskTemplates    = ref(false)
const taskTemplates        = ref<any[]>([])
const taskTemplatesLoading = ref(false)
const ttSaving             = ref(false)
const ttForm               = ref({ id: 0, title: '', default_status: 'todo', days_to_deadline: 7, next_step: 0, default_description: '' })

const resetTtForm = () => {
  ttForm.value = { id: 0, title: '', default_status: 'todo', days_to_deadline: 7, next_step: 0, default_description: '' }
}

const openTaskTemplates = async () => {
  showTaskTemplates.value = true
  taskTemplatesLoading.value = true
  resetTtForm()
  try {
    const data = await $fetch<{ templates: any[] }>('/api/bo/smartproject/task-templates')
    taskTemplates.value = data.templates || []
  } finally {
    taskTemplatesLoading.value = false
  }
}

const editTaskTemplate = (t: any) => {
  ttForm.value = {
    id: t.id_ac_smarttask_template,
    title: t.title,
    default_status: t.default_status || 'todo',
    days_to_deadline: Number(t.days_to_deadline) || 0,
    next_step: Number(t.next_step) || 0,
    default_description: t.default_description || '',
  }
}

const saveTaskTemplate = async () => {
  ttSaving.value = true
  try {
    // ajaxaddtasktemplate handles both create (no id_template) and edit (id_template > 0)
    const payload = {
      id_template:         ttForm.value.id || 0,
      title:               ttForm.value.title,
      default_status:      ttForm.value.default_status,
      days_to_deadline:    ttForm.value.days_to_deadline,
      next_step:           ttForm.value.next_step,
      default_description: ttForm.value.default_description,
    }
    const data = await $fetch<{ success: boolean }>('/api/bo/smartproject/task-templates', {
      method: 'POST',
      body: payload,
    })
    if (data.success) {
      resetTtForm()
      const d2 = await $fetch<{ templates: any[] }>('/api/bo/smartproject/task-templates')
      taskTemplates.value = d2.templates || []
    }
  } finally {
    ttSaving.value = false
  }
}

const deleteTaskTemplate = async (id: number) => {
  await $fetch(`/api/bo/smartproject/task-templates/${id}`, { method: 'DELETE' })
  taskTemplates.value = taskTemplates.value.filter(t => t.id_ac_smarttask_template !== id)
}

// ── Team ───────────────────────────────────────────────────────────────────
const showTeam    = ref(false)
const teamMembers = ref<any[]>([])
const teamLoading = ref(false)
const teamSaving  = ref(false)
const teamForm    = ref({ firstname: '', lastname: '', email: '', role: 'developer' })

const openTeam = async () => {
  showTeam.value = true
  teamLoading.value = true
  teamForm.value = { firstname: '', lastname: '', email: '', role: 'developer' }
  try {
    const data = await $fetch<{ members: any[] }>('/api/bo/smartproject/team')
    teamMembers.value = data.members || []
  } finally {
    teamLoading.value = false
  }
}

const teamToast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const saveTeamMember = async () => {
  teamSaving.value = true
  teamToast.value  = null
  try {
    // 1. Add to CRM (cs_smartteam)
    const data = await $fetch<{ success: boolean; message?: string; error?: string; member?: any }>(
      '/api/bo/smartproject/team',
      { method: 'POST', body: { ...teamForm.value } },
    )
    if (!data.success) {
      teamToast.value = { type: 'error', message: data.error || data.message || 'Erreur CRM' }
      return
    }

    // 2. Create the employee in PrestaShop (Webservice)
    let psMsg = ''
    try {
      const psRes = await $fetch<{ ok: boolean; psEmployeeId?: number; psError?: string; generatedPassword?: string; message: string }>(
        '/api/team/create',
        {
          method: 'POST',
          body: {
            firstname: teamForm.value.firstname,
            lastname:  teamForm.value.lastname,
            email:     teamForm.value.email,
            role:      teamForm.value.role,
            clientId:  resolvedClientId.value,
          },
        },
      )
      psMsg = psRes.message
      if (psRes.generatedPassword) {
        psMsg += ` | Mot de passe : ${psRes.generatedPassword}`
      }
    } catch {
      psMsg = 'Membre ajout\u00e9 au CRM (cr\u00e9ation PS non disponible)'
    }

    teamToast.value = { type: 'success', message: psMsg }
    teamForm.value = { firstname: '', lastname: '', email: '', role: 'developer' }
    const d2 = await $fetch<{ members: any[] }>('/api/bo/smartproject/team')
    teamMembers.value = d2.members || []

    setTimeout(() => { teamToast.value = null }, 8000)
  } finally {
    teamSaving.value = false
  }
}

const deleteMember = async (id: number) => {
  await $fetch(`/api/bo/smartproject/team/${id}`, { method: 'DELETE' })
  teamMembers.value = teamMembers.value.filter(m => m.id_ac_smartteam !== id)
}

// ── WhatsApp Templates ─────────────────────────────────────────────────────
const showWhatsApp  = ref(false)
const waTemplates   = ref<any[]>([])
const waLoading     = ref(false)
const waSaving      = ref(false)
const waForm        = ref({ id: 0, title: '', type: 'prospection', message_body: '' })

const resetWaForm = () => {
  waForm.value = { id: 0, title: '', type: 'prospection', message_body: '' }
}

const openWhatsApp = async () => {
  showWhatsApp.value = true
  waLoading.value = true
  resetWaForm()
  try {
    const data = await $fetch<{ templates: any[] }>('/api/bo/smartproject/whatsapp-templates')
    waTemplates.value = data.templates || []
  } finally {
    waLoading.value = false
  }
}

const editWaTemplate = (t: any) => {
  waForm.value = { id: t.id_ac_whatsapp_template, title: t.title, type: t.type, message_body: t.message_body || '' }
}

const saveWaTemplate = async () => {
  waSaving.value = true
  try {
    const data = await $fetch<{ success: boolean }>('/api/bo/smartproject/whatsapp-templates', {
      method: 'POST',
      body: { ...waForm.value },
    })
    if (data.success) {
      resetWaForm()
      const d2 = await $fetch<{ templates: any[] }>('/api/bo/smartproject/whatsapp-templates')
      waTemplates.value = d2.templates || []
    }
  } finally {
    waSaving.value = false
  }
}

const deleteWaTemplate = async (id: number) => {
  await $fetch(`/api/bo/smartproject/whatsapp-templates/${id}`, { method: 'DELETE' })
  waTemplates.value = waTemplates.value.filter(t => t.id_ac_whatsapp_template !== id)
}

// ── Automations ────────────────────────────────────────────────────────────
const showAutomations = ref(false)
const automations     = ref<any[]>([])
const autoLoading     = ref(false)
const autoSaving      = ref(false)
const autoForm        = ref({ id_ac_smartautomation_rule: 0, title: '', trigger_type: 'status_change', action_type: 'send_whatsapp', action_payload: '', active: true })

const resetAutoForm = () => {
  autoForm.value = { id_ac_smartautomation_rule: 0, title: '', trigger_type: 'status_change', action_type: 'send_whatsapp', action_payload: '', active: true }
}

const openAutomations = async () => {
  showAutomations.value = true
  autoLoading.value = true
  resetAutoForm()
  try {
    const data = await $fetch<{ automations: any[] }>('/api/bo/smartproject/automations')
    automations.value = data.automations || []
  } finally {
    autoLoading.value = false
  }
}

const editAutomation = (a: any) => {
  autoForm.value = {
    id_ac_smartautomation_rule: a.id_ac_smartautomation_rule,
    title: a.title,
    trigger_type: a.trigger_type,
    action_type: a.action_type,
    action_payload: a.action_payload || '',
    active: a.active == 1,
  }
}

const saveAutomation = async () => {
  autoSaving.value = true
  try {
    const payload = {
      ...autoForm.value,
      active: autoForm.value.active ? 1 : 0,
      // conditions_json_compiled is required by the PS controller
      conditions_json_compiled: JSON.stringify([{ trigger: autoForm.value.trigger_type }]),
    }
    const data = await $fetch<{ success: boolean }>('/api/bo/smartproject/automations', {
      method: 'POST',
      body: payload,
    })
    if (data.success) {
      resetAutoForm()
      const d2 = await $fetch<{ automations: any[] }>('/api/bo/smartproject/automations')
      automations.value = d2.automations || []
    }
  } finally {
    autoSaving.value = false
  }
}

const toggleAutomation = async (a: any) => {
  const newActive = a.active == 1 ? 0 : 1
  a.active = newActive
  await $fetch('/api/bo/smartproject/automations', {
    method: 'POST',
    body: {
      id_ac_smartautomation_rule: a.id_ac_smartautomation_rule,
      title:                      a.title,
      trigger_type:               a.trigger_type,
      action_type:                a.action_type,
      active:                     newActive,
      conditions_json_compiled:   a.conditions || JSON.stringify([{ trigger: a.trigger_type }]),
    },
  })
}

const deleteAutomation = async (id: number) => {
  await $fetch(`/api/bo/smartproject/automations/${id}`, { method: 'DELETE' })
  automations.value = automations.value.filter(a => a.id_ac_smartautomation_rule !== id)
}

onMounted(loadProjects)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm
         bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
         focus:outline-none focus:ring-2 focus:ring-primary-300;
}
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
