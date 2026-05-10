/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function createAeClient(...args: any[]): Promise<any> { return undefined }
export async function deleteAeClient(...args: any[]): Promise<any> { return undefined }
export async function getAeSaturation(...args: any[]): Promise<any> { return undefined }
export async function getUrssafYearSummary(...args: any[]): Promise<any> { return undefined }
export async function listAeClients(...args: any[]): Promise<any> { return undefined }
export async function updateAeClient(...args: any[]): Promise<any> { return undefined }
