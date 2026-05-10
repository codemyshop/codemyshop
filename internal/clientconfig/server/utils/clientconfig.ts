/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function clientConfigExists(...args: any[]): Promise<any> { return undefined }
export async function getClientConfigJson(...args: any[]): Promise<any> { return undefined }
export async function upsertClientConfigJson(...args: any[]): Promise<any> { return undefined }
