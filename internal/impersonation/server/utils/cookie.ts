/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function clearImpersonationCookie(...args: any[]): Promise<any> { return undefined }
export async function resolveImpersonatedCustomer(...args: any[]): Promise<any> { return undefined }
export async function setImpersonationCookie(...args: any[]): Promise<any> { return undefined }
