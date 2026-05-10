/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function deleteExperiment(...args: any[]): Promise<any> { return undefined }
export async function experimentStats(...args: any[]): Promise<any> { return undefined }
export async function listExperiments(...args: any[]): Promise<any> { return undefined }
export async function upsertExperiment(...args: any[]): Promise<any> { return undefined }
