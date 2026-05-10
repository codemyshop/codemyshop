/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function getCorbieAccountByPin(...args: any[]): Promise<any> { return undefined }
export async function getCorbieConfig(...args: any[]): Promise<any> { return undefined }
export async function insertCorbieSignal(...args: any[]): Promise<any> { return undefined }
export async function listCorbieMessages(...args: any[]): Promise<any> { return undefined }
export async function listCorbieSignals(...args: any[]): Promise<any> { return undefined }
export async function purgeOldCorbieSignals(...args: any[]): Promise<any> { return undefined }
export async function replaceCorbieHistory(...args: any[]): Promise<any> { return undefined }
export async function updateCorbieConfigSpaces(...args: any[]): Promise<any> { return undefined }
export async function upsertCorbieConfig(...args: any[]): Promise<any> { return undefined }
