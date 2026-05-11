

import { resolve } from 'node:path'
const __layerDir = resolve(import.meta.dirname ?? __dirname)

export default defineNuxtConfig({
  

  
  
  future: {
    compatibilityVersion: 4,
  },

  
  
  
  
  
  
  features: {
    inlineStyles: false,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/scripts',
    resolve(__layerDir, '..', 'community/modules/i18n-routes'),
  ],

  
  
  
  
  
  
  fonts: {
    defaults: {
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    experimental: {
      processCSSVariables: true,
    },
  },

  tailwindcss: {
    cssPath: resolve(__layerDir, 'assets/css/main.css'),
  },

  
  
  
  
  
  
  
  postcss: {
    plugins: {
      [resolve(__layerDir, 'build/postcss-strip-dark.cjs')]: {},
    },
    order: (names: string[]) => {
      const stripIdx = names.findIndex(n => n.endsWith('postcss-strip-dark.cjs'))
      if (stripIdx < 0) return names
      const stripName = names[stripIdx]
      return [...names.slice(0, stripIdx), ...names.slice(stripIdx + 1), stripName]
    },
  },

  
  
  image: {
    format: ['avif', 'webp'],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    presets: {
      logo:      { modifiers: { format: 'webp', quality: 90, fit: 'inside' } },
      hero:      { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      blogCover: { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      avatar:    { modifiers: { format: 'webp', quality: 85, fit: 'cover' } },
    },
  },

  
  
  
  
  
  
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
    },
  },

  
  
  css: [
    resolve(__layerDir, 'assets/css/dark-overrides.css'),
    resolve(__layerDir, 'assets/css/content-width.css'),
  ],

  
  
  
  
  alias: {
    '~/types':    resolve(__layerDir, 'types'),
    '~/utils':    resolve(__layerDir, 'utils'),
    '~/data':     resolve(__layerDir, 'data'),
    '~/config':   resolve(__layerDir, 'config'),
    '~/server':   resolve(__layerDir, 'server'),
    '~/modules':  resolve(__layerDir, '..', 'community/modules'),
    '~/composables': resolve(__layerDir, 'composables'),
    '~/enterprise/base':             resolve(__layerDir, '..', 'enterprise/base/modules'),
    '~/enterprise/ai':               resolve(__layerDir, '..', 'enterprise/ai/modules'),
    '~/enterprise/data':             resolve(__layerDir, '..', 'enterprise/data/modules'),
    '~/enterprise/seo':              resolve(__layerDir, '..', 'enterprise/seo/modules'),
    '~/enterprise/banking':          resolve(__layerDir, '..', 'enterprise/banking/modules'),
    '~/enterprise/vertical-food':    resolve(__layerDir, '..', 'enterprise/vertical-food/modules'),
    '~/enterprise/vertical-vape':    resolve(__layerDir, '..', 'enterprise/vertical-vape/modules'),
    '~/enterprise/vertical-fashion': resolve(__layerDir, '..', 'enterprise/vertical-fashion/modules'),
    '~/enterprise/vertical-jewelry': resolve(__layerDir, '..', 'enterprise/vertical-jewelry/modules'),
    '~/enterprise/misc':             resolve(__layerDir, '..', 'enterprise/misc/modules'),
    '~/enterprise':   resolve(__layerDir, '..', 'enterprise'),
    '~/internal':     resolve(__layerDir, '..', 'tenants/mothership/modules'),
  },

  
  vite: {
    optimizeDeps: { exclude: ['matomo-js'] },
    build: {
      rollupOptions: { external: ['matomo-js'] },
      
      sourcemap: false,
    },
  },

  
  typescript: {
    typeCheck: false,
  },

  
  sourcemap: { server: false, client: false },

  
  
  
  experimental: {
    buildCache: true,
    
    
    
    
    
    
    
    
    defaults: {
      nuxtLink: {
        prefetch: true,
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },

  
  runtimeConfig: {
    secret: process.env.NUXT_SECRET,
    apiEncryptionKey: process.env.API_ENCRYPTION_KEY ?? process.env.NUXT_SECRET ?? '',
    prestashopApiKey: process.env.PRESTASHOP_API_KEY,
    psBaseUrl: process.env.PS_BASE_URL ?? 'http://localhost:8080',
    psHost: process.env.PS_DOMAIN ?? 'localhost',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
    aiSourceType: process.env.AI_SOURCE_TYPE ?? 'contact_form',
    clientId: process.env.NUXT_CLIENT_ID ?? 'ac-hub',
    aiClientId: process.env.AI_CLIENT_ID ?? 'ac-hub',

    
    hubApiUrl: process.env.NUXT_HUB_API_URL ?? 'https://codemyshop.com',

    
    uploadStaticDir: process.env.NUXT_UPLOAD_STATIC_DIR ?? '',

    
    acClientConfigSecret: process.env.NUXT_AC_CLIENTCONFIG_SECRET ?? process.env.AC_CLIENTCONFIG_SECRET ?? '',

    
    acMarketplaceToken: process.env.NUXT_AC_MARKETPLACE_TOKEN ?? process.env.AC_MARKETPLACE_TOKEN ?? '',

    
    acAcademyAiToken: process.env.NUXT_AC_ACADEMY_AI_TOKEN ?? process.env.AC_ACADEMY_AI_TOKEN ?? '',

    
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',

    
    
    instagramToken:    process.env.NUXT_INSTAGRAM_TOKEN ?? '',
    instagramIgUserId: process.env.NUXT_INSTAGRAM_IG_USER_ID ?? '',

    
    
    
    
    scwAccessKey: process.env.AWS_ACCESS_KEY_ID ?? '',
    scwSecretKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    scwRegion:    process.env.AWS_DEFAULT_REGION ?? 'fr-par',
    scwEndpoint:  process.env.AWS_ENDPOINT_URL_S3 ?? 'https://s3.fr-par.scw.cloud',
    scwBucket:    process.env.SCW_BUCKET ?? 'ac-db-backups',

    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api',
      psFrontUrl: process.env.NUXT_PUBLIC_PS_FRONT_URL ?? 'http://localhost:8080',
      clientId: process.env.NUXT_PUBLIC_CLIENT_ID ?? 'ac-hub',
      matomoKey: process.env.NUXT_PUBLIC_MATOMO_KEY ?? '',
      matomoHost: process.env.NUXT_PUBLIC_MATOMO_HOST ?? 'https://analytics.codemyshop.fr',
      matomoUrl: process.env.NUXT_PUBLIC_MATOMO_URL ?? 'https://analytics.codemyshop.com',
      matomoSiteId: process.env.NUXT_PUBLIC_MATOMO_SITE_ID ?? '1',

      
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME ?? 'Boutique',
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL ?? '',
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL ?? '',
      ownerName: process.env.NUXT_PUBLIC_OWNER_NAME ?? '',
      ownerAvatar: process.env.NUXT_PUBLIC_OWNER_AVATAR ?? '',
      favicon: process.env.NUXT_PUBLIC_FAVICON ?? '/favicon.svg',

      
      b2bMode: process.env.NUXT_PUBLIC_B2B_MODE === 'true',
      catalogueIndexable: process.env.NUXT_PUBLIC_CATALOGUE_INDEXABLE === 'true',

      
      hubLoginUrl: process.env.NUXT_PUBLIC_HUB_LOGIN_URL ?? '',
    },
  },

  
  
  
  
  
  
  routeRules: {
    '/hub/**': { ssr: false },
    '/hub':    { ssr: false },
    
    
    
    
    '/_ipx/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    
    
    '/_fonts/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    '/blog/**':         { swr: 300, cache: { base: 'redis' } },
    '/marques/**':      { swr: 300, cache: { base: 'redis' } },
    '/auteur/**':       { swr: 300, cache: { base: 'redis' } },
    '/dictionnaire/**': { swr: 600, cache: { base: 'redis' } },
    '/expertise/**':    { swr: 600, cache: { base: 'redis' } },
    '/page/**':         { swr: 600, cache: { base: 'redis' } },
    '/grossiste/**':    { swr: 60,  cache: { base: 'redis' } },
    '/produit/**':      { swr: 60,  cache: { base: 'redis' } },
    
    
    
    '/cgv':             { swr: 3600, cache: { base: 'redis' } },
    '/mentions-legales':{ swr: 3600, cache: { base: 'redis' } },
    '/cookies':         { swr: 3600, cache: { base: 'redis' } },
    '/contact':         { swr: 600,  cache: { base: 'redis' } },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    storage: {
      avatars:   { driver: 'fs', base: resolve(__layerDir, 'server/data/avatars') },
      automates: { driver: 'fs', base: resolve(__layerDir, 'server/data/automates') },
      
      
      
      
      
      
      redis: process.env.REDIS_URL
        ? {
            driver: 'redis',
            url: process.env.REDIS_URL,
            base: 'ac:',
            
            
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          }
        : {
            
            
            
            driver: 'memory',
          },
    },
    alias: {
      '~/server':      resolve(__layerDir, 'server'),
      '~/types':       resolve(__layerDir, 'types'),
      '~/utils':       resolve(__layerDir, 'utils'),
      '~/config':      resolve(__layerDir, 'config'),
      '~/composables': resolve(__layerDir, 'composables'),
      '~/enterprise/base':             resolve(__layerDir, '..', 'enterprise/base/modules'),
      '~/enterprise/ai':               resolve(__layerDir, '..', 'enterprise/ai/modules'),
      '~/enterprise/data':             resolve(__layerDir, '..', 'enterprise/data/modules'),
      '~/enterprise/seo':              resolve(__layerDir, '..', 'enterprise/seo/modules'),
      '~/enterprise/banking':          resolve(__layerDir, '..', 'enterprise/banking/modules'),
      '~/enterprise/vertical-food':    resolve(__layerDir, '..', 'enterprise/vertical-food/modules'),
      '~/enterprise/vertical-vape':    resolve(__layerDir, '..', 'enterprise/vertical-vape/modules'),
      '~/enterprise/vertical-fashion': resolve(__layerDir, '..', 'enterprise/vertical-fashion/modules'),
      '~/enterprise/vertical-jewelry': resolve(__layerDir, '..', 'enterprise/vertical-jewelry/modules'),
      '~/enterprise/misc':             resolve(__layerDir, '..', 'enterprise/misc/modules'),
      '~/enterprise':   resolve(__layerDir, '..', 'enterprise'),
      '~/internal':     resolve(__layerDir, '..', 'tenants/mothership/modules'),
    },
    scheduledTasks: {
      
      
      
      
      
      '30 4 * * *': ['audit:schema-watch'],
      
      
      
      '0 8 * * *': ['audit:sitemap-watch'],
      
      
      
      
      '15 8 * * *': ['audit:matomo-watch'],
      
      
      
      
      '15 20 * * *': ['audit:dictionary-watch'],
      
      
      
      
      
      '45 7 * * *': ['audit:blog-hygiene'],
      
      
      
      
      
      
      '10 8 * * *': ['audit:pageaudit'],
      
      
      
      
      
      
      
      '50 7 * * *': ['audit:factcheck'],
      
      
      
      
      
      
      '15 7 * * *': ['audit:brand-watch'],
      
      
      
      
      
      
      
      '1-59/3 * * * *': ['audit:uptime-monitor'],
      
      
      
      
      
      
      
      '1-59/5 * * * *': ['cover:queue-process'],
      
      
      
      
      
      
      '50 3 * * *': ['business:expiry-discounts'],
      
      
      
      
      
      '15 2 * * 4': ['audit:deps-watch'],
      
      
      
      
      
      '15 * * * *': ['cover:carousel-process'],
      
      
      
      
      
      
      '5 4 * * *': ['seo:crosslinks-rebuild'],
      
      
      
      
      
      
      
      '30 6 * * *': ['audit:ssl-watch'],
      
      
      
      
      
      
      
      
      
      '0 5 * * 1-6': ['audit:daily-meet'],
      
      
      
      
      
      
      
      
      '*/5 * * * *': ['inbox:sync'],
      
      
      
      
      
      '* * * * *': ['email:queue-process'],
      
      
      
      
      '2-59/5 * * * *': ['email:client-sync'],
    },
  },
})
