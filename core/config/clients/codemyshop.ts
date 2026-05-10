/**
 */

import type { HeaderConfig } from '~/types/theme'

const config: HeaderConfig = {
  clientId: 'codemyshop',
  domain:   ['codemyshop.com', 'www.codemyshop.com', 'codemyshop.fr', 'www.codemyshop.fr', 'demo.codemyshop.com'],

  theme: {
    colors: {
      primary:    '#7C3AED',
      secondary:  '#10B981',
      background: '#0F0F1A',
      foreground: '#F8FAFC',
      headerBg:   '#0F0F1A',
      footerBg:   '#07070F',
      topBarBg:   '#7C3AED',
      topBarText: '#ffffff',
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontUrl:    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    },
    ui: { borderRadius: 'lg', shadow: true },
  },

  defaultColorMode: 'dark',

  logo: { src: '/logo-codemyshop.svg', text: 'CodeMyShop®', href: '/' },

  contactEmail: 'contact@codemyshop.com',

  features: {
    showSearch:    false,
    showWishlist:  false,
    showLogin:     true,
    showContact:   false,
    showEvents:    false,
    stickyHeader:  false,
    headerLayout:  'inline',
  },

  menu: {
    items: [
      { label: 'Technologie',    href: '#technologie' },
      { label: 'Innovation',     href: '/innovation' },
      { label: 'Souveraineté',   href: '/souverainete-numerique' },
      { label: 'Offre Premium',   href: '/offre-premium' },
      { label: 'Blog',           href: 'https://codemyshop.com/blog' },
      {
        label:     'Réserver un audit',
        href:      'https://calendly.com/contact-alexandrecarette/30min',
        highlight: true,
      },
    ],
  },

  footer: {
    theme: 'dark',
    description: 'CodeMyShop — Infrastructure e-commerce souveraine. PrestaShop Headless + Nuxt 3 + IA. Hébergée en France. Sans commission.',

    columns: [
      {
        title: 'Plateforme',
        links: [
          { label: 'Architecture Headless', href: '#technologie' },
          { label: 'Intelligence Artificielle', href: '#technologie' },
          { label: 'Souveraineté', href: '/souverainete-numerique' },
          { label: 'L\'équipe', href: '/equipe' },
          { label: 'Analytics First-Party', href: '#technologie' },
        ],
      },
      {
        title: 'Ressources',
        links: [
          { label: 'Blog', href: 'https://codemyshop.com/blog' },
          { label: 'FAQ', href: '#faq' },
          { label: 'Mentions légales', href: '/mentions-legales' },
          { label: 'CGV', href: '/conditions-generales-de-vente' },
          { label: 'Confidentialité', href: '/politique-confidentialite' },
        ],
      },
      {
        title: 'Expertise',
        links: [
          { label: 'CodeMyShop', href: 'https://codemyshop.com' },
          { label: 'Réserver un audit', href: 'https://calendly.com/contact-alexandrecarette/30min' },
        ],
      },
    ],

    social: [
      { platform: 'linkedin', href: 'https://www.linkedin.com/in/carette-alexandre/', label: 'LinkedIn CodeMyShop' },
      { platform: 'github',   href: 'https://github.com/alexandre-carette',           label: 'GitHub CodeMyShop' },
    ],

    bottomBar: {
      copyright: '© 2026 CodeMyShop® — Marque d\'CodeMyShop — Tous droits réservés',
      links: [
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'CGV', href: '/conditions-generales-de-vente' },
        { label: 'Confidentialité', href: '/politique-confidentialite' },
      ],
    },
  },

  homepage: {
    hero: {
      layout:   'centered',
      title:    'L\'infrastructure e-commerce<br><span class="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">qui s\'améliore seule</span>',
      subtitle: 'Un système souverain qui génère du trafic organique, des recommandations par les IA et des ventes — sans dépendre des plateformes.',
      badge:    '2 places disponibles ce trimestre',
      cta:      { label: 'Réserver un audit d\'architecture', href: 'https://calendly.com/contact-alexandrecarette/30min' },
      cta2:     { label: 'Tester le dashboard gratuitement', href: '/hub/dashboard' },
      tags:     [],
    },
    features: [],
    categories: [],
    testimonials: [],
    about: { title: '', subtitle: '', paragraphs: [] },
  },
}

export default config
