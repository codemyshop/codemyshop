<template>
  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      <div class="flex items-baseline gap-3 mb-8">
        <h2 class="text-2xl font-bold text-foreground">Prochains événements</h2>
        <span class="text-sm text-muted">{{ events.length }} événement(s)</span>
      </div>

      
      <div v-if="!events.length" class="text-center py-16 text-muted text-sm">
        Aucun événement à venir pour le moment.
      </div>

      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="ev in events"
          :key="ev.id"
          class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
        >
          
          <div class="aspect-video bg-gray-100 overflow-hidden relative shrink-0">
            <img
              v-if="ev.coverImage"
              :src="ev.coverImage"
              :alt="ev.title"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
              </svg>
            </div>
            
            <span
              class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full"
              :class="ev.type === 'online' ? 'bg-primary-100 text-primary-700' : 'bg-gray-800/75 text-white'"
            >
              {{ ev.type === 'online' ? '🖥️ En ligne' : '📍 Présentiel' }}
            </span>
          </div>

          
          <div class="p-5 flex flex-col flex-1 gap-2">
            <h3 class="font-bold text-gray-800 text-base leading-snug">{{ ev.title }}</h3>

            <p class="text-xs text-gray-400 font-medium">
              {{ formatDate(ev.date) }}
              <span v-if="ev.endDate"> → {{ formatDate(ev.endDate) }}</span>
            </p>

            <p v-if="ev.type === 'physique' && ev.location" class="text-xs text-gray-500 truncate">
              📍 {{ ev.location }}
            </p>
            <p v-else-if="ev.type === 'online' && ev.meetingUrl" class="text-xs text-gray-500 truncate">
              🔗 {{ ev.meetingUrl }}
            </p>

            <p v-if="ev.description" class="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3 mt-1">
              {{ ev.description }}
            </p>

            
            <div v-if="ev.capacity > 0" class="mt-1">
              <div class="flex justify-between text-xs text-gray-400 mb-1">
                <span>{{ ev.registrations }} inscrit(s)</span>
                <span>{{ ev.capacity }} places</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full bg-primary-400 transition-all"
                  :style="`width:${Math.min(100, Math.round(ev.registrations / ev.capacity * 100))}%`"
                />
              </div>
            </div>

            
            <button
              @click="openRegister(ev)"
              :disabled="ev.capacity > 0 && ev.registrations >= ev.capacity"
              class="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {{ ev.capacity > 0 && ev.registrations >= ev.capacity ? 'Complet' : "S'inscrire" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal && selectedEvent"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">

            
            <div v-if="success" class="text-center py-6">
              <div class="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-1">Inscription confirmée !</h3>
              <p class="text-sm text-gray-500 mb-5">Vous recevrez une confirmation par email.</p>
              <button
                @click="closeModal"
                class="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Fermer
              </button>
            </div>

            
            <template v-else>
              <div class="flex items-start justify-between mb-5">
                <div>
                  <h3 class="font-bold text-gray-800 text-base">S'inscrire à l'événement</h3>
                  <p class="text-sm text-gray-500 mt-0.5 truncate max-w-[260px]">{{ selectedEvent.title }}</p>
                </div>
                <button @click="closeModal" class="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form @submit.prevent="submitRegistration" class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Nom complet *</label>
                  <input v-model="regForm.name" required class="register-input" placeholder="Jean Dupont" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input v-model="regForm.email" type="email" required class="register-input" placeholder="jean@exemple.fr" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                  <input v-model="regForm.phone" class="register-input" placeholder="+33 6 00 00 00 00" />
                </div>

                <p v-if="regError" class="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{{ regError }}</p>

                <button
                  type="submit"
                  :disabled="regLoading"
                  class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg v-if="regLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {{ regLoading ? 'Inscription en cours…' : "Confirmer l'inscription" }}
                </button>
              </form>
            </template>

          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import type { EventRecord } from '~/types/event'

const props = defineProps<{ events: EventRecord[] }>()

const showModal      = ref(false)
const selectedEvent  = ref<EventRecord | null>(null)
const success        = ref(false)
const regLoading     = ref(false)
const regError       = ref('')
const regForm        = reactive({ name: '', email: '', phone: '' })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function openRegister(ev: EventRecord) {
  selectedEvent.value = ev
  success.value       = false
  regError.value      = ''
  Object.assign(regForm, { name: '', email: '', phone: '' })
  showModal.value     = true
}

function closeModal() {
  showModal.value     = false
  selectedEvent.value = null
}

async function submitRegistration() {
  if (!selectedEvent.value) return
  regLoading.value = true
  regError.value   = ''
  try {
    await $fetch(`/api/events/${selectedEvent.value.id}/register`, {
      method: 'POST',
      body: regForm,
    })
    success.value = true
    
    const local = props.events.find(e => e.id === selectedEvent.value!.id)
    if (local) local.registrations++
  } catch (e: any) {
    regError.value = e.data?.message ?? e.message ?? "Erreur lors de l'inscription"
  } finally {
    regLoading.value = false
  }
}
</script>

<style scoped>
.register-input {
  @apply w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition;
}
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
