

import {
  bankTransactionTotals,
  listActiveBankAccounts,
  listBankTransactions,
} from '~/enterprise/banking/bank/server/utils/bank'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const periodDays = [30, 90, 365].includes(Number(q.period)) ? Number(q.period) : 90
  const status = ['all', 'unreconciled', 'reconciled'].includes(q.status)
    ? (q.status as 'all' | 'unreconciled' | 'reconciled')
    : 'all'
  const accountId = q.accountId ? Number(q.accountId) : null

  const filter = { periodDays, status, accountId }

  try {
    const [rows, totals, accounts] = await Promise.all([
      listBankTransactions(filter, { event }),
      bankTransactionTotals(filter, { event }),
      listActiveBankAccounts({ event }),
    ])

    return {
      period: periodDays,
      status,
      accountId,
      totals: {
        ...totals,
        net: totals.credits + totals.debits,
      },
      accounts,
      rows,
    }
  } catch (err: any) {
    console.error('[bo/finance/bank] DB error:', err?.message)
    return {
      period: periodDays,
      status,
      accountId,
      totals: { total: 0, credits: 0, debits: 0, net: 0, unreconciledCount: 0 },
      accounts: [],
      rows: [],
    }
  }
})
