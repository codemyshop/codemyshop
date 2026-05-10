/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function createGroup(...args: any[]): Promise<any> { return undefined }
export async function deleteGroup(...args: any[]): Promise<any> { return undefined }
export async function deleteTier(...args: any[]): Promise<any> { return undefined }
export async function listContracts(...args: any[]): Promise<any> { return undefined }
export async function listGroups(...args: any[]): Promise<any> { return undefined }
export async function listTiers(...args: any[]): Promise<any> { return undefined }
export async function resolveCustomerPrice(...args: any[]): Promise<any> { return undefined }
export async function resolvePrice(...args: any[]): Promise<any> { return undefined }
export async function updateGroup(...args: any[]): Promise<any> { return undefined }
export async function updateTier(...args: any[]): Promise<any> { return undefined }
export async function upsertTier(...args: any[]): Promise<any> { return undefined }
