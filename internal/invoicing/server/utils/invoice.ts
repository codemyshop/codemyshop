/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function InvoiceFilters(...args: any[]): Promise<any> { return undefined }
export async function InvoiceStatus(...args: any[]): Promise<any> { return undefined }
export async function listInvoicesWithClient(...args: any[]): Promise<any> { return undefined }
