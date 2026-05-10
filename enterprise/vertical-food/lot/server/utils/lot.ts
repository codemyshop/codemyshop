/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function ExpiryWindow(...args: any[]): Promise<any> { return undefined }
export async function createLot(...args: any[]): Promise<any> { return undefined }
export async function getLotById(...args: any[]): Promise<any> { return undefined }
export async function getLotsStats(...args: any[]): Promise<any> { return undefined }
export async function listLots(...args: any[]): Promise<any> { return undefined }
export async function listRecallCustomers(...args: any[]): Promise<any> { return undefined }
