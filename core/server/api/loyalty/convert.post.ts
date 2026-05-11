

import { useClientDb } from '~/server/utils/db'
import { requireCustomer } from '~/server/utils/customer-session'

export interface LoyaltyConvertResponse {
  success: boolean
  code?: string
  points?: number
  valueEur?: number
  idCartRule?: number
  validUntil?: string
  error?: string
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'LOYAL-'
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export default defineEventHandler(async (event): Promise<LoyaltyConvertResponse> => {
  const session = requireCustomer(event)
  const db = useClientDb(event)

  const body = await readBody<{ multiplier?: number }>(event)
  const multiplier = Math.floor(Number(body?.multiplier ?? 1))

  
  const configRows = await db.query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (
      'AC_LOYALTY_TIER_POINTS',
      'AC_LOYALTY_TIER_VALUE',
      'AC_LOYALTY_TIER_MAX_MULTIPLIER',
      'AC_LOYALTY_CART_RULE_VALIDITY_DAYS',
      'PS_CURRENCY_DEFAULT'
    )`,
  )
  const cfg = Object.fromEntries(configRows.map(r => [r.name, r.value])) as Record<string, string>

  const tierPoints   = Number(cfg.AC_LOYALTY_TIER_POINTS ?? 5000)
  const tierValue    = Number(cfg.AC_LOYALTY_TIER_VALUE ?? 150)
  const maxMult      = Number(cfg.AC_LOYALTY_TIER_MAX_MULTIPLIER ?? 2)
  const validityDays = Number(cfg.AC_LOYALTY_CART_RULE_VALIDITY_DAYS ?? 90)
  const currencyId   = Number(cfg.PS_CURRENCY_DEFAULT ?? 1)

  if (multiplier < 1) {
    return { success: false, error: 'Multiplicateur de palier invalide (minimum 1).' }
  }
  if (maxMult > 0 && multiplier > maxMult) {
    return { success: false, error: `Multiplicateur maximum dépassé (max ${maxMult}).` }
  }
  const points   = tierPoints * multiplier
  const valueEur = tierValue * multiplier

  
  const account = await db.get<{ balance_points: number }>(
    `SELECT balance_points FROM cs_loyalty_account WHERE id_customer = ?`,
    [session.customerId],
  )
  const balance = Number(account?.balance_points ?? 0)
  if (balance < points) {
    return { success: false, error: `Solde insuffisant : ${points} points requis, ${balance} disponibles.` }
  }

  
  let code = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateCode()
    const exists = await db.get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM ps_cart_rule WHERE code = ?`,
      [candidate],
    )
    if (!exists || exists.c === 0) {
      code = candidate
      break
    }
  }
  if (!code) {
    return { success: false, error: 'Impossible de générer un code unique. Réessayez.' }
  }

  
  const nowSql    = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const validTo   = new Date(Date.now() + validityDays * 86400_000).toISOString().slice(0, 19).replace('T', ' ')
  const description = `AC Loyalty — ${points} pts convertis (${session.email})`

  const ruleInsert = await db.run(
    `INSERT INTO ps_cart_rule (
      id_customer, date_from, date_to, description,
      quantity, quantity_per_user, priority, partial_use, code,
      minimum_amount, minimum_amount_tax, minimum_amount_currency, minimum_amount_shipping,
      country_restriction, carrier_restriction, group_restriction, cart_rule_restriction,
      product_restriction, shop_restriction,
      free_shipping, reduction_percent, reduction_amount, reduction_tax, reduction_currency,
      reduction_product, reduction_exclude_special,
      gift_product, gift_product_attribute, highlight, active, date_add, date_upd
    ) VALUES (
      ?, ?, ?, ?,
      1, 1, 1, 0, ?,
      0, 0, 0, 0,
      0, 0, 0, 1,
      0, 0,
      0, 0, ?, 1, ?,
      0, 0,
      0, 0, 0, 1, ?, ?
    )`,
    [session.customerId, nowSql, validTo, description, code, valueEur, currencyId, nowSql, nowSql],
  )
  const idCartRule = ruleInsert.insertId
  if (!idCartRule) {
    return { success: false, error: 'Échec création du bon (ps_cart_rule).' }
  }

  
  const langs = await db.query<{ id_lang: number }>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
  for (const l of langs) {
    await db.run(
      `INSERT INTO ps_cart_rule_lang (id_cart_rule, id_lang, name) VALUES (?, ?, ?)`,
      [idCartRule, l.id_lang, `Bon fidélité ${Math.round(valueEur)} €`],
    )
  }

  
  const shops = await db.query<{ id_shop: number }>(`SELECT id_shop FROM ps_shop WHERE active = 1`)
  for (const s of shops) {
    await db.run(
      `INSERT IGNORE INTO ps_cart_rule_shop (id_cart_rule, id_shop) VALUES (?, ?)`,
      [idCartRule, s.id_shop],
    )
  }

  
  const reference = `debit_${points}pts_${Math.round(valueEur)}eur_${code}`
  await db.run(
    `INSERT INTO cs_loyalty_transaction (id_customer, type, points, id_cart_rule, reference, date_add)
     VALUES (?, 'debit', ?, ?, ?, NOW())`,
    [session.customerId, -Math.abs(points), idCartRule, reference],
  )

  
  await db.run(
    `INSERT INTO cs_loyalty_account (id_customer, balance_points, total_earned, total_spent)
     SELECT
       ? AS id_customer,
       COALESCE(SUM(points), 0) AS balance_points,
       COALESCE(SUM(CASE WHEN type='credit' THEN points ELSE 0 END), 0) AS total_earned,
       COALESCE(SUM(CASE WHEN type IN ('debit','expire') THEN -points ELSE 0 END), 0) AS total_spent
     FROM cs_loyalty_transaction
     WHERE id_customer = ?
     ON CONFLICT (id_customer) DO UPDATE SET
       balance_points = EXCLUDED.balance_points,
       total_earned   = EXCLUDED.total_earned,
       total_spent    = EXCLUDED.total_spent,
       date_upd       = NOW()`,
    [session.customerId, session.customerId],
  )

  return {
    success: true,
    code,
    points,
    valueEur,
    idCartRule,
    validUntil: validTo,
  }
})
