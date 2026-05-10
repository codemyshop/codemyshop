<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <NuxtLayout name="white-label">

    <!-- ═══ HERO ══════════════════════════════════════════════════════════ -->
    <section class="pt-28 md:pt-32 pb-16 bg-white dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <div class="flex items-center gap-3 mb-6">
          <span class="inline-block bg-primary-50 text-primary-700 dark:bg-primary-600/15 dark:text-primary-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full">Théorie du système</span>
          <span class="text-xs text-gray-500 dark:text-slate-400">~8 min de lecture</span>
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
          La Flywheel CodeMyShop<br>
          <span class="text-primary-600 dark:text-primary-400">Un système de croissance exponentielle</span>
        </h1>
        <p class="text-lg text-gray-500 dark:text-slate-400 leading-relaxed max-w-3xl mb-8">
          La plupart des agences vendent des sites. Nous construisons un système qui s'améliore seul à chaque tour de roue. Cette page explique pourquoi — et comment.
        </p>
        <a href="#schema" class="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">Voir le schéma interactif ↓</a>
      </div>
    </section>

    <!-- ═══ OUROBOROS — The origin of the concept ══════════════════════════════ -->
    <section class="py-16 bg-gray-50 dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <!-- Image Ouroboros -->
          <div class="flex justify-center">
            <img :src="'/ouroboros.webp'" alt="L'Ouroboros Numérique — Symbole de la Flywheel CodeMyShop" class="w-full max-w-sm rounded-2xl shadow-xl dark:shadow-slate-900/50" />
          </div>
          <!-- Texte -->
          <div>
            <span class="inline-block bg-accent-50 text-accent-600 dark:bg-accent-600/15 dark:text-accent-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">L'Ouroboros Numérique</span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Le serpent qui se nourrit de lui-même</h2>
            <p class="text-base text-gray-600 dark:text-slate-400 leading-relaxed mb-6">
              L'Ouroboros — le serpent qui se mord la queue — est le symbole le plus ancien de la boucle auto-alimentée. C'est exactement ce que fait notre Flywheel : chaque tour nourrit le suivant, chaque donnée renforce le système.
            </p>
            <div class="space-y-4">
              <div v-for="symbol in ouroborosSymbols" :key="symbol.name" class="flex items-start gap-3">
                <span class="text-xl shrink-0 mt-0.5">{{ symbol.icon }}</span>
                <div>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ symbol.name }}</p>
                  <p class="text-sm text-gray-500 dark:text-slate-400">{{ symbol.meaning }}</p>
                </div>
              </div>
            </div>
            <p class="mt-6 text-sm text-gray-500 dark:text-slate-400 italic">
              Au centre de la gravure : {{ agentCount }} agents IA spécialisés orchestrés par le Synedre. Le souverain ne fait pas — il décide. L'IA exécute.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ SECTION 1 — Sequential model problem ════════════════════ -->
    <section class="py-16 bg-gray-50 dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Pourquoi la croissance linéaire plafonne toujours</h2>
        <div class="space-y-6 text-base text-gray-600 dark:text-slate-400 leading-relaxed">
          <p>Dans un modèle séquentiel, chaque euro investi produit un retour fixe : 1€ → 3€ de CA. Toujours. Au tour 10 comme au tour 1. Le système n'apprend rien.</p>
          <p>Dans un modèle Flywheel, 1€ investi au tour 4 produit 8€ de CA — <strong class="text-gray-900 dark:text-white">parce que le système a accumulé de l'intelligence</strong>. Les données du tour 1 nourrissent l'IA du tour 2, qui produit du contenu meilleur au tour 3, qui génère plus de trafic au tour 4.</p>
        </div>

        <!-- Graphique SVG — ROI par tour -->
        <div class="mt-10">
          <svg viewBox="0 0 600 320" class="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="flywheelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4F46E5" />
                <stop offset="100%" stop-color="#EC4899" />
              </linearGradient>
              <linearGradient id="flywheelFill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.08" />
                <stop offset="100%" stop-color="#EC4899" stop-opacity="0.08" />
              </linearGradient>
            </defs>

            <!-- Grille horizontale -->
            <line v-for="y in [0, 2, 4, 6, 8, 10, 12]" :key="'grid-'+y"
              x1="70" :y1="280 - y * 22" x2="560" :y1_="0" :y2="280 - y * 22"
              class="stroke-gray-200 dark:stroke-slate-700" stroke-width="0.5" />

            <!-- Axe Y labels -->
            <text v-for="y in [0, 2, 4, 6, 8, 10, 12]" :key="'label-y-'+y"
              x="60" :y="284 - y * 22" text-anchor="end"
              class="fill-gray-400 dark:fill-slate-500" font-size="10">{{ y }}€</text>

            <!-- Axe X labels -->
            <text v-for="x in 6" :key="'label-x-'+x"
              :x="70 + (x - 1) * 98" y="300" text-anchor="middle"
              class="fill-gray-400 dark:fill-slate-500" font-size="10">Tour {{ x }}</text>

            <!-- Axe Y titre -->
            <text x="15" y="160" text-anchor="middle" transform="rotate(-90, 15, 160)"
              class="fill-gray-400 dark:fill-slate-500" font-size="9">ROI (€ / € investi)</text>

            <!-- Fill area under the Flywheel curve -->
            <polygon
              points="70,214 168,192 266,159 364,104 462,60 560,16 560,280 70,280"
              fill="url(#flywheelFill)" />

            <!-- Linear curve (sequential) -->
            <line x1="70" y1="214" x2="560" y2="214"
              stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
            <!-- Sequential points -->
            <circle v-for="x in 6" :key="'seq-'+x" :cx="70 + (x-1) * 98" cy="214" r="3" fill="#94a3b8" />

            <!-- Courbe Flywheel -->
            <polyline
              points="70,214 168,192 266,159 364,104 462,60 560,16"
              stroke="url(#flywheelGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <!-- Points Flywheel -->
            <circle v-for="(pt, i) in [[70,214],[168,192],[266,159],[364,104],[462,60],[560,16]]" :key="'fw-'+i"
              :cx="pt[0]" :cy="pt[1]" r="4" fill="#4F46E5" stroke="white" stroke-width="2" />

            <!-- Point de bascule (tour 3) -->
            <circle cx="266" cy="159" r="7" fill="#4F46E5" opacity="0.2" />
            <circle cx="266" cy="159" r="5" fill="#4F46E5" />
            <line x1="266" y1="140" x2="266" y2="115" stroke="#4F46E5" stroke-width="1" stroke-dasharray="3 2" />
            <rect x="226" y="98" width="80" height="18" rx="4" class="fill-white dark:fill-slate-800" stroke="#4F46E5" stroke-width="1" />
            <text x="266" y="111" text-anchor="middle" class="fill-primary-600 dark:fill-primary-400" font-size="9" font-weight="700">Point de bascule</text>

            <!-- Annotation tour 4 — Flywheel -->
            <rect x="330" y="72" width="68" height="24" rx="6" class="fill-white dark:fill-slate-800" stroke="#4F46E5" stroke-width="1.5" />
            <text x="364" y="88" text-anchor="middle" class="fill-primary-600 dark:fill-primary-400" font-size="11" font-weight="800">1€ → 8€</text>
            <line x1="364" y1="96" x2="364" y2="104" stroke="#4F46E5" stroke-width="1" />

            <!-- Round 4 annotation — Sequential -->
            <text x="364" y="207" text-anchor="middle" class="fill-gray-400 dark:fill-slate-500" font-size="9">1€ → 3€ (toujours)</text>

            <!-- Labels de courbe (droite) -->
            <text x="570" y="218" class="fill-gray-400 dark:fill-slate-500" font-size="9" font-weight="600">Séquentiel</text>
            <text x="570" y="14" class="fill-primary-600 dark:fill-primary-400" font-size="9" font-weight="600">Flywheel</text>
          </svg>

          <!-- Legend -->
          <div class="flex flex-wrap justify-center gap-6 mt-4">
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <div class="w-6 h-0.5 bg-gray-400 rounded" />
              Modèle séquentiel (fixe)
            </div>
            <div class="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
              <div class="w-6 h-0.5 bg-gradient-to-r from-primary-600 to-accent-500 rounded" />
              Flywheel CodeMyShop (cumulatif)
            </div>
          </div>
        </div>

        <!-- Key phrase -->
        <p class="text-center text-sm font-semibold text-gray-700 dark:text-slate-300 my-10 max-w-xl mx-auto">
          Ce qui change entre le tour 1 et le tour 4, ce n'est pas le budget.<br>
          <span class="text-primary-600 dark:text-primary-400">C'est l'intelligence accumulée du système.</span>
        </p>

        <!-- Tableau comparatif -->
        <div class="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
          <table class="w-full text-sm divide-y divide-gray-100 dark:divide-slate-700">
            <thead class="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th class="text-left px-4 py-3 text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400 font-semibold">Indicateur</th>
                <th class="text-center px-4 py-3 text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400 font-semibold">❌ Séquentiel</th>
                <th class="text-center px-4 py-3 text-xs uppercase tracking-widest text-primary-600 dark:text-primary-400 font-semibold">♾️ Flywheel</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
              <tr v-for="row in comparisonTable" :key="row.label">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ row.label }}</td>
                <td class="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{{ row.sequential }}</td>
                <td class="px-4 py-3 text-center font-semibold text-primary-600 dark:text-primary-400">{{ row.flywheel }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ═══ SECTION 2 — The 4 steps ═════════════════════════════════════ -->
    <section class="py-16 bg-white dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Les 4 étapes — et les boucles de rétroaction que personne ne voit</h2>
        <p class="text-base text-gray-500 dark:text-slate-400 mb-12">Chaque étape nourrit la suivante. Mais les vrais leviers sont invisibles en surface.</p>

        <div class="space-y-12">
          <div v-for="(step, i) in steps" :key="i" class="relative p-8 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-white/[0.02]">
            <!-- Step number -->
            <div class="absolute -top-4 left-8 px-3 py-1 rounded-full text-xs font-bold text-white" :style="{ background: step.color }">Étape {{ i + 1 }}</div>

            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6 mt-2">{{ step.title }}</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <!-- En surface -->
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">En surface</p>
                <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{{ step.surface }}</p>
              </div>
              <!-- Hidden lever -->
              <div>
                <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-2">Le levier exponentiel caché</p>
                <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{{ step.lever }}</p>
              </div>
            </div>

            <!-- Feedback loop -->
            <div class="p-4 rounded-xl bg-primary-50/50 dark:bg-primary-600/5 border border-primary-100 dark:border-primary-500/10 mb-4">
              <p class="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Boucle de rétroaction</p>
              <p class="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{{ step.loop }}</p>
            </div>

            <!-- Metric -->
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-accent-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ step.metric }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ SECTION 3 — Feedback loop diagram ═══════════════════ -->
    <section id="schema" class="py-16 bg-gray-50 dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Les boucles de rétroaction — ce qui rend le système exponentiel</h2>
          <p class="text-sm text-gray-500 dark:text-slate-400">Chaque étape nourrit les autres. Les flèches transversales sont les leviers cachés.</p>
        </div>

        <!-- SVG diagram of loops -->
        <div class="relative max-w-3xl mx-auto">
          <svg viewBox="0 0 800 800" class="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Gradient centre -->
              <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.05"/>
              </radialGradient>
              <!-- Glow filters -->
              <filter id="glow-rose"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-indigo"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-teal"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-accent"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <!-- Markers -->
              <marker id="fw-arr-primary" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#4F46E5" /></marker>
              <marker id="fw-arr-accent" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#ec4899" /></marker>
              <marker id="fw-arr-teal" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#0d9488" /></marker>
              <marker id="fw-arr-rose" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#f43f5e" /></marker>
              <marker id="fw-arr-rose-sm" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#f43f5e" /></marker>
              <marker id="fw-arr-teal-sm" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#0d9488" /></marker>
              <marker id="fw-arr-primary-sm" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#4F46E5" /></marker>
              <!-- Animated dash -->
              <style>
                @keyframes fw-dash { to { stroke-dashoffset: -20; } }
                @keyframes fw-pulse-node { 0%,100% { r: 55; } 50% { r: 60; } }
                .fw-flow { animation: fw-dash 1.5s linear infinite; }
                .fw-node-pulse { animation: fw-pulse-node 4s ease-in-out infinite; }
              </style>
            </defs>

            <!-- Cercle orbital principal -->
            <circle cx="400" cy="400" r="300" stroke="currentColor" class="text-gray-200 dark:text-slate-700" stroke-width="2" stroke-dasharray="10 8" />

            <!-- Main flow (solid animated arcs) -->
            <path d="M 400 100 A 300 300 0 0 1 700 400" stroke="#4F46E5" stroke-width="3.5" stroke-linecap="round" marker-end="url(#fw-arr-primary)" filter="url(#glow-indigo)" />
            <path d="M 700 400 A 300 300 0 0 1 400 700" stroke="#ec4899" stroke-width="3.5" stroke-linecap="round" marker-end="url(#fw-arr-accent)" filter="url(#glow-accent)" />
            <path d="M 400 700 A 300 300 0 0 1 100 400" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round" marker-end="url(#fw-arr-teal)" filter="url(#glow-teal)" />
            <path d="M 100 400 A 300 300 0 0 1 400 100" stroke="#f43f5e" stroke-width="3.5" stroke-linecap="round" marker-end="url(#fw-arr-rose)" filter="url(#glow-rose)" />

            <!-- Energy particles (animated dashes on the orbit) -->
            <circle cx="400" cy="400" r="300" fill="none" stroke="#4F46E5" stroke-width="1" stroke-dasharray="4 40" class="fw-flow" opacity="0.4" />

            <!-- Cross-cutting loops (hidden levers) -->
            <!-- Data → IA (Marque → Moteur IA) -->
            <line x1="400" y1="155" x2="400" y2="645" stroke="#f43f5e" stroke-width="2" stroke-dasharray="8 5" opacity="0.85" marker-end="url(#fw-arr-rose-sm)" />
            <!-- Authority → Sovereignty (Traction → Brand) -->
            <line x1="155" y1="400" x2="390" y2="155" stroke="#0d9488" stroke-width="2" stroke-dasharray="8 5" opacity="0.85" marker-end="url(#fw-arr-teal-sm)" />
            <!-- Crawl → Traction (Headless → Traction) — goes above the center -->
            <line x1="645" y1="250" x2="155" y2="250" stroke="#4F46E5" stroke-width="2" stroke-dasharray="8 5" opacity="0.85" marker-end="url(#fw-arr-primary-sm)" />

            <!-- Cross-cutting labels (with background for readability) -->
            <rect x="370" y="390" width="60" height="16" rx="4" class="fill-white dark:fill-slate-900" fill-opacity="0.9" />
            <text x="400" y="402" text-anchor="middle" class="fill-rose-500" font-size="10" font-weight="700">Data → IA</text>

            <rect x="220" y="250" width="100" height="16" rx="4" class="fill-white dark:fill-slate-900" fill-opacity="0.9" />
            <text x="270" y="262" text-anchor="middle" class="fill-teal-600 dark:fill-teal-400" font-size="10" font-weight="700">Autorité → Marque</text>

            <rect x="360" y="240" width="95" height="16" rx="4" class="fill-white dark:fill-slate-900" fill-opacity="0.9" />
            <text x="407" y="252" text-anchor="middle" class="fill-indigo-500" font-size="10" font-weight="700">Crawl → Traction</text>

            <!-- Nœud 1 — MARQUE (top) -->
            <circle cx="400" cy="100" r="55" class="fill-white dark:fill-slate-800 fw-node-pulse" stroke="#f43f5e" stroke-width="3" />
            <text x="400" y="93" text-anchor="middle" class="fill-gray-900 dark:fill-white" font-size="28">🏛️</text>
            <text x="400" y="120" text-anchor="middle" class="fill-gray-600 dark:fill-slate-300" font-size="11" font-weight="700">MARQUE</text>

            <!-- Nœud 2 — HEADLESS (right) -->
            <circle cx="700" cy="400" r="55" class="fill-white dark:fill-slate-800 fw-node-pulse" stroke="#4F46E5" stroke-width="3" style="animation-delay: 1s;" />
            <text x="700" y="393" text-anchor="middle" class="fill-gray-900 dark:fill-white" font-size="28">⚡</text>
            <text x="700" y="420" text-anchor="middle" class="fill-gray-600 dark:fill-slate-300" font-size="11" font-weight="700">HEADLESS</text>

            <!-- Nœud 3 — MOTEUR IA (bottom) -->
            <circle cx="400" cy="700" r="55" class="fill-white dark:fill-slate-800 fw-node-pulse" stroke="#ec4899" stroke-width="3" style="animation-delay: 2s;" />
            <text x="400" y="693" text-anchor="middle" class="fill-gray-900 dark:fill-white" font-size="28">🤖</text>
            <text x="400" y="720" text-anchor="middle" class="fill-gray-600 dark:fill-slate-300" font-size="11" font-weight="700">MOTEUR IA</text>

            <!-- Nœud 4 — TRACTION (left) -->
            <circle cx="100" cy="400" r="55" class="fill-white dark:fill-slate-800 fw-node-pulse" stroke="#0d9488" stroke-width="3" style="animation-delay: 3s;" />
            <text x="100" y="393" text-anchor="middle" class="fill-gray-900 dark:fill-white" font-size="28">📈</text>
            <text x="100" y="420" text-anchor="middle" class="fill-gray-600 dark:fill-slate-300" font-size="11" font-weight="700">TRACTION</text>

            <!-- Central node — FLYWHEEL (above the lines) -->
            <circle cx="400" cy="400" r="45" class="fill-white dark:fill-slate-900" />
            <circle cx="400" cy="400" r="45" fill="url(#centerGrad)" stroke="#4F46E5" stroke-width="2.5" />
            <text x="400" y="395" text-anchor="middle" class="fill-primary-600 dark:fill-primary-400" font-size="13" font-weight="700">FLYWHEEL</text>
            <text x="400" y="412" text-anchor="middle" class="fill-primary-400 dark:fill-primary-500" font-size="9">CodeMyShop</text>
          </svg>
        </div>

        <!-- Explanations below the diagram -->
        <div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div class="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-slate-800">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-rose-500" />
              <p class="text-xs font-bold text-gray-900 dark:text-white">Data → IA</p>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Vos données comportementales (étape 1) nourrissent directement le moteur IA (étape 3). Plus vous avez de data, plus le contenu généré est pertinent.</p>
          </div>
          <div class="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-slate-800">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-teal-500" />
              <p class="text-xs font-bold text-gray-900 dark:text-white">Autorité → Marque</p>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">L'autorité thématique acquise (étape 4) renforce la souveraineté de la marque (étape 1). Google vous considère comme référent — votre domaine prend de la valeur.</p>
          </div>
          <div class="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-slate-800">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full bg-indigo-500" />
              <p class="text-xs font-bold text-gray-900 dark:text-white">Crawl → Traction</p>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">L'architecture rapide (étape 2) maximise le crawl budget Google, accélérant directement la traction SEO (étape 4). Vitesse = indexation = trafic.</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <div class="w-8 h-0.5 bg-primary-600 rounded" />
            <span>Flux principal (chaque étape nourrit la suivante)</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <div class="w-8 h-0.5 border-t-2 border-dashed border-rose-400 rounded" />
            <span>Boucles transversales (leviers exponentiels cachés)</span>
          </div>
        </div>

      </div>
    </section>

    <!-- ═══ SECTION 4 — Proof by numbers ══════════════════════════ -->
    <section class="py-16 bg-white dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Le modèle mathématique simplifié</h2>
        <p class="text-base text-gray-500 dark:text-slate-400 mb-8">Projection sur 4 tours de Flywheel, basée sur un budget IA mensuel de 150€ et le cas réel voguimmo.com.</p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-primary-600 text-white">
                <th class="px-4 py-3 text-left font-semibold rounded-tl-xl">Tour</th>
                <th class="px-4 py-3 text-center font-semibold">Budget IA</th>
                <th class="px-4 py-3 text-center font-semibold">Pages générées</th>
                <th class="px-4 py-3 text-center font-semibold">Trafic organique</th>
                <th class="px-4 py-3 text-center font-semibold">CA estimé</th>
                <th class="px-4 py-3 text-center font-semibold rounded-tr-xl">ROI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in roiTable" :key="row.tour" class="border-b border-gray-100 dark:border-slate-800">
                <td class="px-4 py-3 font-bold text-gray-900 dark:text-white">{{ row.tour }}</td>
                <td class="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{{ row.budget }}</td>
                <td class="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{{ row.pages }}</td>
                <td class="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{{ row.traffic }}</td>
                <td class="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">{{ row.ca }}</td>
                <td class="px-4 py-3 text-center font-bold text-primary-600 dark:text-primary-400">{{ row.roi }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-4 text-xs text-gray-500 dark:text-slate-400 italic">Projections basées sur le cas voguimmo.com : ×15 trafic en 12 mois, 20,2k clics, 1,93M impressions. Budget IA mensuel 150€.</p>
      </div>
    </section>

    <!-- ═══ SECTION 5 — What you buy ══════════════════════════════ -->
    <section class="py-16 bg-gray-50 dark:bg-slate-900">
      <div class="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-10 text-center">Ce que vous achetez réellement</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="col in compareColumns" :key="col.title" class="p-7 rounded-2xl border-2 transition-all" :class="col.highlight ? 'border-primary-500 bg-white dark:bg-white/[0.03] shadow-lg' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-white/[0.01]'">
            <div v-if="col.highlight" class="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-3">Recommandé</div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ col.title }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-5">{{ col.subtitle }}</p>
            <ul class="space-y-3">
              <li v-for="item in col.items" :key="item" class="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
                <svg class="w-4 h-4 shrink-0 mt-0.5" :class="col.highlight ? 'text-primary-500' : 'text-gray-300 dark:text-slate-600'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ SECTION 6 — CTA ══════════════════════════════════════════════ -->
    <section class="py-20 bg-primary-600 dark:bg-primary-700 relative overflow-hidden">
      <div class="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
      <div class="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-6">Prêt à construire votre Flywheel ?</h2>
        <p class="text-base text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">Premier appel de 30 minutes : on cartographie votre tour 1 ensemble. Pas de pitch — un diagnostic clair.</p>
        <div class="flex flex-wrap justify-center gap-4">
          <a href="https://calendly.com/contact-alexandrecarette/30min" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Réserver mon appel stratégique
          </a>
          <NuxtLink to="/offre-starter" class="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-bold rounded-xl text-sm hover:bg-white/20 transition-colors border border-white/20">
            Découvrir les offres →
          </NuxtLink>
        </div>
      </div>
    </section>

  </NuxtLayout>
</template>

<script setup lang="ts">
const siteUrl = 'https://codemyshop.com'

definePageMeta({ layout: false })

// ── Dynamic data ───────────────────────────────────────────────────
const { data: siteStats } = await useFetch('/api/stats')
const agentCount = computed(() => siteStats.value?.totalAgents ?? 23)

const ouroborosSymbols = [
  { icon: '🐍', name: 'L\'Ouroboros', meaning: 'La Flywheel — boucle de croissance auto-alimentée qui accélère à chaque tour.' },
  { icon: '☥', name: 'L\'Ankh', meaning: 'La clé de l\'orchestration — les agents IA qui donnent vie au système.' },
  { icon: '👁️', name: 'L\'Œil d\'Horus', meaning: 'La vigilance permanente — ce qui est brisé revient plus fort (feedback loop).' },
  { icon: '🏛️', name: 'Le Souverain', meaning: 'La souveraineté humaine — l\'architecte décide, l\'IA exécute.' },
  { icon: '📜', name: 'Le Parchemin', meaning: 'La connaissance codifiée — chaque profil d\'agent est un capital intellectuel.' },
]

useHead({
  title: 'La Flywheel CodeMyShop — Théorie d\'un système e-commerce exponentiel | CodeMyShop',
  meta: [
    { name: 'description', content: 'Comment PrestaShop Headless, la data souveraine et l\'IA forment une boucle de croissance exponentielle. La théorie complète du système CodeMyShop par CodeMyShop.' },
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/flywheel` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${siteUrl}/flywheel#article`,
        url: `${siteUrl}/flywheel`,
        headline: 'La Flywheel CodeMyShop — Un système de croissance exponentielle',
        description: 'Comment PrestaShop Headless, la data souveraine et l\'IA forment une boucle de croissance exponentielle.',
        inLanguage: 'fr-FR',
        datePublished: '2025-06-01',
        dateModified: '2026-03-18',
        author: { '@type': 'Person', '@id': `${siteUrl}/#person`, name: 'CodeMyShop' },
        publisher: { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: 'CodeMyShop' },
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/flywheel` },
      }),
    },
  ],
})

const comparisonTable = [
  { label: 'Coût contenu', sequential: 'Fixe (45 min/fiche)', flywheel: 'Décroissant (8 sec/fiche au tour 4)' },
  { label: 'Vitesse indexation', sequential: 'Constante (3-6 mois)', flywheel: 'Accélère (3 semaines au tour 4)' },
  { label: 'Qualité ciblage', sequential: 'Statique (brief humain)', flywheel: 'Améliorée par la data à chaque tour' },
  { label: 'Autorité domaine', sequential: 'Linéaire', flywheel: 'Exponentielle (effet catalogue)' },
]

const steps = [
  {
    title: 'La Marque Souveraine — Le Socle Data',
    color: '#f43f5e',
    surface: 'Domaine propre, VPS français, 0% de commission sur les ventes. Vous êtes propriétaire de votre infrastructure.',
    lever: 'Accès à 100% des données brutes : logs serveur, search queries internes, comportement utilisateur précis. Des données que Shopify garde pour lui.',
    loop: 'Plus la marque accumule de data propriétaire, plus les insights sont précis pour nourrir l\'IA à l\'étape 3. La donnée est le carburant — et vous en êtes le seul propriétaire.',
    metric: 'Chez Shopify, 0% de vos données comportementales vous appartiennent. Chez CodeMyShop, 100%.',
  },
  {
    title: 'L\'Usine Headless — L\'Accélérateur de Conversion',
    color: '#4F46E5',
    surface: 'Nuxt 3 + PrestaShop = vitesse de chargement exceptionnelle + SEO natif. Core Web Vitals au vert.',
    lever: 'La vitesse améliore le crawl budget Google — plus de pages indexées, plus vite. Chaque nouvelle page IA déployée ne dégrade pas l\'UX existante car l\'architecture est découplée.',
    loop: 'Architecture rapide = capacité à publier massivement sans dette technique. Le moteur IA peut scaler sans plafond technique.',
    metric: 'Core Web Vitals > 90 = budget de crawl 3× supérieur à un thème classique.',
  },
  {
    title: 'Le Moteur IA — Le Scaler Asymétrique',
    color: '#ec4899',
    surface: 'Contenu SEO et social publié 24/7 : fiches produit, articles de blog, posts réseaux sociaux.',
    lever: 'L\'IA ne produit pas juste du contenu — elle analyse les données de l\'étape 1 (ce que les gens cherchent dans le catalogue) et les performances SEO de l\'étape 2 pour s\'améliorer. Effet catalogue : chaque fiche produit = une porte d\'entrée Google. 500 produits = 500 portes. 5000 = 5000 portes. Zéro coût marginal humain.',
    loop: 'Le coût unitaire de création s\'effondre pendant que qualité et ciblage s\'améliorent. C\'est le point de bascule — le moment où chaque euro investi produit exponentiellement plus.',
    metric: 'Le coût de production d\'une fiche produit SEO passe de 45 min (humain) à 8 secondes (IA) — avec un taux d\'indexation supérieur.',
  },
  {
    title: 'La Traction — Le Carburant + L\'Autorité Thématique',
    color: '#0d9488',
    surface: 'Trafic organique → CA → réinvestissement dans le système.',
    lever: 'Domination de la longue traîne = autorité thématique massive aux yeux de Google. Ce qui prenait 3 mois à ranker au tour 1 prend 3 semaines au tour 4.',
    loop: 'L\'autorité thématique fait ranker les nouvelles pages plus vite. La marque devient incontournable sur sa verticale — ce qui renforce la souveraineté de l\'étape 1. La boucle se referme.',
    metric: 'Cas voguimmo.com : ×15 de trafic en 12 mois, 20,2k clics, 1,93M impressions — sur un POC sans PrestaShop Headless.',
  },
]

const roiTable = [
  { tour: 'Tour 1 (M1-M3)', budget: '150€/mois', pages: '50', traffic: '500/mois', ca: '2 000€', roi: '×4' },
  { tour: 'Tour 2 (M4-M6)', budget: '150€/mois', pages: '200', traffic: '3 000/mois', ca: '8 000€', roi: '×18' },
  { tour: 'Tour 3 (M7-M9)', budget: '150€/mois', pages: '500', traffic: '12 000/mois', ca: '25 000€', roi: '×55' },
  { tour: 'Tour 4 (M10-M12)', budget: '150€/mois', pages: '1 000', traffic: '35 000/mois', ca: '60 000€', roi: '×133' },
]

const compareColumns = [
  {
    title: 'Agence classique',
    subtitle: 'Vous achetez "un site web"',
    highlight: false,
    items: ['Coût fixe élevé (10-50k€)', 'Résultats plafonnant après livraison', 'Dépendance pour chaque modification', 'Aucun effet composé dans le temps'],
  },
  {
    title: 'SaaS (Shopify)', // saas-ok: référence concurrent
    subtitle: 'Vous achetez "un abonnement"',
    highlight: false,
    items: ['Coût croissant (commissions + apps)', 'Données non souveraines', 'SEO bridé par la plateforme', 'Vous êtes locataire, pas propriétaire'],
  },
  {
    title: 'CodeMyShop Flywheel',
    subtitle: 'Vous achetez "un système qui s\'améliore seul"',
    highlight: true,
    items: ['Coût décroissant par unité produite', 'Données 100% souveraines (France)', 'SEO qui accélère à chaque tour', 'Vous possédez l\'actif — code, data, infra'],
  },
]
</script>
