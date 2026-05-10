/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function CloseReason(...args: any[]): Promise<any> { return undefined }
export async function ImpersonationStatus(...args: any[]): Promise<any> { return undefined }
export async function attachActionToSession(...args: any[]): Promise<any> { return undefined }
export async function getActiveSession(...args: any[]): Promise<any> { return undefined }
export async function listSessions(...args: any[]): Promise<any> { return undefined }
export async function startSession(...args: any[]): Promise<any> { return undefined }
export async function stopSession(...args: any[]): Promise<any> { return undefined }
