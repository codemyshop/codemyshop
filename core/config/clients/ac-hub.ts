import type { HeaderConfig } from '~/types/theme'

const config: HeaderConfig = {
  clientId: 'ac-hub',
  domain:   ['codemyshop.com', 'www.codemyshop.com', 'localhost'],

  // ── Graphic theme ───────────────────────────────────────────────────────
  theme: {
    colors: {
      primary:    '#4F46E5',   // indigo-600
      secondary:  '#0D9488',   // teal-600
      background: '#F9FAFB',   // gray-50
      foreground: '#111827',   // gray-900
      muted:      '#6B7280',   // gray-500
      headerBg:   '#ffffff',
      footerBg:   '#ffffff',
      topBarBg:   '#111827',
      topBarText: '#ffffff',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      // Combo Inter (body) + Playfair Display (titles font-serif) in a single
      // Google Fonts call → 1 blocking request instead of 2.
      fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400;1,700&display=swap',
    },
    ui: {
      borderRadius: 'lg',
      shadow: true,
    },
  },

  defaultColorMode: 'light',

  // No top bar for a minimalist professional portfolio
  topBar: undefined,

  logo: {
    src:  '/logo-ac.svg',
    text: 'CodeMyShop',
    href: '/',
    alt:  'CodeMyShop — Architecte E-commerce Souverain',
  },

  contactEmail: 'contact@codemyshop.com',

  features: {
    showSearch:    false,
    showWishlist:  false,
    showLogin:     true,
    showContact:   false,
    stickyHeader:  false,
    headerLayout:  'inline',
  },

  menu: {
    items: [
      { label: 'Expertise',         href: '/expertise' },
      { label: 'Blog',              href: '/blog' },
      { label: 'Modules PrestaShop', href: '/modules' },
      { label: 'Outils IA',          href: '/outils-ia' },
      {
        label:     'Offre Starter \u2728',
        href:      '/offre-starter',
        highlight: true,
      },
      { label: 'Academy',           href: '/academy' },
      { label: 'À propos',          href: '/a-propos' },
      { label: 'Contact',           href: '/contact' },
    ],
  },

  // ── Blog (marque blanche) ─────────────────────────────────────────────────
  blog: {
    title:       'Blog — CodeMyShop | PrestaShop Headless, SEO IA, Stratégie e-commerce',
    description: "Articles sur PrestaShop Headless, l'architecture souveraine, le SEO automatisé par IA et la stratégie e-commerce.",
    author: {
      name:  'CodeMyShop',
      url:   'https://codemyshop.com',
      image: '/alexandre-carette-96.webp',
      title: 'Expert PrestaShop & Architecture E-commerce',
      bio:   "Développeur PrestaShop freelance avec 10 ans d'expérience et 193 projets livrés. Je conçois des architectures headless Nuxt + PrestaShop, des pipelines DevOps Docker/CI-CD et des outils d'automatisation IA pour mes clients e-commerce.",
    },
    publisher: {
      name: 'CodeMyShop',
      url:  'https://codemyshop.com',
      logo: '/logo-ac.svg',
    },
    pillars: {
      prestashop: { label: 'PrestaShop Headless', icon: '⚡', color: 'text-indigo-600 dark:text-indigo-400', tagBg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', accent: 'border-indigo-500/30', desc: 'Architecture, performance et développement Headless + Nuxt 3' },
      strategie:  { label: 'Stratégie',           icon: '♟️', color: 'text-pink-600 dark:text-pink-400',    tagBg: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',       accent: 'border-pink-500/30',   desc: 'Flywheel, positionnement Océan Bleu, thèse business' },
      seo:        { label: 'SEO & IA',            icon: '🔍', color: 'text-teal-600 dark:text-teal-400',    tagBg: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',       accent: 'border-teal-500/30',   desc: 'Automatisation SEO, pipelines IA, AIO, Content Intelligence' },
      devops:     { label: 'DevOps',              icon: '🐳', color: 'text-amber-600 dark:text-amber-400',  tagBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',   accent: 'border-amber-500/30',  desc: 'Docker, déploiement, infrastructure souveraine' },
      securite:   { label: 'Sécurité',            icon: '🔒', color: 'text-red-600 dark:text-red-400',      tagBg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',           accent: 'border-red-500/30',    desc: 'Cybersécurité, audit, pentesting, protection e-commerce' },
    },
    subcatLabels: {
      architecture: 'Architecture', performance: 'Performance', developpement: 'Développement',
      automatisation: 'Automatisation', referencement: 'Référencement', flywheel: 'Flywheel',
      positionnement: 'Positionnement', docker: 'Docker',
      'intelligence-artificielle': 'Intelligence Artificielle', cybersecurite: 'Cybersécurité',
    },
    contactCta: {
      title:     'Un projet PrestaShop ?',
      subtitle:  'Discutons-en directement.',
      stat:      '193 projets livrés',
      statLabel: '★★★★★',
    },
    limit: 3,
  },

  // ── Homepage (activates white-label layout + builder sidebar) ────────────
  homepage: {
    hero: {
      layout:   'portfolio',
      title:    'Architecte IA & <span class="text-primary-600">Expert PrestaShop Headless</span>',
      subtitle: "Un système e-commerce souverain : votre boutique, votre contenu IA, votre marque. Hébergé en France. Vous possédez tout.",
      quote: { text: '+200% de trafic SEO en 6 mois grâce à une machine IA autonome — sans dépendre des plateformes.', author: 'Grégory Viarouge' },
      image:    '/alexandre-carette-256.webp',
      badge:    'Je limite mes projets à 2 par trimestre',
      tags:     ['E-commerce Headless', 'IA Souveraine', 'Zéro Commission'],
      cta:      { label: 'Réserver mon appel stratégique gratuit', href: 'https://calendly.com/contact-alexandrecarette/30min' },
      cta2:     { label: 'Découvrir le Triptyque ↓', href: '#solution' },
    },
    features: [
      { icon: 'star',   label: 'Triptyque Souverain',    description: 'Fondateur + Média + Boutique — 3 couches qui se nourrissent' },
      { icon: 'shield', label: 'Souveraineté',            description: 'VPS France, zéro commission, données à vous' },
      { icon: 'check',  label: 'Visible partout',           description: 'Référencé sur Google ET cité par les IA génératives' },
      { icon: 'star',   label: 'Intelligence éditoriale',  description: 'L\'IA publie le bon contenu au bon moment (données SEO + comportement)' },
      { icon: 'store',  label: 'Headless',                description: 'PrestaShop + Nuxt 3 — chargement en 1,2 s, SEO natif' },
      { icon: 'credit', label: 'IA Intégrée',             description: 'Blog, fiches produit, posts sociaux — tout automatisé' },
      { icon: 'clock',  label: 'Zero-Downtime',           description: 'Déploiement continu sans coupure de service' },
      { icon: 'leaf',   label: '11 ans d\'expertise',      description: '193 projets, 119 avis 5★, architecture e-commerce' },
    ],
    personas: {
      title: 'Ils ont choisi le Triptyque Souverain',
      subtitle: 'PME e-commerce, solopreneurs, consultants — ils reprennent le contrôle de leur croissance.',
      items: [
        {
          emoji: '👩‍💼',
          avatar: '/avatars/julie.jpg',
          name: 'Julie',
          role: 'Solopreneur immobilier',
          situation: "Je travaille pour un réseau et je n'ai aucun contrôle sur ma base clients. Mon site est celui de la franchise, mes leads partent dans un CRM que je ne maîtrise pas. J'ai besoin de reprendre le pouvoir sur mes données.",
          benefits: [
            'Site vitrine propre à son image',
            'CRM personnel avec sa base clients',
            'Outils IA pour être visible sans équipe tech',
            'Souveraineté totale sur ses données',
          ],
          tags: ['Immobilier', 'Solopreneur', 'Souveraineté', 'CRM'],
          color: '#f43f5e',
        },
        {
          emoji: '👩‍💻',
          avatar: '/avatars/cecile.jpg',
          name: 'Cécile',
          role: 'Directrice Marketing PME',
          situation: "Mon équipe a été réduite après la conjoncture. On tourne sur un vieux PrestaShop que personne ne sait faire évoluer. Les ventes stagnent, le SEO est en chute libre, et je n'ai pas le budget d'une agence classique.",
          benefits: [
            'Modernisation PrestaShop sans tout refaire',
            'SEO technique pour relancer le trafic organique',
            'Automatisations IA pour compenser l\'équipe réduite',
            'Accompagnement stratégique sur mesure',
          ],
          tags: ['PME', 'PrestaShop', 'SEO', 'E-commerce'],
          color: '#8b5cf6',
        },
        {
          emoji: '👨‍🚀',
          avatar: '/avatars/thomas.jpg',
          name: 'Thomas',
          role: 'Fondateur e-commerce D2C',
          situation: "Je paie 2% de commission sur chaque vente Shopify plus les apps à 300€/mois. Mon site rame, le SEO est bridé par la plateforme. Je veux migrer vers du headless mais je ne sais pas par où commencer.",
          benefits: [
            'Migration vers PrestaShop Headless + Nuxt 3',
            'Zéro commission sur les ventes',
            'Performance et SEO technique de niveau expert',
            'Infrastructure Docker souveraine',
          ],
          tags: ['D2C', 'Migration', 'Headless', 'Performance'],
          color: '#0d9488',
        },
        {
          emoji: '🏢',
          avatar: '/avatars/marc.jpg',
          name: 'Marc',
          role: "Directeur d'agence web",
          situation: "Mes clients demandent du PrestaShop et mon équipe ne maîtrise pas assez. Je cherche un partenaire technique solide pour sous-traiter les projets complexes en white-label, sans que le client sache.",
          benefits: [
            'Sous-traitance white-label clé en main',
            'Expertise pointue PrestaShop + Headless',
            'Livrables dans les délais, qualité agence premium',
            'Modules sur mesure et architecture scalable',
          ],
          tags: ['Agence', 'White-label', 'Sous-traitance', 'B2B'],
          color: '#2563eb',
        },
      ],
    },
    categories: [],
    testimonials: [],
    about: {
      title: 'Alexandre, Van Chuong, Edouard, Alphonse, Jean CARETTE',
      subtitle: 'Fondateur de CodeMyShop — Architecte IA & Expert PrestaShop Headless — Metz',
      paragraphs: [
        'Je suis né en <strong class="text-gray-800 dark:text-white">1981</strong>. J\'ai eu la chance de rencontrer le monde de l\'informatique très tôt, vers l\'âge de 4 ou 5 ans, quand mon papa a acheté le premier <strong class="text-gray-800 dark:text-white">Macintosh</strong>. Pour mon frère et moi, c\'était une révolution. Nous passions des heures à jouer à Xyphus, The Ancient Art of War, Comics Strip et tellement d\'autres jeux. Je crois que tout est parti de là.',
        'En <strong class="text-gray-800 dark:text-white">1998</strong>, ma maman revient d\'un voyage à <strong class="text-gray-800 dark:text-white">New York</strong> et m\'offre mon premier ordinateur portable : un <strong class="text-gray-800 dark:text-white">IBM ThinkPad 2</strong>, avec une connexion internet 56k. C\'est le momentum de ma vie. Je comprends soudain qu\'il est désormais possible de communiquer en temps réel avec le monde entier. Je découvre internet via les salons pirates d\'AOL, et j\'apprends à coder comme on apprenait à l\'époque — en faisant « Afficher le code source » sur les pages qui me plaisaient, pour essayer de comprendre comment c\'était fait. C\'est dans cette effervescence que je lance mon tout premier site : <strong class="text-gray-800 dark:text-white">HPC</strong> (Hacking, Phreaking, Cracking). Je m\'amuse follement avec des outils comme socket23 et BackOrifice pour explorer les failles et comprendre les réseaux. C\'est là que je forge mon <strong class="text-gray-800 dark:text-white">« hacker mindset »</strong> — cet esprit de résolution de problèmes hors des sentiers battus — qui ne me quittera plus jamais.',
        'En <strong class="text-gray-800 dark:text-white">2004</strong>, je crée <strong class="text-gray-800 dark:text-white">SUBSK8</strong>, un petit webzine pour partager les vidéos de skateboard de mes amis — en .wmv, sur un site codé à la main. YouTube n\'existe pas encore. En découvrant <strong class="text-gray-800 dark:text-white">WebRankInfo</strong> et en inscrivant mon site sur l\'annuaire <strong class="text-gray-800 dark:text-white">DMOZ</strong>, je me retrouve assez vite premier sur Google pour mes requêtes. C\'est comme ça que j\'apprends le <strong class="text-gray-800 dark:text-white">SEO</strong>, sans vraiment savoir que ça s\'appelait ainsi.',
        'En <strong class="text-gray-800 dark:text-white">2009</strong>, je me lance dans <strong class="text-gray-800 dark:text-white">Monsta Militia</strong> — un mouvement artistique, une marque de streetwear. Des tee-shirts et des planches de skate sérigraphiés à la main, dans ma salle de bain, à <strong class="text-gray-800 dark:text-white">Antibes Juan-les-Pins</strong>. Le logo se fait remarquer dans la scène street art locale. Pour vendre en ligne, je découvre un CMS e-commerce encore jeune à l\'époque : <strong class="text-gray-800 dark:text-white">PrestaShop</strong>. Ce sera le début d\'une longue histoire.',
        'En parallèle du web, il y a eu le <strong class="text-gray-800 dark:text-white">terrain</strong>. J\'ai commencé à travailler à 14 ans, derrière le bar du restaurant familial — le <strong class="text-gray-800 dark:text-white">Pousse-Pousse</strong>, à Juan-les-Pins. Ma tante Lisa m\'a transmis le goût du voyage, l\'ouverture, la culture anglaise. Pendant les étés de mon adolescence, j\'apprenais à servir, à gérer un service, à regarder les clients dans les yeux.',
        'Ensuite il y a eu <strong class="text-gray-800 dark:text-white">Serge Baboulin</strong> et le restaurant <strong class="text-gray-800 dark:text-white">Le Perroquet</strong>. Serge est de cette génération de patrons qui ne parlent pas beaucoup mais qui montrent tout. Rigueur, discipline, autorité. Il m\'a appris une chose que je n\'ai jamais oubliée : <strong class="text-gray-800 dark:text-white">travailler avec sa tête, pas avec ses jambes</strong>. Pendant les saisons, on travaillait sans jour de congé, tous les jours, quatre mois d\'affilée. C\'est là que j\'ai compris la valeur de l\'exécution — et celle de la systématisation des tâches répétitives.',
        'J\'ai ensuite aidé <strong class="text-gray-800 dark:text-white">Antoine Chauvin</strong> et <a href="https://www.linkedin.com/in/jean-baptiste-b%C3%B6hler-b5105884/" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline font-semibold">Jean-Baptiste Böhler</a> à diriger la plage du <strong class="text-gray-800 dark:text-white">Provençal Beach</strong>. Puis je suis entré dans l\'hôtellerie de luxe, au sein du groupe <strong class="text-gray-800 dark:text-white">Belles Rives</strong> à Juan-les-Pins — assistant maître d\'hôtel, management d\'équipes, gestion des stagiaires. C\'est dans cet environnement que j\'ai acquis le sens du service haut de gamme et le souci du détail. Le luxe ne pardonne pas l\'à-peu-près.',
        'En <strong class="text-gray-800 dark:text-white">2012</strong>, je quitte la restauration pour me lancer en freelance. Mais tout ce que j\'ai appris sur le terrain — le sens du service, la rigueur d\'exécution, l\'exigence du luxe, l\'endurance des saisons — je l\'ai emmené avec moi. <strong class="text-gray-800 dark:text-white">193 projets</strong>, <strong class="text-gray-800 dark:text-white">119 avis 5 étoiles</strong>, des clients partout en France. De l\'administration serveur à l\'optimisation SEO, en passant par le développement de modules et le débogage de code — j\'acquiers une expertise globale, forgée par l\'expérience et par une exigence que je m\'impose à moi-même avant de l\'imposer aux autres.',
        'En <strong class="text-gray-800 dark:text-white">2018</strong>, je cofonde <strong class="text-gray-800 dark:text-white">Sixtrone</strong>, une agence de développement e-commerce à Paris. L\'idée est de structurer ce savoir-faire au sein d\'un collectif, avec une organisation entièrement digitalisée — des collaborateurs aux quatre coins de la France et même du monde. Je m\'y investis pleinement pendant quatre ans. En <strong class="text-gray-800 dark:text-white">février 2022</strong>, les chemins se séparent avec mon associé. C\'est un moment difficile, mais qui clarifie beaucoup de choses. J\'en retire une conviction profonde : <strong class="text-gray-800 dark:text-white">il faut construire sur ses propres fondations</strong>.',
        'En <strong class="text-gray-800 dark:text-white">2023</strong>, mon fils <strong class="text-gray-800 dark:text-white">Jonah</strong> naît. Tout bascule. Je ne suis plus un adulescent qui code la nuit en écoutant du hip-hop. Je suis père. Et avec cette responsabilité vient une clarté que je n\'avais jamais eue. Ma mission change de nature — elle devient ce que j\'appelle <strong class="text-gray-800 dark:text-white">La Lignée</strong>. Il existe deux chemins pour construire le futur de nos enfants : leur transmettre des biens, ou leur transmettre une <strong class="text-gray-800 dark:text-white">architecture</strong>. Un bien peut se détériorer. Une structure traverse les siècles. Notre responsabilité n\'est pas d\'accumuler — c\'est d\'ordonner. Éluminer, c\'est organiser le réel pour que ceux qui viennent après nous n\'aient pas à le subir.',
        'En <strong class="text-gray-800 dark:text-white">2025</strong>, je crée <strong class="text-gray-800 dark:text-white">CodeMyShop</strong>. C\'est l\'aboutissement de tout ce parcours — l\'outil que j\'aurais aimé avoir pour mes clients depuis le début. Une plateforme qui réunit PrestaShop Headless, Nuxt 3 et une suite d\'intelligence artificielle dans un <strong class="text-gray-800 dark:text-white">Hub souverain</strong>, hébergé en France. Sans commission. Sans dépendance. Chaque ligne de code est écrite avec la même philosophie : <strong class="text-gray-800 dark:text-white">la qualité d\'abord, la durabilité ensuite</strong>.',
        'En parallèle, j\'investis dans l\'<strong class="text-gray-800 dark:text-white">immobilier</strong>. Pas par effet de mode — parce que c\'est la même logique : posséder ses murs, penser à vingt ans, bâtir quelque chose qui tient sans vous. Quand on construit pour l\'immobilier, on ne « pivote » pas au bout de six mois.',
        'Aujourd\'hui, je vis à <strong class="text-gray-800 dark:text-white">Metz</strong> avec ma femme et mes enfants. J\'ai 45 ans, une entreprise sans investisseur, et un métier que j\'exerce depuis plus de quinze ans. Je ne suis pas une start-up. Je ne cherche pas à lever des fonds, à « scaler » ou à revendre. Je suis un <strong class="text-gray-800 dark:text-white">artisan du web</strong> — avec la rigueur, la patience et l\'obstination que cela implique.',
        'Si vous cherchez un prestataire qui sera encore là dans trois ans, qui décroche son téléphone et qui considère votre réussite comme la sienne — alors nous devrions parler.',
      ],
      cta: { label: 'Réserver un appel de 30 min →', href: 'https://calendly.com/contact-alexandrecarette/30min' },
      mapEmbed: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d10443.038584416126!2d6.17843!3d49.1291998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e6!4m5!1s0x4794dea6f06c18db%3A0x95a4cdc77d5df43e!2s11%20Rue%20Marchant%2C%2057000%20Metz%2C%20France!3m2!1d49.1221442!2d6.1806190999999995!4m5!1s0x4794df30bc525039%3A0x2f9b4d41cdcbff77!2sChef%20de%20projet%20Prestashop%20%F0%9F%9A%80%20Wordpress%20%C3%A0%20Metz%20-%20SEO%20%2F%20GEO%20%2F%20DEV%2C%2011%20Rue%20Marchant%2C%2057000%20Metz!3m2!1d49.1221442!2d6.1806190999999995!5e0!3m2!1sfr!2sfr!4v1773504801985!5m2!1sfr!2sfr',
    },
    blog: { title: 'Blog PrestaShop Headless, IA & SEO e-commerce', limit: 3 } as { title: string; limit: number },
    faq:  { title: 'Questions Fréquentes', subtitle: 'PrestaShop Headless, IA e-commerce, SEO technique — tout ce que vous devez savoir.' },
    malt: { show: true },
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  // Strict DB-first rule (see feedback_everything_ac_module_db.md):
  // the link columns are served by /api/footer from cs_footer (DB).
  // NO static columns here — they are fetched at runtime.
  footer: {
    theme:       'dark',
    description: 'Architecte IA & Expert PrestaShop Headless. Fondateur de CodeMyShop — la souveraineté e-commerce et l\'IA qui va avec.',

    contact: {
      email: 'contact@codemyshop.com',
      address: 'Metz, France',
      cta: {
        title:    'Prêt à reprendre le contrôle ?',
        subtitle: '30 minutes. Pas de pitch. Juste un diagnostic clair.',
        label:    'Réserver un appel',
        href:     'https://calendly.com/contact-alexandrecarette/30min',
      },
    },

    social: [
      { platform: 'linkedin', href: 'https://www.linkedin.com/in/carette-alexandre/', label: 'LinkedIn CodeMyShop' },
      { platform: 'github',   href: 'https://github.com/alexandre-carette',           label: 'GitHub CodeMyShop' },
    ],

    newsletter: {
      show: false,
    },

    bottomBar: {
      copyright: `© ${new Date().getFullYear()} CodeMyShop — CodeMyShop — Tous droits réservés`,
      links: [
        { label: 'Mentions légales',           href: '/mentions-legales' },
        { label: 'Politique de confidentialité', href: '/confidentialite' },
        { label: 'CGU',                         href: '/conditions-utilisation' },
        { label: 'Livraison',                   href: '/livraison' },
        { label: 'Paiement sécurisé',           href: '/paiement-securise' },
      ],
    },
  },
}

export default config
