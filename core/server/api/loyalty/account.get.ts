/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/loyalty/account
 *
 * Returns the loyalty balance of the connected customer, their transaction history
 * and available conversion tiers.
 *
 * DB-Only approach: direct read from cs_loyalty_* + ps_configuration tables.
 */
import { useClientDb } from '~/server/utils/db'
import { requireCustomer } from '~/server/utils/customer-session'

export interface LoyaltyTransaction {
  id: number
  type: 'credit' | 'debit' | 'expire' | 'adjust'
  points: number
  idOrder: number | null
  idCartRule: number | null
  cartRuleCode: string | null
  cartRuleAmount: number | null
  reference: string | null
  dateAdd: string
  expiresAt: string | null
}

export interface LoyaltyTier {
  multiplier: number
  points: number
  valueEur: number
  affordable: boolean
}

export interface LoyaltyVoucher {
  code: string
  amount: number
  dateTo: string
  status: 'active' | 'used' | 'expired'
  idOrder: number
}

export interface LoyaltyAccountResponse {
  balance: number
  totalEarned: number
  totalSpent: number
  config: {
    ratio: number
    tierPoints: number
    tierValue: number
    tierMaxMultiplier: number
    expireMonths: number
    validityDays: number
  }
  tiers: LoyaltyTier[]
  transactions: LoyaltyTransaction[]
  vouchers: LoyaltyVoucher[]
}

export default defineEventHandler(async (event): Promise<LoyaltyAccountResponse> => {
  const session = requireCustomer(event)
  const db = useClientDb(event)

  const configRows = await db.query<{ name: string; value: string }>(
    `SELECT name, value FROM ps_configuration WHERE name IN (
      'AC_LOYALTY_RATIO',
      'AC_LOYALTY_TIER_POINTS',
      'AC_LOYALTY_TIER_VALUE',
      'AC_LOYALTY_TIER_MAX_MULTIPLIER',
      'AC_LOYALTY_EXPIRE_MONTHS',
      'AC_LOYALTY_CART_RULE_VALIDITY_DAYS'
    )`
  )
  const cfg = Object.fromEntries(configRows.map(r => [r.name, r.value])) as Record<string, string>

  const ratio             = Number(cfg.AC_LOYALTY_RATIO ?? 1)
  const tierPoints        = Number(cfg.AC_LOYALTY_TIER_POINTS ?? 5000)
  const tierValue         = Number(cfg.AC_LOYALTY_TIER_VALUE ?? 150)
  const tierMaxMultiplier = Number(cfg.AC_LOYALTY_TIER_MAX_MULTIPLIER ?? 2)
  const expireMonths      = Number(cfg.AC_LOYALTY_EXPIRE_MONTHS ?? 12)
  const validityDays      = Number(cfg.AC_LOYALTY_CART_RULE_VALIDITY_DAYS ?? 90)

  const account = await db.get<{ balance_points: number; total_earned: number; total_spent: number }>(
    `SELECT balance_points, total_earned, total_spent
     FROM cs_loyalty_account
     WHERE id_customer = ?`,
    [session.customerId],
  )
  const balance      = Number(account?.balance_points ?? 0)
  const totalEarned  = Number(account?.total_earned ?? 0)
  const totalSpent   = Number(account?.total_spent ?? 0)

  // tierMaxMultiplier = 0 → illimité (linéaire). On affiche alors jusqu'au
  // palier max que le solde permet + 1 palier "à viser" au-dessus.
  const tiers: LoyaltyTier[] = []
  const affordableMax = Math.floor(balance / Math.max(1, tierPoints))
  const capMultiplier = tierMaxMultiplier > 0
    ? tierMaxMultiplier
    : Math.max(2, affordableMax + 1) // au moins 2 paliers affichés même solde nul
  for (let m = 1; m <= capMultiplier; m++) {
    const pts = tierPoints * m
    tiers.push({
      multiplier: m,
      points: pts,
      valueEur: tierValue * m,
      affordable: balance >= pts,
    })
  }

  const txRows = await db.query<{
    id_ac_loyalty_transaction: number
    type: string
    points: number
    id_order: number | null
    id_cart_rule: number | null
    cart_rule_code: string | null
    cart_rule_amount: number | null
    reference: string | null
    date_add: string
    expires_at: string | null
  }>(
    `SELECT t.id_ac_loyalty_transaction, t.type, t.points, t.id_order, t.id_cart_rule,
            cr.code AS cart_rule_code, cr.reduction_amount AS cart_rule_amount,
            t.reference, t.date_add, t.expires_at
     FROM cs_loyalty_transaction t
     LEFT JOIN ps_cart_rule cr ON cr.id_cart_rule = t.id_cart_rule AND t.id_cart_rule > 0
     WHERE t.id_customer = ?
     ORDER BY t.date_add DESC, t.id_ac_loyalty_transaction DESC
     LIMIT 100`,
    [session.customerId],
  )
  const transactions: LoyaltyTransaction[] = txRows.map(r => ({
    id: r.id_ac_loyalty_transaction,
    type: r.type as LoyaltyTransaction['type'],
    points: Number(r.points),
    idOrder: r.id_order,
    idCartRule: r.id_cart_rule,
    cartRuleCode: r.cart_rule_code,
    cartRuleAmount: r.cart_rule_amount !== null ? Number(r.cart_rule_amount) : null,
    reference: r.reference,
    dateAdd: r.date_add,
    expiresAt: r.expires_at,
  }))

  const voucherRows = await db.query<{
    code: string
    reduction_amount: number | string
    date_to: string
    expired: number
    used_on_order: number
  }>(
    // PG strict GROUP BY : on agrège ocr.id_order (MAX = un id si utilisé,
     // NULL sinon) au lieu de l'utiliser brut. MariaDB tolérait l'ancien
     // SQL sans erreur, PG (example_v2) refuse — incidents 2026-05-04.
    `SELECT cr.code, cr.reduction_amount, cr.date_to,
            (cr.date_to < NOW()) AS expired,
            COALESCE(MAX(ocr.id_order), 0) AS used_on_order
     FROM ps_cart_rule cr
     LEFT JOIN ps_order_cart_rule ocr ON ocr.id_cart_rule = cr.id_cart_rule
     WHERE cr.id_customer = ? AND cr.code LIKE 'LOYAL-%'
     GROUP BY cr.id_cart_rule, cr.code, cr.reduction_amount, cr.date_to
     ORDER BY (MAX(ocr.id_order) IS NULL) DESC, cr.date_to DESC`,
    [session.customerId],
  )
  const vouchers: LoyaltyVoucher[] = voucherRows.map(v => {
    const used = Number(v.used_on_order) > 0
    const expired = Number(v.expired) === 1 && !used
    return {
      code: v.code,
      amount: Number(v.reduction_amount),
      dateTo: v.date_to,
      status: used ? 'used' : (expired ? 'expired' : 'active'),
      idOrder: Number(v.used_on_order),
    }
  })

  return {
    balance,
    totalEarned,
    totalSpent,
    config: { ratio, tierPoints, tierValue, tierMaxMultiplier, expireMonths, validityDays },
    tiers,
    transactions,
    vouchers,
  }
})
