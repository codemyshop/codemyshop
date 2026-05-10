/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function countAiTelemetryEntries(...args: any[]): Promise<any> { return undefined }
export async function countAutomates(...args: any[]): Promise<any> { return undefined }
export async function insertAiTelemetry(...args: any[]): Promise<any> { return undefined }
export async function listRecurringForCron(...args: any[]): Promise<any> { return undefined }
export async function tableExists(...args: any[]): Promise<any> { return undefined }
