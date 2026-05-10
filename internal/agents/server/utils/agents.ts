/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function getMaxActivityId(...args: any[]): Promise<any> { return undefined }
export async function listActivitySince(...args: any[]): Promise<any> { return undefined }
export async function listAgentsForReactor(...args: any[]): Promise<any> { return undefined }
export async function listAgentsSitemap(...args: any[]): Promise<any> { return undefined }
export async function listHeartbeats(...args: any[]): Promise<any> { return undefined }
export async function listRecentActivity(...args: any[]): Promise<any> { return undefined }
