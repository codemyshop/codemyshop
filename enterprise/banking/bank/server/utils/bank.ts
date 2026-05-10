/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function bankTransactionTotals(...args: any[]): Promise<any> { return undefined }
export async function listActiveBankAccounts(...args: any[]): Promise<any> { return undefined }
export async function listBankTransactions(...args: any[]): Promise<any> { return undefined }
export async function updateBankTransaction(...args: any[]): Promise<any> { return undefined }
