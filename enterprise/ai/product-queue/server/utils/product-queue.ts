/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function countQueueAhead(...args: any[]): Promise<any> { return undefined }
export async function enqueueRedactionJob(...args: any[]): Promise<any> { return undefined }
export async function findExistingPendingProcessing(...args: any[]): Promise<any> { return undefined }
export async function getLatestStatusForProduct(...args: any[]): Promise<any> { return undefined }
