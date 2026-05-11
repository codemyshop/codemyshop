import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

export default {
  darkMode: 'class',
  safelist: [
    'dark:bg-slate-800', 'dark:bg-slate-900', 'dark:bg-slate-950',
    'dark:border-slate-700', 'dark:border-slate-800',
    'dark:text-slate-100', 'dark:text-slate-200', 'dark:text-slate-300', 'dark:text-slate-400',
    'dark:text-white',
    'dark:hover:bg-slate-700', 'dark:hover:bg-slate-800', 'dark:hover:bg-slate-950',
    'dark:divide-slate-700', 'dark:divide-slate-800',
    
    'dark:bg-slate-800/50', 'dark:bg-slate-800', 'dark:bg-slate-700', 'dark:bg-slate-700/50',
    'dark:bg-green-900/30', 'dark:text-green-400',
    'dark:bg-primary-600/15', 'dark:bg-primary-600/10', 'dark:bg-primary-600/20', 'dark:bg-primary-600/5',
    'dark:text-primary-400', 'dark:text-slate-500',
    'dark:border-slate-700', 'dark:border-primary-600/30', 'dark:border-primary-600/40',
    'dark:ring-slate-800',
    'dark:hover:text-primary-400', 'dark:hover:border-primary-600/40', 'dark:hover:bg-primary-600/10',
    'dark:group-hover:text-primary-400',
  ],
  theme: {
    extend: {
      colors: {
        
        primary: {
          DEFAULT: 'var(--color-primary)',
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          50:  'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },

        
        accent: {
          DEFAULT: 'var(--color-accent, #ec4899)',
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },

        
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        muted:      'var(--color-muted)',
        'header-bg': 'var(--color-header-bg)',
        'footer-bg': 'var(--color-footer-bg)',

        
        success: colors.green,
        danger:  colors.red,
        warning: colors.amber,

        
        stage: {
          lead:     colors.blue,
          qualify:  colors.cyan,
          quoted:   colors.yellow,
          accepted: colors.orange,
          active:   colors.indigo,
          delivery: colors.purple,
          invoiced: colors.pink,
          won:      colors.green,
        },
      },

      
      borderRadius: {
        btn:   'var(--radius-btn)',
        card:  'var(--radius-card)',
        input: 'var(--radius-input)',
      },

      
      
      
      
      
      fontFamily: {
        sans:  ['var(--font-family)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif, Georgia)', 'Georgia', 'serif'],
        mono:  ['var(--font-mono, ui-monospace)', 'ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config
