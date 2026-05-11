

import { useClientDb } from '~/server/utils/db'
import { writeThemeCss } from '~/server/utils/theme-css-generator'
import { upsertThemeForTenant } from '~/modules/theme/server/utils/theme'

interface ThemeBody {
  theme: {
    colors?: {
      primary?: string
      secondary?: string
      background?: string
      foreground?: string
      muted?: string
      headerBg?: string
      footerBg?: string
      topBarBg?: string
      topBarText?: string
    }
    typography?: {
      fontFamily?: string
      fontUrl?: string
      baseFontSize?: string
    }
    ui?: {
      borderRadius?: string
      contentWidth?: string
      shadow?: boolean
    }
    defaultColorMode?: 'light' | 'dark' | 'system'
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ThemeBody>(event)
  if (!body?.theme) {
    throw createError({ statusCode: 400, message: 'theme requis' })
  }

  const db = useClientDb(event)
  const { clientId } = db
  const t = body.theme

  await upsertThemeForTenant(clientId, {
    colors: {
      primary: t.colors?.primary || '#2563eb',
      secondary: t.colors?.secondary ?? null,
      background: t.colors?.background || '#ffffff',
      foreground: t.colors?.foreground || '#111827',
      muted: t.colors?.muted ?? null,
      headerBg: t.colors?.headerBg || '#ffffff',
      footerBg: t.colors?.footerBg || '#ffffff',
      topBarBg: t.colors?.topBarBg ?? null,
      topBarText: t.colors?.topBarText ?? null,
    },
    typography: {
      fontFamily: t.typography?.fontFamily || 'Inter, system-ui, sans-serif',
      fontUrl: t.typography?.fontUrl ?? null,
      baseFontSize: t.typography?.baseFontSize || '16px',
    },
    ui: {
      borderRadius: t.ui?.borderRadius || 'md',
      contentWidth: t.ui?.contentWidth || '7xl',
      shadow: t.ui?.shadow !== false,
    },
    defaultColorMode: t.defaultColorMode || 'light',
  }, { event })

  
  try {
    writeThemeCss(clientId, {
      colors: {
        primary: t.colors?.primary || '#2563eb',
        secondary: t.colors?.secondary,
        background: t.colors?.background || '#ffffff',
        foreground: t.colors?.foreground || '#111827',
        muted: t.colors?.muted,
        headerBg: t.colors?.headerBg || '#ffffff',
        footerBg: t.colors?.footerBg || '#ffffff',
        topBarBg: t.colors?.topBarBg,
        topBarText: t.colors?.topBarText,
      },
      typography: {
        fontFamily: t.typography?.fontFamily || 'Inter, system-ui, sans-serif',
        fontUrl: t.typography?.fontUrl,
        baseFontSize: t.typography?.baseFontSize || '16px',
      },
      ui: {
        borderRadius: t.ui?.borderRadius || 'md',
        contentWidth: t.ui?.contentWidth || '7xl',
        shadow: t.ui?.shadow !== false,
      },
    })
  } catch (err: any) {
    
    console.warn('[theme/sync] CSS generation failed:', err?.message)
  }

  return { ok: true }
})
