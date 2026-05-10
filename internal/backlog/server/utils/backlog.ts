/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function BacklogUpdateSet(...args: any[]): Promise<any> { return undefined }
export async function createBacklogItem(...args: any[]): Promise<any> { return undefined }
export async function deleteBacklogItem(...args: any[]): Promise<any> { return undefined }
export async function listBacklogItems(...args: any[]): Promise<any> { return undefined }
export async function updateBacklogItem(...args: any[]): Promise<any> { return undefined }
