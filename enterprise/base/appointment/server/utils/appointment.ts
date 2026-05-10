/**
 * Build resolution stub for AGPL distribution.
 * No-op exports — runtime code paths are gated by feature flags.
 */

export async function bookSlot(...args: any[]): Promise<any> { return undefined }
export async function createAvailability(...args: any[]): Promise<any> { return undefined }
export async function deleteAvailability(...args: any[]): Promise<any> { return undefined }
export async function getAppointmentById(...args: any[]): Promise<any> { return undefined }
export async function listAdminAppointments(...args: any[]): Promise<any> { return undefined }
export async function listAdminAvailability(...args: any[]): Promise<any> { return undefined }
export async function listOpenSlots(...args: any[]): Promise<any> { return undefined }
export async function updateAppointmentStatus(...args: any[]): Promise<any> { return undefined }
