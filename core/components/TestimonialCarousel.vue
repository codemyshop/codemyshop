<script setup lang="ts">
// DB-Only (Vague 3) : reviews depuis cs_reviews via /api/reviews.
// Mapping {author, company, text, date} → {auteur, marque_nom, corps_du_message, date}
// to preserve legacy templates.
interface ApiReview { author: string; company?: string; text: string; date: string; rating: number }
interface Review { auteur: string; date: string; marque_nom: string; corps_du_message: string }

const { data: reviewsData } = await useFetch<{ reviews: ApiReview[] }>('/api/reviews', {
  query: { limit: 50 },
  default: () => ({ reviews: [] }),
})
const reviews = computed<Review[]>(() => (reviewsData.value?.reviews ?? []).map(r => ({
  auteur: r.author,
  date: r.date,
  marque_nom: r.company ?? '',
  corps_du_message: r.text,
})))
</script>

<template>
  <!-- Hides lateral overflows -->
  <div class="overflow-hidden relative">
    <!-- Fondu gauche -->
    <div class="testimonial-fade absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-gray-50 to-transparent" />
    <!-- Fondu droite -->
    <div class="testimonial-fade absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-gray-50 to-transparent" />

    <!-- Animated track: two copies for a seamless loop -->
    <div class="flex gap-5 marquee-track">
      <!-- Copie 1 -->
      <div
        v-for="(review, i) in reviews"
        :key="`a-${i}`"
        class="shrink-0 w-72 bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col gap-3"
      >
        <!-- Stars -->
        <div class="flex gap-0.5">
          <svg
            v-for="s in 5"
            :key="s"
            class="w-4 h-4 text-warning-400 fill-current"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>

        <!-- Texte de l'avis -->
        <p class="text-sm text-gray-600 leading-relaxed line-clamp-4">
          {{ review.corps_du_message }}
        </p>

        <!-- Auteur -->
        <div class="mt-auto pt-2 border-t border-gray-50">
          <p class="text-sm font-bold text-gray-900">{{ review.auteur }}</p>
          <p v-if="review.marque_nom" class="text-xs text-gray-400">
            {{ review.marque_nom }}
          </p>
          <p class="text-xs text-gray-300 mt-0.5">{{ review.date }}</p>
        </div>
      </div>

      <!-- Copy 2 (identical, for seamless loop) -->
      <div
        v-for="(review, i) in reviews"
        :key="`b-${i}`"
        class="shrink-0 w-72 bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col gap-3"
      >
        <div class="flex gap-0.5">
          <svg
            v-for="s in 5"
            :key="s"
            class="w-4 h-4 text-warning-400 fill-current"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed line-clamp-4">
          {{ review.corps_du_message }}
        </p>
        <div class="mt-auto pt-2 border-t border-gray-50">
          <p class="text-sm font-bold text-gray-900">{{ review.auteur }}</p>
          <p v-if="review.marque_nom" class="text-xs text-gray-400">
            {{ review.marque_nom }}
          </p>
          <p class="text-xs text-gray-300 mt-0.5">{{ review.date }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee-track {
  /* width = 2 × sum of cards (w-72 = 288px + gap 20px = 308px × n) */
  width: max-content;
  animation: marquee 80s linear infinite;
}

.marquee-track:hover {
  animation-play-state: paused;
}

@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
