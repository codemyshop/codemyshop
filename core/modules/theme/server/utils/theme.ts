/**
 *
 * Theme Facade — source of truth `cs_theme`, owned by ac_theme.
 * PG-only runtime (project #38 phase E.5); each tenant carries its row
 * unique (UNIQUE client_id).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface ThemeContext {
  event?: any
  clientId?: string
}

function isMissingTable(err: any): boolean {
  return err?.code === '42P01'
}

function mapThemeRow(r: any): ThemePayload {
  return {
    colors: {
      primary: r.color_primary ?? r.colorPrimary,
      secondary: r.color_secondary ?? r.colorSecondary,
      background: r.color_background ?? r.colorBackground,
      foreground: r.color_foreground ?? r.colorForeground,
      muted: r.color_muted ?? r.colorMuted,
      headerBg: r.color_header_bg ?? r.colorHeaderBg,
      footerBg: r.color_footer_bg ?? r.colorFooterBg,
      topBarBg: r.color_topbar_bg ?? r.colorTopbarBg,
      topBarText: r.color_topbar_text ?? r.colorTopbarText,
    },
    typography: {
      fontFamily: r.font_family ?? r.fontFamily,
      fontUrl: r.font_url ?? r.fontUrl,
      baseFontSize: r.base_font_size ?? r.baseFontSize,
    },
    ui: {
      borderRadius: r.border_radius ?? r.borderRadius,
      contentWidth: r.content_width ?? r.contentWidth,
      shadow: Boolean(r.shadow),
    },
    defaultColorMode: (r.default_color_mode ?? r.defaultColorMode) || 'light',
  }
}

export interface ThemePayload {
  colors: {
    primary: string
    secondary: string | null
    background: string | null
    foreground: string | null
    muted: string | null
    headerBg: string | null
    footerBg: string | null
    topBarBg: string | null
    topBarText: string | null
  }
  typography: {
    fontFamily: string | null
    fontUrl: string | null
    baseFontSize: string | null
  }
  ui: {
    borderRadius: string
    contentWidth: string | null
    shadow: boolean
  }
  defaultColorMode: string
}

/**
 * Reads the active theme for a tenant (UNIQUE client_id, active=1).
 * Returns null if no row OR if the table does not exist.
 */
export async function getThemeForTenant(
  clientId: string,
  _ctx: ThemeContext = {},
): Promise<ThemePayload | null> {
  try {
    const rows = await usePocPg().execute<any>(sql`
      SELECT * FROM cs_main.cs_theme
       WHERE client_id = ${clientId} AND active = 1
       LIMIT 1
    `)
    const row = (rows as any[])[0]
    return row ? mapThemeRow(row) : null
  } catch (err: any) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/**
 * Reads the active primary color on the current tenant — used by the
 * invoice PDF generators for accent. Returns null if no row or
 * missing table. (Independent of clientId — first match active=1.)
 */
export async function getThemePrimaryColor(
  _ctx: ThemeContext = {},
): Promise<string | null> {
  try {
    const rows = await usePocPg().execute<{ color_primary: string | null }>(sql`
      SELECT color_primary FROM cs_main.cs_theme
       WHERE active = 1 LIMIT 1
    `)
    return (rows as any[])[0]?.color_primary ?? null
  } catch (err: any) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/**
 * UPSERT theme for a given tenant. Idempotent via UNIQUE(client_id).
 */
export async function upsertThemeForTenant(
  clientId: string,
  payload: ThemePayload,
  _ctx: ThemeContext = {},
): Promise<void> {
  const colorPrimary = payload.colors.primary || '#2563eb'
  const colorBackground = payload.colors.background || '#ffffff'
  const colorForeground = payload.colors.foreground || '#111827'
  const colorHeaderBg = payload.colors.headerBg || '#ffffff'
  const colorFooterBg = payload.colors.footerBg || '#ffffff'
  const fontFamily = payload.typography.fontFamily || 'Inter, system-ui, sans-serif'
  const baseFontSize = payload.typography.baseFontSize || '16px'
  const borderRadius = payload.ui.borderRadius || 'md'
  const contentWidth = payload.ui.contentWidth || '7xl'
  const shadow = payload.ui.shadow ? 1 : 0
  const defaultColorMode = payload.defaultColorMode || 'light'

  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_theme
      (client_id, color_primary, color_secondary, color_background, color_foreground,
       color_muted, color_header_bg, color_footer_bg, color_topbar_bg, color_topbar_text,
       font_family, font_url, base_font_size, border_radius, content_width, shadow,
       default_color_mode, date_add, date_upd)
    VALUES
      (${clientId}, ${colorPrimary}, ${payload.colors.secondary},
       ${colorBackground}, ${colorForeground}, ${payload.colors.muted},
       ${colorHeaderBg}, ${colorFooterBg}, ${payload.colors.topBarBg},
       ${payload.colors.topBarText}, ${fontFamily}, ${payload.typography.fontUrl},
       ${baseFontSize}, ${borderRadius}, ${contentWidth}, ${shadow},
       ${defaultColorMode}, NOW(), NOW())
    ON CONFLICT (client_id) DO UPDATE SET
      color_primary = EXCLUDED.color_primary,
      color_secondary = EXCLUDED.color_secondary,
      color_background = EXCLUDED.color_background,
      color_foreground = EXCLUDED.color_foreground,
      color_muted = EXCLUDED.color_muted,
      color_header_bg = EXCLUDED.color_header_bg,
      color_footer_bg = EXCLUDED.color_footer_bg,
      color_topbar_bg = EXCLUDED.color_topbar_bg,
      color_topbar_text = EXCLUDED.color_topbar_text,
      font_family = EXCLUDED.font_family,
      font_url = EXCLUDED.font_url,
      base_font_size = EXCLUDED.base_font_size,
      border_radius = EXCLUDED.border_radius,
      content_width = EXCLUDED.content_width,
      shadow = EXCLUDED.shadow,
      default_color_mode = EXCLUDED.default_color_mode,
      date_upd = NOW()
  `)
}
