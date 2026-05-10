/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function enqueueCoverJob(...args: any[]): Promise<any> { return undefined }
export async function findExistingPendingProcessing(...args: any[]): Promise<any> { return undefined }
export async function getLatestStatusForCategory(...args: any[]): Promise<any> { return undefined }
