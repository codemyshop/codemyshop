/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function createExpiryRule(...args: any[]): Promise<any> { return undefined }
export async function deleteExpiryRule(...args: any[]): Promise<any> { return undefined }
export async function listActiveExpiryRules(...args: any[]): Promise<any> { return undefined }
export async function listExpiringLots(...args: any[]): Promise<any> { return undefined }
export async function updateExpiryRule(...args: any[]): Promise<any> { return undefined }
